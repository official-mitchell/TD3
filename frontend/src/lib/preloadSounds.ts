/**
 * Preload all sound assets so they are ready before hiding loading overlay.
 * Returns a Promise that resolves when all sounds have loaded (canplaythrough).
 */
import dieselIdleUrl from '../assets/diesel-idle.mp3';
import mechanicalClampUrl from '../assets/mechanical-clamp.mp3';
import a10WarthogUrl from '../assets/a-10-warthog-brrrt.mp3';
import richochet01Url from '../assets/richochet-01.mp3';
import bulletshotImpactUrl from '../assets/bulletshot-impact.mp3';

const SOUND_URLS = [
  dieselIdleUrl,
  mechanicalClampUrl,
  a10WarthogUrl,
  richochet01Url,
  bulletshotImpactUrl,
];

export function preloadSounds(): Promise<void> {
  return Promise.all(
    SOUND_URLS.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          try {
            const audio = new Audio(url);
            const onReady = () => {
              audio.removeEventListener('canplaythrough', onReady);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              audio.removeEventListener('canplaythrough', onReady);
              audio.removeEventListener('error', onError);
              resolve();
            };
            audio.addEventListener('canplaythrough', onReady, { once: true });
            audio.addEventListener('error', onError, { once: true });
            audio.load();
          } catch {
            resolve();
          }
        })
    )
  ).then(() => {});
}
