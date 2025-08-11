import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePrivy, useFundWallet } from "@privy-io/react-auth";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onBalanceRefresh?: (newBalance: number) => void;
}

const PrivyDepositButton: React.FC<Props> = ({ onBalanceRefresh }) => {
  const { authenticated, login } = usePrivy();
  const { fundWallet } = useFundWallet();

  const handleClick = async () => {
    try {
      if (!authenticated) {
        await login();
      }
      // Open Privy funding flow; types vary across versions, cast for compatibility
      await (fundWallet as unknown as (arg?: any) => Promise<void>)({ chain: 'solana' });
      toast.info("Privy deposit opened. Complete the flow and return here.");

      // Attempt a balance refresh shortly after
      setTimeout(async () => {
        const { data } = await supabase
          .from('balances')
          .select('available')
          .maybeSingle();
        const newBal = parseFloat(String(data?.available ?? 0));
        if (Number.isFinite(newBal)) onBalanceRefresh?.(newBal);
      }, 4000);
    } catch (e: any) {
      console.error("Privy deposit error", e);
      toast.error(e?.message ?? "Unable to open Privy deposit");
    }
  };

  return (
    <Button variant="game" className="w-full sm:w-auto" onClick={handleClick}>
      Deposit with Privy
    </Button>
  );
};

export default PrivyDepositButton;
