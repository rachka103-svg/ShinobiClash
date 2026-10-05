import { isIconUrl } from "@/lib/gameIcons";

/**
 * GameIcon — renders an AI-generated image URL or falls back to emoji text.
 * @param {string} icon - Image URL or emoji string from gameIcons registry
 * @param {string} className - Class for the emoji span fallback
 * @param {string} imgClassName - Class for the img element
 * @param {string} alt - Alt text for the image
 */
export function GameIcon({ icon, className = "", imgClassName = "", alt = "" }) {
  if (isIconUrl(icon)) {
    return <img src={icon} alt={alt} className={imgClassName} loading="lazy" />;
  }
  return <span className={className}>{icon}</span>;
}
