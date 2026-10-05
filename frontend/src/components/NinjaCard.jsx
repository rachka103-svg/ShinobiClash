import { motion } from "framer-motion";
import { RARITY, ELEMENT } from "@/lib/styles";
import { rarityFrame, GOLD, GODLY, CRIMSON } from "@/lib/theme";
import { auraClass, RaritySparkles, DecoCorners } from "@/components/RarityFx";
import { ElementIcon } from "@/components/ElementIcons";
import { heroPortrait } from "@/lib/utils";

export const NinjaCard = ({ ninja, onClick, selected, disabled, badge, testid }) => {
  // Always prefer the hero's transformed rarity over its original catalog rarity.
  // This ensures ascended heroes visually upgrade even if template data is merged in.
  const displayRarity =
    ninja.evolved_rarity ||
    ninja.rarity ||
    "R";

  const rarity = RARITY[displayRarity] || RARITY.R;
  const element = ELEMENT[ninja.element] || {};
  const tier = rarity.tier ?? 0;

  // SSR and above get an animated aura
  const elite = tier >= 3;

  const aura = auraClass(displayRarity);
  const fr = rarityFrame(displayRarity);

  const edge = fr.isGodly
    ? GODLY.stroke
    : fr.useCrimson
      ? CRIMSON.stroke
      : fr.useGold
        ? GOLD.stroke
        : rarity.color;

  const frameStyle = selected
    ? {
        border: `2px solid ${edge}`,
      }
    : fr.isGodly
      ? {
          border: `2px solid ${GODLY.base}`,
          "--glow": GODLY.base,
          boxShadow:
            "inset 0 0 0 1px rgba(100,255,218,0.28)",
        }
      : fr.useCrimson
        ? {
            border: `3px solid ${CRIMSON.base}`,
            "--glow": CRIMSON.base,
            boxShadow: `inset 0 0 0 1px rgba(255,23,68,0.28), 0 0 18px ${CRIMSON.base}44`,
          }
      : elite
        ? {
            border: `2px solid ${edge}`,
            "--glow": fr.useGold
              ? GOLD.base
              : `${rarity.color}${
                  tier >= 4 ? "cc" :
                  tier >= 3 ? "aa" :
                  "88"
                }`,
          }
        : {
            border: `${tier >= 1 ? 1.5 : 1}px solid ${rarity.color}`,
            boxShadow: `0 0 ${5 + tier * 4}px ${rarity.color}55, inset 0 0 14px ${rarity.color}1f`,
          };

  return (
    <motion.button
      type="button"
      whileHover={disabled ? {} : { y: -4 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={`relative text-left rounded-lg overflow-hidden group transition-all bg-[#FFFFFF] ${
        selected
          ? "ring-2 ring-cyan-400 glow-cyan"
          : fr.isGodly
            ? `${aura} godly-border`
            : fr.useCrimson
              ? `${aura} crimson-border`
              : elite
                ? aura
                : ""
      } ${disabled ? "opacity-50 grayscale" : ""}`}
      style={frameStyle}
    >
      <div className="aspect-[3/4] overflow-hidden bg-black/40 relative">
        <img
          src={heroPortrait(ninja)}
          alt={ninja.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {!disabled && (
          <RaritySparkles rarity={displayRarity} />
        )}

        {tier >= 4 && !disabled && (
          <span className="absolute inset-0 shine-sweep pointer-events-none" />
        )}

        {fr.cornerLevel >= 1 && !disabled && (
          <DecoCorners rarity={displayRarity} size={16} />
        )}

        {ninja.level != null && (
          <span className="absolute bottom-1.5 right-1.5 font-display text-base text-white glow-text-cyan">
            Lv.{ninja.level}
          </span>
        )}

        {badge}
      </div>

      <div className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <ElementIcon element={ninja.element} size={14} />
          <p className="font-display text-base tracking-wide text-ink truncate leading-none">
            {ninja.name}
          </p>
        </div>

        <p className="text-[11px] text-slate-500 truncate">
          {ninja.role}
        </p>
      </div>
    </motion.button>
  );
};
