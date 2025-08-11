import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UnoCard, UnoColor, UnoValue } from "@/components/game/UnoCard";

// Mock data for testing
const initialHand = [
  { color: "red", value: 3 },
  { color: "blue", value: 7 },
  { color: "yellow", value: 2 },
  { color: "green", value: "skip" },
  { color: "red", value: 9 },
  { color: "blue", value: 1 },
  { color: "yellow", value: "draw2" },
];
const initialTopCard = { color: "green", value: 5 };

export default function GameBot() {
  const [hand, setHand] = useState(initialHand);
  const [topCard, setTopCard] = useState(initialTopCard);
  const [turn, setTurn] = useState<'player' | 'bot'>('player');
  const [mustDraw, setMustDraw] = useState(false);

  // Handler for drawing a card
  const onDraw = useCallback(() => {
    if (turn !== 'player') return;
    // In real game, draw a card from deck and add to hand
    const newCard = { color: "red" as UnoColor, value: 4 as UnoValue }; // Mock card
    setHand(prev => [...prev, newCard]);
    setTurn('bot'); // End player turn
    setMustDraw(false);
  }, [turn]);

  // Handler for playing a card
  const onPlayCard = useCallback((card: { color: UnoColor; value: UnoValue }, index: number) => {
    if (turn !== 'player') return;

    // Check if the card is playable
    if (card.color !== topCard.color && card.value !== topCard.value) {
      alert("Invalid move!");
      return;
    }

    // In real game, remove card from hand and update top card
    setHand(prev => {
      const newHand = [...prev];
      newHand.splice(index, 1);
      return newHand;
    });
    setTopCard(card);
    setTurn('bot'); // End player turn
  }, [topCard, turn]);

  // Bot turn logic
  useEffect(() => {
    if (turn === 'bot') {
      // Find a playable card in bot's hand
      const playableCardIndex = hand.findIndex(card => card.color === topCard.color || card.value === topCard.value);

      if (playableCardIndex !== -1) {
        // Play the card after a short delay
        setTimeout(() => {
          const cardToPlay = hand[playableCardIndex];
          setHand(prev => {
            const newHand = [...prev];
            newHand.splice(playableCardIndex, 1);
            return newHand;
          });
          setTopCard(cardToPlay);
          setTurn('player'); // End bot turn
          setMustDraw(false);
        }, 1500);
      } else {
        // Bot must draw a card
        setMustDraw(true);
        setTimeout(() => {
          // In real game, draw a card from deck and add to hand
          const newCard = { color: "blue" as UnoColor, value: 8 as UnoValue }; // Mock card
          setHand(prev => [...prev, newCard]);
          setTurn('player'); // End bot turn
          setMustDraw(false);
        }, 2000);
      }
    }
  }, [hand, topCard, turn, setMustDraw]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-secondary py-4">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold">UNO Game vs Bot</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Bot hand - face down */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Bot's Hand ({hand.length} cards)</h2>
            <div className="flex gap-2">
              {Array(hand.length).fill(null).map((_, i) => (
                <div key={i} className="w-16 h-24 rounded-[0.9rem] shadow-[0_10px_20px_hsl(var(--uno-black)/0.25)] bg-[hsl(var(--uno-black))]">
                  <div className="absolute inset-1 rounded-[0.8rem] bg-[hsl(var(--uno-white))]" />
                  <div className="absolute inset-2 rounded-[0.7rem] bg-[hsl(var(--uno-black))] flex items-center justify-center">
                    <div className="text-white font-bold text-lg">UNO</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center game area */}
          <div className="relative flex items-center justify-center mb-8" style={{ height: "200px" }}>
            {/* Discard pile - absolutely centered */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                {/* Stack effect with multiple cards */}
                <div className="absolute -inset-1 rotate-[-3deg]">
                  <UnoCard color="blue" value={3} size="md" disabled />
                </div>
                <div className="absolute -inset-0.5 rotate-[2deg]">
                  <UnoCard color="green" value={7} size="md" disabled />
                </div>
                {/* Top card */}
                <div className="relative">
                  <UnoCard color={topCard.color} value={topCard.value} size="md" disabled />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 text-center">Discard pile</div>
            </div>

            {/* Draw pile - pinned to far right */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <div className="relative w-20 h-28">
                {/* Stack of face-down cards using our card back design */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      transform: `translate(${i * 2}px, ${i * -2}px) rotate(${(i - 1) * 3}deg)`,
                      zIndex: 3 - i
                    }}
                  >
                    <div className="w-20 h-28 rounded-[0.9rem] shadow-[0_10px_20px_hsl(var(--uno-black)/0.25)] bg-[hsl(var(--uno-black))]">
                      <div className="absolute inset-1 rounded-[0.8rem] bg-[hsl(var(--uno-white))]" />
                      <div className="absolute inset-2 rounded-[0.7rem] bg-[hsl(var(--uno-black))] flex items-center justify-center">
                        <div className="text-white font-bold text-lg">UNO</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="hero"
                    size="lg"
                    className={`relative z-10 ${mustDraw ? 'border-2 border-primary animate-pulse shadow-lg shadow-primary/50' : ''}`}
                    onClick={onDraw}
                    disabled={turn !== 'player'}
                    aria-label="Draw a card"
                  >
                    Draw
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Draw pile</div>
            </div>
          </div>

          {/* Player hand - interactive */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Your Hand ({hand.length} cards)</h2>
            <div className="flex gap-2">
              {hand.map((card, index) => (
                <UnoCard
                  key={index}
                  color={card.color}
                  value={card.value}
                  size="sm"
                  playable={turn === 'player' && (card.color === topCard.color || card.value === topCard.value)}
                  onClick={() => onPlayCard(card, index)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
