import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePhantom } from "@/hooks/usePhantom";
import { useSolPrice } from "@/hooks/useSolPrice";
import * as web3 from "@solana/web3.js";
interface DepositPanelProps { hideConnectWallet?: boolean }
const DepositPanel: React.FC<DepositPanelProps> = ({ hideConnectWallet }) => {
  const [amount, setAmount] = useState(0.5);
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

      const connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"), "confirmed");
      const fromPubkey = new web3.PublicKey(publicKey);
      const lamports = Math.round(amount * web3.LAMPORTS_PER_SOL);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
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

      const signed: any = await (provider as any).signAndSendTransaction(tx);
      const signature: string = signed?.signature || signed;

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      const { data, error } = await supabase.functions.invoke("deposit-sol-verify", {
        body: { signature },
      });
      if (error) throw error;

      const newBal = typeof (data as any)?.available === "number" ? (data as any).available : (balance ?? 0) + amount;
      if (typeof newBal === "number") setBalance(newBal);
      toast.success(`Deposited ${amount} SOL`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Deposit failed");
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
        <CardTitle>Deposit SOL (Mainnet via Phantom)</CardTitle>
        <CardDescription>Connect Phantom and send SOL to our treasury. Instant credit on confirmation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Balance</span>
          <span className="text-sm text-muted-foreground">
            {balance !== null ? `${balance.toFixed(4)} SOL` : (user ? "Loading..." : "Sign in to view")}
          </span>
        </div>
        <div>
          <label htmlFor="sol-amount" className="text-sm text-muted-foreground">Amount</label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="sol-amount"
              type="number"
              min={0}
              step={0.1}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value || "0"))}
            />
            <span className="text-sm text-muted-foreground">SOL</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Mainnet only. Your balance updates after on‑chain confirmation.</p>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        {!hideConnectWallet && (
          <Button variant="game" className="w-full sm:w-auto" onClick={onConnect}>Connect Wallet</Button>
        )}
        <div className="flex w-full sm:w-auto gap-2">
            <Button variant="game" className="w-full sm:w-auto" onClick={onDeposit}>Deposit</Button>
          <Button variant="game" className="w-full sm:w-auto" onClick={onWithdraw}>Withdraw</Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DepositPanel;
