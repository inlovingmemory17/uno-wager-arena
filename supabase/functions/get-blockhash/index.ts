import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";

    const payload = {
      jsonrpc: "2.0",
      id: "get-bh",
      method: "getLatestBlockhash",
      params: [{ commitment: "confirmed" }],
    };

    const resp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `RPC error ${resp.status}: ${text}` }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const json = await resp.json();
    if (json?.error) {
      return new Response(JSON.stringify({ error: json.error }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const blockhash = json?.result?.value?.blockhash ?? json?.result?.blockhash;
    const lastValidBlockHeight = json?.result?.value?.lastValidBlockHeight ?? json?.result?.lastValidBlockHeight;

    if (!blockhash) {
      return new Response(JSON.stringify({ error: "Missing blockhash from RPC" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ blockhash, lastValidBlockHeight }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
