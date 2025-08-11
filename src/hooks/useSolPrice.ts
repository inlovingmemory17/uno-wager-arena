import { useQuery } from "@tanstack/react-query";

async function getFromCoinbase(): Promise<number> {
  const res = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=SOL", { cache: "no-store" });
  if (!res.ok) throw new Error("Coinbase failed");
  const json = await res.json();
  const usdStr = json?.data?.rates?.USD as string | undefined;
  const usd = usdStr ? parseFloat(usdStr) : NaN;
  if (!usd || Number.isNaN(usd)) throw new Error("No USD rate");
  return usd;
}

async function getFromPaprika(): Promise<number> {
  const res = await fetch("https://api.coinpaprika.com/v1/tickers/sol-solana", { cache: "no-store" });
  if (!res.ok) throw new Error("Paprika failed");
  const json = await res.json();
  const usdVal = (json?.quotes?.USD?.price ?? json?.price_usd) as number | string | undefined;
  const usd = typeof usdVal === "number" ? usdVal : usdVal ? parseFloat(String(usdVal)) : NaN;
  if (!usd || Number.isNaN(usd)) throw new Error("No USD price");
  return usd;
}

async function fetchSolPriceUSD(): Promise<{ usd: number }> {
  try {
    const usd = await getFromCoinbase();
    return { usd };
  } catch (_) {
    const usd = await getFromPaprika();
    return { usd };
  }
}

export function useSolPrice(refreshMs = 30000) {
  const query = useQuery({
    queryKey: ["sol-price-usd"],
    queryFn: fetchSolPriceUSD,
    refetchInterval: refreshMs,
    staleTime: refreshMs,
  });

  return {
    priceUSD: query.data?.usd ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  } as const;
}
