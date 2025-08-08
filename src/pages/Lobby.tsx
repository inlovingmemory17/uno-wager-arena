import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";

const presets = [1, 5, 20];

const Lobby = () => {
  const [wager, setWager] = useState<number | "">(5);
  const canonical = typeof window !== "undefined" ? window.location.href : "";

  const formatted = useMemo(() => (wager === "" ? "" : wager.toString()), [wager]);

  const join = () => {
    toast({ title: "Finding opponent…", description: "Matchmaking into a 1v1 UNO game." });
  };

  return (
    <main className="min-h-screen bg-background bg-grid spotlight">
      <Helmet>
        <title>UNOCASH Lobby — Create or Join a Match</title>
        <meta name="description" content="Enter your wager and join a head‑to‑head UNO match. Winner takes the pot." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <section className="container mx-auto px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="p-6 space-y-6">
              <h1 className="text-2xl font-bold">Create a Match</h1>
              <div className="flex items-center gap-3">
                <Input
                  inputMode="numeric"
                  value={formatted}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "");
                    setWager(v === "" ? "" : Number(v));
                  }}
                  placeholder="Wager in SOL"
                />
                <Button variant="hero" onClick={join}>Join Game</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {presets.map((p) => (
                  <Button key={p} variant="neon" onClick={() => setWager(p)}>{`$${p}`}</Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">This is a demo UI. Crypto deposits and real match logic will be added.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg">Wallet</h2>
              <div className="mt-3 text-3xl font-extrabold text-primary">$0.00</div>
              <p className="text-xs text-muted-foreground">0.0000 SOL</p>
              <div className="mt-6 flex gap-3">
                <Button variant="neon">Add Funds</Button>
                <Button variant="neon">Cash Out</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default Lobby;
