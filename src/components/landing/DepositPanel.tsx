import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface DepositPanelProps { hideConnectWallet?: boolean }
const DepositPanel: React.FC<DepositPanelProps> = ({ hideConnectWallet }) => {
  const [amount, setAmount] = useState(0.5);
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

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

  const onConnect = () => {
    toast.info("Wallet connection coming soon");
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
      const { data, error } = await supabase.functions.invoke("devnet-credit-sol", {
        body: { amount },
      });
      if (error) throw error;
      const newBal = typeof data?.available === "number" ? data.available : (balance ?? 0) + amount;
      setBalance(newBal);
      toast.success(`Credited ${amount} SOL on devnet`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Deposit failed");
    }
  };

  return (
    <Card className="bg-card/60 backdrop-blur border-border h-full">
      <CardHeader>
        <CardTitle>Deposit SOL (Devnet)</CardTitle>
        <CardDescription>Manage your balance to join wagers.</CardDescription>
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
          <p className="mt-1 text-xs text-muted-foreground">Devnet only. Instantly credits your test balance.</p>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        {!hideConnectWallet && (
          <Button variant="game" className="w-full sm:w-auto" onClick={onConnect}>Connect Wallet</Button>
        )}
        <Button variant="game" className="w-full sm:w-auto" onClick={onDeposit}>Deposit (devnet)</Button>
      </CardFooter>
    </Card>
  );
};

export default DepositPanel;
