import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";
import { useFundWallet, useSolanaWallets } from "@privy-io/react-auth/solana";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onBalanceRefresh?: (newBalance: number) => void;
}

const PrivyDepositButton: React.FC<Props> = ({ onBalanceRefresh }) => {
  const { authenticated, login } = usePrivy();
  const { fundWallet } = useFundWallet();
  const { wallets } = useSolanaWallets();

  const handleClick = async () => {
    try {
      if (!authenticated) {
        await login();
      }
      // Use Solana funding with explicit address + cluster to avoid chain-mapping issues
      const address = wallets?.[0]?.address;
      if (!address) {
        toast.error("No Solana wallet found. Enable Solana embedded wallet and relogin.");
        return;
      }
      // Support both signatures: fundWallet(address, opts) and fundWallet({ address, ...opts })
      try {
        await (fundWallet as unknown as (addr: string, opts?: any) => Promise<void>)(address, { cluster: { name: "devnet" } });
      } catch {
        await (fundWallet as unknown as (opts: any) => Promise<void>)({ address, cluster: { name: "devnet" } });
      }
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
