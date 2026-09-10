/**
 * SpireTowerBg — environmental background for the left progression panel.
 * Uses the uploaded gothic-tower artwork (object-fit: cover) so the
 * Dragon's Back climb reads as part of the world.
 */
const TOWER_IMG = "/spire-assets/spire-tower.webp";

export default function SpireTowerBg() {
  return (
    <img
      src={TOWER_IMG}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
      aria-hidden="true"
    />
  );
}
