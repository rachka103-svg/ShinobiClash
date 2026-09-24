import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves the effective portrait for a hero. Owned hero instances carry an
 * equipped `skin` (with its own `image`); when present it overrides the
 * template's default `portrait` everywhere the hero is displayed.
 * `hero` may be a merged instance+template object, a bare instance, or a
 * catalog template — only objects with a `skin.image` are affected.
 */
export const heroPortrait = (hero) => hero?.skin?.image || hero?.portrait;
