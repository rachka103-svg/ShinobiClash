/**
 * Image preloading utilities.
 *
 * Preloads images into the browser cache so that when a component renders
 * an <img> with the same src, the browser reuses the already-downloaded
 * asset instead of fetching it again.
 */

const preloaded = new Set();

/**
 * Preload a single image. Returns a promise that resolves when the image
 * is loaded (or rejects on error). Safe to call multiple times for the
 * same URL — it won't create duplicate Image objects.
 */
export function preloadImage(url) {
  if (!url || preloaded.has(url)) return Promise.resolve();
  preloaded.add(url);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => {
      preloaded.delete(url); // allow retry
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Preload multiple images in parallel. Resolves when all are done
 * (regardless of individual success/failure).
 */
export function preloadImages(urls) {
  return Promise.all((urls || []).filter(Boolean).map(preloadImage));
}

/**
 * Preload images for the next likely battle. Call this when the player is
 * on a stage selection screen or victory screen so that enemy portraits
 * and battle backgrounds are already cached when they enter the battle.
 *
 * @param {object} opts
 * @param {array} opts.portraits — array of image URLs (enemy/hero portraits)
 * @param {string} opts.background — battle background URL
 */
export function preloadBattleAssets({ portraits, background }) {
  const urls = [...(portraits || [])];
  if (background) urls.push(background);
  return preloadImages(urls);
}

/**
 * Get the battle background URL for a given mode/region.
 */
export function getBattleBackground(mode, region) {
  if (mode === "spire") return "/bg-spire.png";
  if (mode === "tsukuyomi") return "/bg-tsukuyomi.png";
  if (mode === "bosshunt") return "/bosshunt-shrine.png";
  // Campaign backgrounds could vary by region in the future
  return null;
}
