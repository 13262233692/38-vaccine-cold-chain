import { useEffect, useRef, useCallback } from 'react';

export function useAlarm(isActive: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playingRef = useRef(false);

  const stopAlarm = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    playingRef.current = false;
  }, []);

  const playAlarm = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    let highFreq = true;

    const beep = () => {
      if (!playingRef.current) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = highFreq ? 880 : 440;
        gain.gain.value = 0.15;
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
        highFreq = !highFreq;
      } catch {
        playingRef.current = false;
      }
    };

    beep();
    intervalRef.current = setInterval(beep, 300);
  }, []);

  useEffect(() => {
    if (isActive) {
      playAlarm();
    } else {
      stopAlarm();
    }

    return () => {
      stopAlarm();
    };
  }, [isActive, playAlarm, stopAlarm]);
}
