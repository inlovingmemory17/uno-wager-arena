import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bs58 from "https://esm.sh/bs58@5.0.0";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "https://esm.sh/@solana/web3.js@1.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getSolPriceUSD(): Promise<number> {
  try {
    const r = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=SOL", { cache: "no-store" });
    if (!r.ok) throw new Error("coinbase failed");
    const j = await r.json();
    const rate = parseFloat(j?.data?.rates?.USD ?? "");
    if (!Number.isFinite(rate)) throw new Error("bad rate");
    return rate;
  } catch (_) {
    const r = await fetch("https://api.coinpaprika.com/v1/tickers/sol-solana", { cache: "no-store" });
    if (!r.ok) throw new Error("paprika failed");
    const j = await r.json();
    const usdVal = j?.quotes?.USD?.price ?? j?.price_usd;
    const rate = typeof usdVal === "number" ? usdVal : parseFloat(String(usdVal ?? ""));
    if (!Number.isFinite(rate)) throw new Error("bad rate");
    return rate;
  }
}

function parseTreasuryKeypair(secret: string | undefined): Keypair {
  if (!secret) throw new Error("Treasury private key missing");
  try {
    if (secret.trim().startsWith("[")) {
      const arr = new Uint8Array(JSON.parse(secret));
      return Keypair.fromSecretKey(arr);
    }
    const bytes = bs58.decode(secret.trim());
    return Keypair.fromSecretKey(bytes);
  } catch (e) {
    throw new Error("Invalid treasury private key format");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amountSol, destination } = await req.json();

    if (!amountSol || typeof amountSol !== "number" || amountSol <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!destination || typeof destination !== "string") {
      return new Response(JSON.stringify({ error: "Destination required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Supabase client with RLS via caller's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase env not set");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userRes.user.id;

    // Fetch balance
    const { data: balRow, error: balErr } = await supabase
      .from("balances")
      .select("available")
      .eq("user_id", userId)
      .maybeSingle();
    if (balErr) throw balErr;
    const available = parseFloat(String(balRow?.available ?? 0));

    // Enforce $2 minimum to be eligible to withdraw
    const priceUSD = await getSolPriceUSD();
    const availableUSD = available * priceUSD;
    if (!Number.isFinite(availableUSD) || availableUSD < 2) {
      return new Response(JSON.stringify({ error: "Minimum $2 of SOL required to withdraw" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Simple fee buffer (covers network + small priority)
    const WITHDRAW_FEE_SOL = 0.00001; // ~10k lamports
    const totalDeduct = amountSol + WITHDRAW_FEE_SOL;
    if (totalDeduct > available) {
      return new Response(JSON.stringify({ error: "Insufficient balance to cover amount + fee" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prepare transfer
    let destPubkey: PublicKey;
    try {
      destPubkey = new PublicKey(destination);
    } catch (_) {
      return new Response(JSON.stringify({ error: "Invalid Solana address" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, { commitment: "confirmed" });

    const treasury = parseTreasuryKeypair(Deno.env.get("APP_TREASURY_PRIVATE_KEY"));

    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const ix = SystemProgram.transfer({ fromPubkey: treasury.publicKey, toPubkey: destPubkey, lamports });
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "confirmed" });

    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: treasury.publicKey }).add(ix);
    tx.sign(treasury);

    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

    // Update balance (deduct amount + fee)
    const newAvailable = available - totalDeduct;
    const { error: upErr } = await supabase
      .from("balances")
      .update({ available: newAvailable })
      .eq("user_id", userId);
    if (upErr) throw upErr;

    return new Response(
      JSON.stringify({ signature: sig, available: newAvailable, feeAppliedSol: WITHDRAW_FEE_SOL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("withdraw-sol error", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
