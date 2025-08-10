import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Types
type Color = "red" | "green" | "blue" | "yellow" | "wild";
type NumberValue = 0|1|2|3|4|5|6|7|8|9;
type ActionValue = "skip" | "reverse" | "draw2" | "wild" | "wild4";

interface CardT { id: string; color: Color; value: NumberValue | ActionValue; }

// Utils
const colors: Color[] = ["red","green","blue","yellow"];
const uid = () => Math.random().toString(36).slice(2);

function buildDeck(): CardT[] {
  const deck: CardT[] = [];
  // For each color: one 0, two of 1-9, two of each action (skip, reverse, draw2)
  colors.forEach((c) => {
    deck.push({ id: uid(), color: c, value: 0 });
    for (let n = 1 as NumberValue; n <= 9; n = (n + 1) as NumberValue) {
      deck.push({ id: uid(), color: c, value: n });
      deck.push({ id: uid(), color: c, value: n });
    }
    // Two of each action per color
    deck.push({ id: uid(), color: c, value: "skip" });
    deck.push({ id: uid(), color: c, value: "skip" });
    deck.push({ id: uid(), color: c, value: "reverse" });
    deck.push({ id: uid(), color: c, value: "reverse" });
    deck.push({ id: uid(), color: c, value: "draw2" });
    deck.push({ id: uid(), color: c, value: "draw2" });
  });
  // Wilds: 4 Wild, 4 Wild Draw Four
  for (let i = 0; i < 4; i++) deck.push({ id: uid(), color: "wild", value: "wild" });
  for (let i = 0; i < 4; i++) deck.push({ id: uid(), color: "wild", value: "wild4" });
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlay(card: CardT, top: CardT, currentColor: Color): boolean {
  if (card.color === "wild") return true;
  if (card.color === currentColor) return true;
  if (typeof card.value === "number" && typeof top.value === "number" && card.value === top.value) return true;
  if (card.value === top.value) return true;
  return false;
}

const useQuery = () => new URLSearchParams(useLocation().search);

const GameBot: React.FC = () => {
  const q = useQuery();
  const navigate = useNavigate();
  const { user } = useAuth();

  const stake = parseFloat(q.get("stake") || "0.01"); // in SOL
  const usd = q.get("usd") || "1";
  const rake = useMemo(() => 0.1 * stake, [stake]); // 5% of 2S pot = 0.1*S

  const [deck, setDeck] = useState<CardT[]>([]);
  const [discard, setDiscard] = useState<CardT[]>([]);
  const [pHand, setPHand] = useState<CardT[]>([]);
  const [bHand, setBHand] = useState<CardT[]>([]);
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [currentColor, setCurrentColor] = useState<Color>("red");
  const [isDone, setIsDone] = useState<null | "player" | "bot">(null);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    // Init game (test mode supported, no auth required)
    const d = buildDeck();
    const start: CardT[] = [];
    while (d.length && d[0].color === "wild") d.push(d.shift()!); // avoid wild first card
    const first = d.shift()!;
    start.push(first);
    const ph = d.splice(0, 7);
    const bh = d.splice(0, 7);

    setDeck(d);
    setDiscard(start);
    setPHand(ph);
    setBHand(bh);
    setCurrentColor(first.color === "wild" ? colors[Math.floor(Math.random()*4)] : first.color);
    setTurn("player");
  }, []);

  const drawCard = useCallback((count: number, hand: CardT[], setHand: (h: CardT[]) => void) => {
    setDeck((d) => {
      let pool = [...d];
      if (pool.length < count) {
        // reshuffle discard minus top
        setDiscard((dd) => {
          const top = dd[dd.length - 1];
          const rest = shuffle(dd.slice(0, -1));
          pool = [...pool, ...rest];
          setDeck(pool);
          return [top];
        });
      }
      const drawn = pool.splice(0, count);
      setHand([...hand, ...drawn]);
      return pool;
    });
  }, []);

  const topCard = discard[discard.length - 1];

  const playCard = (card: CardT, by: "player" | "bot") => {
    const colorToSet: Color = card.color === "wild" ? colors[Math.floor(Math.random()*4)] : card.color;
    setDiscard((d) => [...d, card]);
    if (by === "player") setPHand((h) => h.filter((c) => c.id !== card.id));
    else setBHand((h) => h.filter((c) => c.id !== card.id));
    setCurrentColor(colorToSet);

    // Handle actions
    if (card.value === "skip" || card.value === "reverse") {
      setTurn(by); // in 2-player, skip/reverse means play again
    } else if (card.value === "draw2") {
      if (by === "player") drawCard(2, bHand, setBHand);
      else drawCard(2, pHand, setPHand);
      setTurn(by);
    } else if (card.value === "wild4") {
      if (by === "player") drawCard(4, bHand, setBHand);
      else drawCard(4, pHand, setPHand);
      setTurn(by);
    } else {
      setTurn(by === "player" ? "bot" : "player");
    }
  };

  const botAct = useCallback(() => {
    if (isDone || turn !== "bot") return;
    const playable = bHand.find((c) => topCard && canPlay(c, topCard, currentColor));
    if (playable) {
      playCard(playable, "bot");
    } else {
      drawCard(1, bHand, setBHand);
      // try play drawn card next tick
      setTimeout(() => {
        const last = bHand[bHand.length - 1];
        if (last && topCard && canPlay(last, topCard, currentColor)) {
          playCard(last, "bot");
        } else {
          setTurn("player");
        }
      }, 300);
    }
  }, [bHand, currentColor, drawCard, isDone, topCard, turn]);

  useEffect(() => {
    if (discard.length === 0) return; // wait until game initialized
    if (pHand.length === 0) setIsDone("player");
    if (bHand.length === 0) setIsDone("bot");
  }, [pHand.length, bHand.length, discard.length]);

  useEffect(() => {
    if (turn === "bot" && !isDone) {
      const t = setTimeout(botAct, 600);
      return () => clearTimeout(t);
    }
  }, [turn, botAct, isDone]);

  const settle = async (winner: "player" | "bot") => {
    if (!user) {
      toast("Test mode: no balance changes");
      navigate("/");
      return;
    }
    setIsSettling(true);
    const { data: bal } = await supabase.from("balances").select("available, locked").maybeSingle();
    const available = parseFloat(String(bal?.available ?? 0));
    const locked = parseFloat(String(bal?.locked ?? 0));

    if (winner === "player") {
      const payout = 2 * stake - rake; // 1.9S
      const { error } = await supabase
        .from("balances")
        .update({ available: available + payout, locked: Math.max(0, locked - stake) })
        .eq("user_id", user.id);
      if (error) toast.error("Failed to settle win"); else toast.success(`You won! +${(2*stake - rake).toFixed(4)} SOL (5% house edge)`);
    } else {
      const { error } = await supabase
        .from("balances")
        .update({ locked: Math.max(0, locked - stake) })
        .eq("user_id", user.id);
      if (error) toast.error("Failed to settle loss"); else toast("GG! You lost the stake.");
    }
    setIsSettling(false);
    navigate("/");
  };

  const playableByPlayer = (c: CardT) => topCard && canPlay(c, topCard, currentColor);

  const onDraw = () => {
    if (turn !== "player" || isDone) return;
    drawCard(1, pHand, setPHand);
    setTurn("bot");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>UNO vs Bot — Stake Match</title>
        <meta name="description" content="Play a minimal UNO match against a bot with SOL stakes and a fair 5% house edge." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>
      <section className="container mx-auto px-6 py-8">
        <Card className="bg-card/60 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>
              UNO vs Bot — Stake ${usd} (≈ {stake} SOL)
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <span className="inline-flex items-center gap-2">
                <span className={`${turn === 'player' ? 'bg-[hsl(var(--success,140_70%_40%))] pulse' : 'bg-muted-foreground/50'} w-2 h-2 rounded-full`} />
                {turn === 'player' ? 'Your turn' : "Bot's turn"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 place-items-center text-center">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Discard top:</div>
                {topCard && (
                  <div
                    key={topCard.id}
                    className={`w-20 h-28 rounded-xl border border-border/60 shadow-md flex items-center justify-center text-sm font-semibold select-none
                    animate-in slide-in-from-bottom-2 fade-in duration-300
                    ${
                      topCard.color === 'red' ? 'bg-[hsl(var(--destructive)/0.2)]' :
                      topCard.color === 'green' ? 'bg-[hsl(var(--success,140_70%_40%))/0.2]' :
                      topCard.color === 'blue' ? 'bg-[hsl(var(--primary)/0.2)]' :
                      topCard.color === 'yellow' ? 'bg-[hsl(var(--warning,48_95%_53%))/0.2]' :
                      'bg-muted'
                    }`}
                    aria-label={`Top card ${topCard.color} ${String(topCard.value)}`}
                  >
                    <span className="tracking-wide">{topCard.color.toUpperCase()} {String(topCard.value).toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Your hand ({pHand.length}): {pHand.length === 1 && <span className="ml-2 text-primary font-semibold">UNO!</span>}</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {pHand.map((c) => {
                    const playable = playableByPlayer(c) && turn === 'player' && !isDone;
                    return (
                      <button
                        key={c.id}
                        disabled={!playable}
                        onClick={() => playCard(c, 'player')}
                        className={`w-16 h-24 rounded-xl border border-border/60 shadow-sm flex items-center justify-center text-sm font-semibold select-none transition-transform
                        ${playable ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'}
                        ${
                          c.color === 'red' ? 'bg-[hsl(var(--destructive)/0.15)]' :
                          c.color === 'green' ? 'bg-[hsl(var(--success,140_70%_40%))/0.15]' :
                          c.color === 'blue' ? 'bg-[hsl(var(--primary)/0.15)]' :
                          c.color === 'yellow' ? 'bg-[hsl(var(--warning,48_95%_53%))/0.15]' : 'bg-muted'
                        }`}
                        aria-label={`${c.color} ${String(c.value)}`}
                      >
                        <span className="tracking-wide">{c.color.toUpperCase()} {String(c.value).toUpperCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Bot hand: {bHand.length} cards</div>
                <div className="flex gap-1 justify-center">
                  {Array.from({ length: bHand.length }).map((_, i) => (
                    <div key={i} className="w-6 h-8 bg-muted rounded-sm border border-border/60" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center gap-3">
            {!isDone ? (
              <>
                <Button variant="secondary" onClick={onDraw} disabled={turn !== 'player'}>
                  Draw
                </Button>
                <div className="text-sm text-muted-foreground">Turn: {turn}</div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  {isDone === 'player' ? 'You win!' : 'Bot wins!'}
                </div>
                <Button variant="neon" disabled={isSettling} onClick={() => settle(isDone!)}>
                  Settle match
                </Button>
                <Button variant="secondary" onClick={() => navigate('/')}>Back</Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </section>
    </main>
  );
};

export default GameBot;
