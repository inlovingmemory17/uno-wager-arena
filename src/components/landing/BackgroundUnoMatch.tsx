import React, { useEffect, useMemo, useState } from "react";
import { UnoCard, UnoColor, UnoValue } from "@/components/game/UnoCard";

// Lightweight visual-only background of two bots playing UNO
// Purely aesthetic: non-interactive, low opacity, pointer-events-none
const colors: UnoColor[] = ["red", "yellow", "green", "blue"];
const values: UnoValue[] = [0,1,2,3,4,5,6,7,8,9, "skip", "reverse", "draw2", "wild", "wild4"];

const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const randomCard = (): { color: UnoColor; value: UnoValue } => {
  const v = rand(values);
  // Wilds are always black
  if (v === "wild" || v === "wild4") return { color: "wild", value: v };
  return { color: rand(colors), value: v };
};

const makeHand = (n: number) => Array.from({ length: n }, () => randomCard());

const BackgroundUnoMatch: React.FC = () => {
  const [discard, setDiscard] = useState(randomCard());
  const [handTop] = useState(makeHand(7));
  const [handBottom] = useState(makeHand(7));

  // Slowly "play" a card: just change the discard to something compatible-ish
  useEffect(() => {
    const id = setInterval(() => {
      setDiscard((prev) => {
        // 30% chance of wild/wild4
        if (Math.random() < 0.3) return randomCard();
        // Otherwise keep same color but change value
        const sameColor = prev.color === "wild" ? rand(colors) : prev.color;
        let next = randomCard();
        next = { color: sameColor, value: next.value };
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const topFan = useMemo(() => handTop.map((c, i) => ({ ...c, rot: (i - 3) * 7 })), [handTop]);
  const bottomFan = useMemo(() => handBottom.map((c, i) => ({ ...c, rot: (i - 3) * 7 })), [handBottom]);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 flex items-center justify-center opacity-20 md:opacity-25">
        <div className="relative w-full max-w-5xl aspect-[16/9]">
          {/* Table look */}
          <div className="absolute inset-0 rounded-3xl bg-[hsl(var(--muted))] bg-opacity-40 backdrop-blur-md shadow-[0_50px_100px_-20px_hsl(var(--primary)/0.25)]" />

          {/* Top bot hand */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2">
            {topFan.map((card, idx) => (
              <div key={idx} style={{ transform: `rotate(${card.rot}deg)` }}>
                <UnoCard color={card.color} value={card.value} size="sm" disabled />
              </div>
            ))}
          </div>

          {/* Discard pile (stack) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute -inset-1 rotate-[-6deg]">
                <UnoCard color={rand(colors)} value={rand([1,2,3,4,5,6,7,8,9])} size="md" disabled />
              </div>
              <div className="absolute -inset-0.5 rotate-[6deg]">
                <UnoCard color={rand(colors)} value={rand([1,2,3,4,5,6,7,8,9])} size="md" disabled />
              </div>
              <div className="relative">
                <UnoCard color={discard.color} value={discard.value} size="md" disabled />
              </div>
            </div>
          </div>

          {/* Bottom bot hand */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {bottomFan.map((card, idx) => (
              <div key={idx} style={{ transform: `rotate(${card.rot}deg)` }}>
                <UnoCard color={card.color} value={card.value} size="sm" disabled />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundUnoMatch;
