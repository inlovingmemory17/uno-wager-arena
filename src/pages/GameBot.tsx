import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import UnoCard from "@/components/game/UnoCard";

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
  const matchId = q.get("matchId") || q.get("match_id") || q.get("id") || undefined;

  const [deck, setDeck] = useState<CardT[]>([]);
  const [discard, setDiscard] = useState<CardT[]>([]);
  const [pHand, setPHand] = useState<CardT[]>([]);
  const [bHand, setBHand] = useState<CardT[]>([]);
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [currentColor, setCurrentColor] = useState<Color>("red");
  const [isDone, setIsDone] = useState<null | "player" | "bot">(null);
  const [isSettling, setIsSettling] = useState(false);
  const [wildChoice, setWildChoice] = useState<CardT | null>(null);

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

  const playCard = (card: CardT, by: "player" | "bot", forcedColor?: Color) => {
    const colorToSet: Color =
      card.color === "wild" ? (forcedColor ?? colors[Math.floor(Math.random() * 4)]) : card.color;
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
      const payout = 2 * stake; // No house edge on player wins
      const { error } = await supabase
        .from("balances")
        .update({ available: available + payout, locked: Math.max(0, locked - stake) })
        .eq("user_id", user.id);
      if (error) toast.error("Failed to settle win"); else toast.success(`You won! +${(payout).toFixed(4)} SOL`);
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

  const mustDraw = useMemo(
    () => turn === 'player' && !isDone && !pHand.some((c) => playableByPlayer(c)),
    [turn, isDone, pHand, topCard, currentColor]
  );

  const onDraw = () => {
    if (turn !== "player" || isDone) return;
    drawCard(1, pHand, setPHand);
    setTurn("bot");
  };
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>UNO vs Bot — Stake Match</title>
        <meta name="description" content="Play an authentic UNO match against a bot with SOL stakes. Smooth animations and instant settlement." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>
      <section className="container mx-auto px-6 py-8">
        <Card className="bg-card/60 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>
              UNO vs Bot — Stake ${usd} (≈ {stake} SOL)
            </CardTitle>
            {matchId && (
              <div className="text-xs text-muted-foreground">Match ID: <code className="font-mono">{matchId}</code></div>
            )}
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
                <div className="text-sm text-muted-foreground mb-2">Bot hand: {bHand.length} cards</div>
                <div className="flex gap-1 justify-center">
                  {Array.from({ length: bHand.length }).map((_, i) => (
                    <div key={i} className="w-6 h-8 bg-muted rounded-sm border border-border/60" />
                  ))}
                </div>
              </div>

              <div className="relative w-full">
                {/* Center: keep discard pile perfectly centered */}
                <div className="w-fit mx-auto text-center">
                  <div className="text-sm text-muted-foreground mb-2">Discard top:</div>
                  {topCard && (
                    <div key={topCard.id} className="animate-fade-in">
                      <UnoCard color={topCard.color as any} value={topCard.value as any} size="md" disabled />
                    </div>
                  )}
                </div>

                {/* Right pinned: Draw pile using our UNO back style */}
                <div className="absolute right-0 top-0 text-center" aria-label="Draw pile">
                  <div className="relative w-20 h-28 select-none">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute inset-0"
                        style={{ transform: `translate(${i}px, ${-i}px) rotate(${i * 0.8}deg)` }}
                      >
                        <div className="absolute inset-0 rounded-[0.9rem] shadow-[0_10px_20px_hsl(var(--uno-black)/0.25)]">
                          <div className="absolute inset-0 rounded-[0.9rem] bg-[hsl(var(--uno-black))]" />
                          <div className="absolute inset-1 rounded-[0.8rem] bg-[hsl(var(--uno-white))]" />
                          <div className="absolute inset-2 rounded-[0.7rem] bg-[hsl(var(--uno-black))]" />
                          {/* Curved diamond frame */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140" aria-hidden>
                            <g transform="translate(50,70) rotate(-18) translate(-50,-70)">
                              <rect x="8" y="12" width="84" height="116" rx="38" ry="38" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="6" />
                              <rect x="14" y="18" width="72" height="104" rx="34" ry="34" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="4" />
                            </g>
                          </svg>
                          {/* Center four-color wheel */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className="w-10 h-10 rounded-full ring-2 ring-white/90"
                              style={{
                                background:
                                  "conic-gradient(hsl(var(--uno-red)) 0 90deg, hsl(var(--uno-yellow)) 90deg 180deg, hsl(var(--uno-green)) 180deg 270deg, hsl(var(--uno-blue)) 270deg 360deg)",
                              }}
                            />
                          </div>
                          {/* Gloss highlight */}
                          <div
                            className="absolute inset-0 rounded-[0.9rem] pointer-events-none"
                            style={{
                              background:
                                "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.1) 28%, rgba(255,255,255,0) 55%)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`relative ${mustDraw ? 'triangle-glow' : ''}`}>
                        <Button
                          variant="hero"
                          size="lg"
                          className={`relative z-10 ${mustDraw ? 'shine-glitter' : ''}`}
                          onClick={onDraw}
                          disabled={turn !== 'player'}
                          aria-label="Draw a card"
                        >
                          Draw
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Draw pile</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Your hand ({pHand.length}): {pHand.length === 1 && <span className="ml-2 text-primary font-semibold">UNO!</span>}</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {pHand.map((c) => {
                    const playable = playableByPlayer(c) && turn === 'player' && !isDone;
                    return (
                      <UnoCard
                        key={c.id}
                        color={c.color as any}
                        value={c.value as any}
                        size="sm"
                        playable={playable}
                        disabled={!playable}
                        onClick={() => {
                          if (c.color === 'wild') {
                            setWildChoice(c);
                          } else {
                            playCard(c, 'player');
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
          {/* Wild color chooser */}
          <Dialog open={!!wildChoice} onOpenChange={(open) => { if (!open) setWildChoice(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Choose a color</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center gap-4 py-2">
                <button
                  type="button"
                  aria-label="Choose red"
                  className="w-10 h-10 rounded-full ring-2 ring-white/30 hover:scale-105 transition-transform"
                  style={{ background: "hsl(var(--uno-red))" }}
                  onClick={() => { if (wildChoice) { playCard(wildChoice, 'player', 'red'); setWildChoice(null); } }}
                />
                <button
                  type="button"
                  aria-label="Choose yellow"
                  className="w-10 h-10 rounded-full ring-2 ring-white/30 hover:scale-105 transition-transform"
                  style={{ background: "hsl(var(--uno-yellow))" }}
                  onClick={() => { if (wildChoice) { playCard(wildChoice, 'player', 'yellow'); setWildChoice(null); } }}
                />
                <button
                  type="button"
                  aria-label="Choose green"
                  className="w-10 h-10 rounded-full ring-2 ring-white/30 hover:scale-105 transition-transform"
                  style={{ background: "hsl(var(--uno-green))" }}
                  onClick={() => { if (wildChoice) { playCard(wildChoice, 'player', 'green'); setWildChoice(null); } }}
                />
                <button
                  type="button"
                  aria-label="Choose blue"
                  className="w-10 h-10 rounded-full ring-2 ring-white/30 hover:scale-105 transition-transform"
                  style={{ background: "hsl(var(--uno-blue))" }}
                  onClick={() => { if (wildChoice) { playCard(wildChoice, 'player', 'blue'); setWildChoice(null); } }}
                />
              </div>
            </DialogContent>
          </Dialog>

          <CardFooter className="flex items-center justify-between gap-3">
            {!isDone ? (
              <div className="text-sm text-muted-foreground">Turn: {turn}</div>
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
