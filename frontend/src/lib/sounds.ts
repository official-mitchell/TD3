/**
 * Sound playback. Volume from uiStore.
 * diesel-idle ambient, mechanical-clamp swivel, a-10 fire, richochet, bulletshot-impact hit.
 */
import { useUIStore } from '../store/uiStore';

import dieselIdleUrl from '../assets/diesel-idle.mp3';
import mechanicalClampUrl from '../assets/mechanical-clamp.mp3';
import a10WarthogUrl from '../assets/a-10-warthog-brrrt.mp3';
import richochet01Url from '../assets/richochet-01.mp3';
import bulletshotImpactUrl from '../assets/bulletshot-impact.mp3';

let dieselAudio: HTMLAudioElement | null = null;
let dieselPending = false;

const getVolume = () => useUIStore.getState().soundVolume ?? 0.6;

/** Play one-shot sound at current volume */
export const playSound = (
  url: string,
  options?: { volume?: number; fadeOutMs?: number; maxDurationMs?: number }
): HTMLAudioElement | null => {
  const vol = options?.volume ?? getVolume();
  if (vol <= 0) return null;
  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, vol);
    if (options?.maxDurationMs != null) {
      const fadeMs = options.fadeOutMs ?? 0;
      const startFadeAt = options.maxDurationMs - fadeMs;
      const timeout = setTimeout(() => {
        if (fadeMs > 0) {
          fadeOut(audio, fadeMs);
          setTimeout(() => audio.pause(), fadeMs);
        } else {
          audio.pause();
        }
      }, startFadeAt);
      audio.addEventListener('ended', () => clearTimeout(timeout));
    }
    audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
};

const fadeOut = (audio: HTMLAudioElement, ms: number) => {
  const startVol = audio.volume;
  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed >= ms) {
      audio.pause();
      return;
    }
    audio.volume = Math.max(0, startVol * (1 - elapsed / ms));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/** Diesel idle ambient – loop when platform active. Retries on first user interaction if autoplay blocked. */
export const playDieselIdle = (): void => {
  if (dieselAudio) return;
  if (dieselPending) return;
  try {
    dieselAudio = new Audio(dieselIdleUrl);
    dieselAudio.loop = true;
    dieselAudio.volume = getVolume() * 0.3;
    dieselAudio
      .play()
      .then(() => {
        dieselPending = false;
      })
      .catch(() => {
        dieselAudio = null;
        dieselPending = true;
        const resume = () => {
          document.removeEventListener('click', resume);
          document.removeEventListener('keydown', resume);
          dieselPending = false;
          playDieselIdle();
        };
        document.addEventListener('click', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
      });
  } catch {
    dieselAudio = null;
  }
};

export const stopDieselIdle = (): void => {
  dieselPending = false;
  if (dieselAudio) {
    dieselAudio.pause();
    dieselAudio = null;
  }
};

export const setDieselVolume = (vol: number): void => {
  if (dieselAudio) {
    dieselAudio.volume = Math.min(1, vol * 0.3);
  }
};

/** Swivel: first 1.5s of mechanical-clamp, fade out over last 500ms */
export const playSwivelSound = (): void => {
  playSound(mechanicalClampUrl, { maxDurationMs: 1500, fadeOutMs: 500 });
};

/** Fire: a-10 warthog brrrt */
export const playFireSound = (): void => {
  playSound(a10WarthogUrl);
};

/** Richochets: play 3–4 from richochet-01.mp3 at 0s, 1s, 2s offsets, random delays after fire */
export const playRichochetSounds = (): void => {
  const offsets = [0, 1, 2];
  const count = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const offsetSec = offsets[i % offsets.length];
    const delayMs = 80 + Math.random() * 200 + i * 120;
    setTimeout(() => {
      try {
        const audio = new Audio(richochet01Url);
        audio.volume = Math.min(1, getVolume() * 0.5);
        const playAtOffset = () => {
          audio.currentTime = offsetSec;
          audio.play().catch(() => {});
          setTimeout(() => audio.pause(), 900);
        };
        if (audio.readyState >= 1) {
          playAtOffset();
        } else {
          audio.addEventListener('loadedmetadata', playAtOffset, { once: true });
        }
      } catch {
        /* ignore */
      }
    }, delayMs);
  }
};

/** Hit: first 1s of bulletshot-impact */
export const playHitSound = (): void => {
  playSound(bulletshotImpactUrl, { maxDurationMs: 1000 });
};
