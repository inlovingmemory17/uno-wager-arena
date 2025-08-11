import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface SoundAPI {
  playClick: () => void;
  playCardPlace: () => void;
  playCardDraw: () => void;
}

const noop = () => {};

const SoundContext = createContext<SoundAPI>({
  playClick: noop,
  playCardPlace: noop,
  playCardDraw: noop,
});

function useAudioCtx() {
  const [ctx, setCtx] = useState<AudioContext | null>(null);
  useEffect(() => {
    const AC: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const instance = new AC();
    setCtx(instance);
    return () => { instance.close(); };
  }, []);
  return ctx;
}

function tone(ctx: AudioContext, {
  frequency = 440,
  duration = 0.08,
  type = "sine",
  volume = 0.06,
  attack = 0.005,
  decay = 0.07,
  detune = 0,
}: {
  frequency?: number; duration?: number; type?: OscillatorType; volume?: number; attack?: number; decay?: number; detune?: number;
}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export const SoundProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const ctx = useAudioCtx();

  const api = useMemo<SoundAPI>(() => ({
    playClick: () => {
      if (!ctx) return;
      tone(ctx, { frequency: 600, duration: 0.06, type: "triangle", volume: 0.05 });
    },
    playCardPlace: () => {
      if (!ctx) return;
      tone(ctx, { frequency: 320, duration: 0.08, type: "square", volume: 0.05 });
    },
    playCardDraw: () => {
      if (!ctx) return;
      tone(ctx, { frequency: 220, duration: 0.07, type: "sawtooth", volume: 0.045 });
      setTimeout(() => { if (ctx) tone(ctx, { frequency: 260, duration: 0.05, type: "sawtooth", volume: 0.04 }); }, 60);
    },
  }), [ctx]);

  return (
    <SoundContext.Provider value={api}>{children}</SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);
