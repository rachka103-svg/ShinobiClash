/**
 * Prefetch utilities — warm the cachedFetch cache and browser image cache
 * for pages the user is likely to navigate to next.
 *
 * Called from navigation hubs (Lobby, BattleHub) so that when the user
 * taps a tile, the data is already cached and the page renders instantly.
 */
import { cachedFetch } from "@/lib/cache";
import api from "@/lib/api";
import { preloadImages } from "@/lib/preload";

let prefetched = false;

/**
 * Prefetch page data for common destinations. Safe to call multiple
 * times — only runs once per page load (de-duped via a flag).
 */
export function prefetchPageData() {
  if (prefetched) return;
  prefetched = true;

  // Warm the cache for pages that use cachedFetch — these return
  // instantly on warm cache and revalidate in the background.
  cachedFetch("/game/boss-hunt", { ttl: 60_000, revalidate: true }, api).catch(() => {});
  cachedFetch("/game/tsukuyomi", { ttl: 60_000, revalidate: true }, api).catch(() => {});
  cachedFetch("/game/shop", { ttl: 60_000, revalidate: true }, api).catch(() => {});
}

/**
 * Prefetch images for the BattleHub mode cards so they're already
 * in the browser cache when the user navigates there.
 */
export function prefetchBattleHubImages() {
  preloadImages([
    "/custom/ares.png",
    "/custom/ymir.png",
    "/custom/fenrir.png",
    "/custom/odin.png",
    "/custom/amaterasu.png",
    "/custom/nm_shadow_sovereign.png",
    "/custom/nm_eternal_nightmare.png",
  ]);
}

/** Reset the de-dup flag (useful for tests). */
export function resetPrefetch() {
  prefetched = false;
}
