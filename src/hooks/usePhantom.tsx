import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    solana?: any;
    phantom?: any;
  }
}

export function usePhantom() {
  const [provider, setProvider] = useState<any>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const prov = (window as any)?.solana?.isPhantom
      ? (window as any).solana
      : (window as any)?.phantom?.solana;
    if (prov) setProvider(prov);

    prov?.on?.("connect", (arg: any) => {
      const key = arg?.publicKey?.toBase58?.() ?? arg?.toBase58?.() ?? String(arg);
      setPublicKey(key);
      setConnected(true);
    });
    prov?.on?.("disconnect", () => {
      setConnected(false);
      setPublicKey(null);
    });

    // Attempt silent connect if already trusted
    prov?.connect?.({ onlyIfTrusted: true }).catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    const prov = provider ?? ((window as any)?.solana?.isPhantom ? (window as any).solana : (window as any)?.phantom?.solana);
    if (!prov) return false;
    const res = await prov.connect();
    const key = res?.publicKey?.toBase58?.() ?? res?.publicKey?.toString?.() ?? String(res?.publicKey ?? "");
    setPublicKey(key);
    setConnected(true);
    setProvider(prov);
    return true;
  }, [provider]);

  const disconnect = useCallback(async () => {
    try { await provider?.disconnect?.(); } catch {}
    setConnected(false);
    setPublicKey(null);
  }, [provider]);

  return { provider, connected, publicKey, connect, disconnect } as const;
}
