import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", handler);
    return () => window.removeEventListener("pointermove", handler);
  }, []);

  const canonical = typeof window !== "undefined" ? window.location.href : "";

  return (
    <main className="min-h-screen bg-background text-foreground bg-grid spotlight">
      <Helmet>
        <title>UNO Cash — Skill-Based Crypto Wagering</title>
        <meta name="description" content="Head-to-head UNO with SOL wagers. Join skill‑based matches and win the pot." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <header className="container mx-auto flex items-center justify-between py-6">
        <div className="font-black tracking-tight text-2xl md:text-3xl bg-clip-text text-transparent bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.6)]">
          UNOCASH
        </div>
        <div className="flex items-center gap-3">
          <Button variant="neon" onClick={() => navigate('/lobby')}>Browse Lobbies</Button>
          <Button variant="hero" size="lg" onClick={() => navigate('/signup')}>Sign Up</Button>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-10 pb-20 md:pt-24 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            Skill‑Based UNO. Winner takes the <span className="text-primary">wager</span>.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Queue into 1v1 UNO matches, stake SOL, and outplay your opponent.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="hero" size="xl" onClick={() => navigate('/signup')}>Play Now</Button>
            <Button variant="neon" size="lg" onClick={() => navigate('/lobby')}>View Lobbies</Button>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/60 backdrop-blur border-border">
            <CardContent className="p-6">
              <h3 className="font-semibold text-xl">Instant Matchmaking</h3>
              <p className="mt-2 text-muted-foreground">Jump into a fair 1v1 with anti-cheat protections and low latency.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur border-border">
            <CardContent className="p-6">
              <h3 className="font-semibold text-xl">SOL Wagers</h3>
              <p className="mt-2 text-muted-foreground">Stake SOL and the winner automatically claims the pot.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur border-border">
            <CardContent className="p-6">
              <h3 className="font-semibold text-xl">Built for Skill</h3>
              <p className="mt-2 text-muted-foreground">Climb leaderboards and prove your UNO mastery.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default Index;
