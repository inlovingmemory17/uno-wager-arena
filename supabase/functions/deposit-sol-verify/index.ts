import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "https://esm.sh/@solana/web3.js@1.93.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const RPC_URL = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
    const TREASURY_PK = Deno.env.get("APP_TREASURY_PUBLIC_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase env configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!TREASURY_PK) {
      return new Response(JSON.stringify({ error: "Missing APP_TREASURY_PUBLIC_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const signature: string | undefined = body?.signature;
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const connection = new Connection(RPC_URL, { commitment: "confirmed" });
    const treasury = new PublicKey(TREASURY_PK);

    const parsed = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    } as any);

    if (!parsed) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.meta?.err) {
      return new Response(JSON.stringify({ error: "Transaction failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sum all SOL transfers to the treasury address
    const collectLamports = () => {
      let total = 0;
      const addFromIx = (ix: any) => {
        try {
          if (ix?.parsed?.type === "transfer") {
            const info = ix.parsed.info;
            if (info?.destination === treasury.toBase58()) {
              total += Number(info?.lamports ?? 0);
            }
          }
        } catch (_) {}
      };
      (parsed.transaction as any)?.message?.instructions?.forEach(addFromIx);
      parsed.meta?.innerInstructions?.forEach((inner: any) => {
        inner?.instructions?.forEach(addFromIx);
      });
      return total;
    };

    const lamportsToTreasury = collectLamports();
    if (!Number.isFinite(lamportsToTreasury) || lamportsToTreasury <= 0) {
      return new Response(JSON.stringify({ error: "No transfer to treasury found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountSol = lamportsToTreasury / LAMPORTS_PER_SOL;

    // Update user's available balance
    const { data: balRow, error: balErr } = await supabase
      .from("balances")
      .select("available")
      .eq("user_id", userId)
      .maybeSingle();

    if (balErr) {
      console.error("Failed to fetch balance", balErr);
      return new Response(JSON.stringify({ error: "Failed to fetch balance" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentAvailable = Number(balRow?.available ?? 0);
    const newAvailable = currentAvailable + amountSol;

    const { error: updErr } = await supabase
      .from("balances")
      .update({ available: newAvailable })
      .eq("user_id", userId);

    if (updErr) {
      console.error("Failed to update balance", updErr);
      return new Response(JSON.stringify({ error: "Failed to update balance" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, available: newAvailable, amountSol, signature }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("deposit-sol-verify error", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
