import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePhantom } from "@/hooks/usePhantom";
import { useSolPrice } from "@/hooks/useSolPrice";
import * as web3 from "@solana/web3.js";
interface DepositPanelProps { hideConnectWallet?: boolean }
const DepositPanel: React.FC<DepositPanelProps> = ({ hideConnectWallet }) => {
  const [amount, setAmount] = useState(0);
  const [devnet, setDevnet] = useState<boolean>(() => localStorage.getItem('useDevnet') === '1');
  useEffect(() => { localStorage.setItem('useDevnet', devnet ? '1' : '0'); }, [devnet]);
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const { priceUSD } = useSolPrice();
  const { connected, publicKey, connect, disconnect, provider } = usePhantom();
  useEffect(() => {
    if (!user) { setBalance(null); return; }
    (async () => {
      const { data, error } = await supabase
        .from('balances')
        .select('available')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error) setBalance(parseFloat(String(data?.available ?? 0)));
    })();
  }, [user]);

  const pickUSD = (usd: number) => {
    if (!priceUSD) return toast.error("Price unavailable");
    const sol = +(((usd * 1.1) / priceUSD).toFixed(6));
    setAmount(sol);
  };

  const onConnect = async () => {
    try {
      const ok = await connect();
      if (ok) toast.success("Phantom connected");
      else toast.error("Phantom not available");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to connect Phantom");
    }
  };

  const onDeposit = async () => {
    if (!user) {
      toast.error("Sign in to deposit");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      if (devnet) {
        const { data, error } = await supabase.functions.invoke("devnet-credit-sol", {
          body: { amountSol: amount },
        });
        if (error) throw error;
        if (typeof (data as any)?.available === "number") setBalance((data as any).available);
        return toast.success(`Devnet credit: ${amount} SOL`);
      }

      if (!connected) {
        const ok = await connect();
        if (!ok) return toast.error("Phantom not available");
      }
      if (!provider || !publicKey) return toast.error("Phantom not connected");

      // Fetch treasury public key from edge function
      const { data: treasuryData, error: treErr } = await supabase.functions.invoke("treasury-info");
      if (treErr) throw treErr;
      const treasuryStr = (treasuryData as any)?.treasuryPublicKey as string | undefined;
      if (!treasuryStr) throw new Error("Missing treasury public key");
      const treasury = new web3.PublicKey(treasuryStr);
 
      const { data: bhData, error: bhErr } = await supabase.functions.invoke("get-blockhash", { body: { network: devnet ? "devnet" : "mainnet" } });
      if (bhErr) throw bhErr;
      const blockhash: string | undefined = (bhData as any)?.blockhash;
      if (!blockhash) throw new Error("Failed to fetch blockhash");
      const fromPubkey = new web3.PublicKey(publicKey);
      const lamports = Math.round(amount * web3.LAMPORTS_PER_SOL);

      const tx = new web3.Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey,
      }).add(
        web3.SystemProgram.transfer({
          fromPubkey,
          toPubkey: treasury,
          lamports,
        })
      );

      // Sign + send via Phantom
      const signed: any = await (provider as any).signAndSendTransaction(tx);
      const signature: string | undefined = signed?.signature || (typeof signed === "string" ? signed : undefined);
      if (!signature) throw new Error("Transaction failed or was rejected");

      // Verify and credit
      const { data, error } = await supabase.functions.invoke("deposit-sol-verify", {
        body: { signature },
      });
      if (error) throw error;

      const newBal = typeof (data as any)?.available === "number" ? (data as any).available : (balance ?? 0) + amount;
      if (typeof newBal === "number") setBalance(newBal);
      toast.success(`Deposited ${amount} SOL`);
    } catch (err: any) {
      console.error(err);
      const raw = err?.message || err?.error?.message || String(err);
      const ctx = (err as any)?.context?.body || (err as any)?.details || '';
      const full = typeof ctx === 'string' && ctx.length ? `${raw} — ${ctx}` : raw;

      if (/insufficient|not enough|lamports/i.test(full)) {
        return toast.error("Not enough SOL to cover amount + network fee.");
      }
      if (/non-2xx|verify|signature|not confirmed|blockhash|forbidden|403/i.test(full)) {
        return toast.error("Transaction not confirmed. Top up SOL and try again.");
      }
      toast.error(full || "Deposit failed");
    }
  };

  const onWithdraw = async () => {
    try {
      if (!user) return toast.error("Sign in to withdraw");
      if (balance === null || balance <= 0) return toast.error("No balance to withdraw");

      // Frontend guard for $2 minimum (backend enforces too)
      if (priceUSD && balance * priceUSD < 2) {
        return toast.error("You need at least $2 of SOL to withdraw");
      }

      const destination = window.prompt("Enter your Solana address to receive withdrawal:");
      if (!destination) return;

      const defaultAmt = Math.max(0, balance - 0.00001);
      const amtStr = window.prompt("Amount of SOL to withdraw", defaultAmt.toFixed(6)) ?? "";
      const amountSol = parseFloat(amtStr);
      if (!Number.isFinite(amountSol) || amountSol <= 0) return toast.error("Invalid amount");

      const { data, error } = await supabase.functions.invoke("withdraw-sol", {
        body: { destination, amountSol },
      });
      if (error) throw error;

      if (typeof data?.available === "number") setBalance(data.available);
      toast.success(`Withdrawal sent! Tx: ${data?.signature ?? "submitted"}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Withdrawal failed");
    }
  };

  return (
    <Card className="bg-card/60 backdrop-blur border-border h-full">
      <CardHeader>
        <CardTitle>Deposit SOL ({devnet ? "Devnet (Test)" : "Mainnet via Phantom"})</CardTitle>
        <CardDescription>Connect Phantom and send SOL to our treasury, or use devnet test mode. Presets include a 10% fee.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch id="devnet" checked={devnet} onCheckedChange={setDevnet} />
            <Label htmlFor="devnet" className="text-xs">
              {devnet ? "Devnet test mode (no real SOL)" : "Mainnet"}
            </Label>
          </div>
          <span className="text-sm text-muted-foreground">
            {balance !== null ? `${balance.toFixed(4)} SOL` : (user ? "Loading..." : "Sign in to view")}
          </span>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Select deposit amount (10% fee included)</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button size="sm" variant="secondary" onClick={() => pickUSD(1)}>$1</Button>
            <Button size="sm" variant="secondary" onClick={() => pickUSD(5)}>$5</Button>
            <Button size="sm" variant="secondary" onClick={() => pickUSD(10)}>$10</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {priceUSD ? (
              amount > 0
                ? `Selected: ${amount.toFixed(6)} SOL (~$${(amount * priceUSD).toFixed(2)})`
                : "Choose a preset."
            ) : "Fetching price..."}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        {!hideConnectWallet && (
          <Button variant="game" className="w-full sm:w-auto" onClick={onConnect}>Connect Wallet</Button>
        )}
        <div className="flex w-full sm:w-auto gap-2">
            <Button variant="game" className="w-full sm:w-auto" onClick={onDeposit} disabled={amount <= 0 || !priceUSD}>Deposit</Button>
          <Button variant="game" className="w-full sm:w-auto" onClick={onWithdraw}>Withdraw</Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DepositPanel;
