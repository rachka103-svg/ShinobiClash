import { motion } from "framer-motion";
import { RARITY, ELEMENT } from "@/lib/styles";
import { auraClass, RaritySparkles } from "@/components/RarityFx";

export const NinjaCard = ({ ninja, onClick, selected, disabled, badge, testid }) => {
  // ninja: a catalog template OR an owned instance merged with template fields
  const rarity = RARITY[ninja.rarity] || RARITY.R;
  const element = ELEMENT[ninja.element] || {};
  const tier = rarity.tier ?? 0;
  const elite = tier >= 3; // SSR and above get an animated aura
  const aura = auraClass(ninja.rarity);
  const frameStyle = selected
    ? { border: `2px solid ${rarity.color}` }
    : elite
      ? { border: `2px solid ${rarity.color}`, "--glow": `${rarity.color}${tier >= 4 ? "cc" : tier >= 3 ? "aa" : "88"}` }
      : { border: `1.5px solid ${rarity.color}`, boxShadow: `0 0 ${5 + tier * 4}px ${rarity.color}55, inset 0 0 14px ${rarity.color}1f` };
  return (
    <motion.button
      type="button"
      whileHover={disabled ? {} : { y: -4 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={`relative text-left rounded-lg overflow-hidden group transition-all bg-[#0B0B14] ${
        selected ? "ring-2 ring-cyan-400 glow-cyan" : elite ? aura : ""
      } ${disabled ? "opacity-50 grayscale" : ""}`}
      style={frameStyle}
    >
      <div className="aspect-[3/4] overflow-hidden bg-black/40 relative">
        <img
          src={ninja.portrait}
          alt={ninja.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        {!disabled && <RaritySparkles rarity={ninja.rarity} />}
        {tier >= 4 && !disabled && <span className="absolute inset-0 shine-sweep pointer-events-none" />}
        <span
          className="absolute top-1.5 left-1.5 font-display text-sm px-1.5 leading-tight rounded shadow"
          style={{ background: rarity.color, color: "#05050A", boxShadow: `0 0 10px ${rarity.color}aa` }}
        >
          {rarity.label}
        </span>
        <span
          className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: `${element.color}26`, color: element.color, border: `1px solid ${element.color}66` }}
        >
          {ninja.element}
        </span>
        {ninja.level != null && (
          <span className="absolute bottom-1.5 right-1.5 font-display text-base text-white glow-text-cyan">Lv.{ninja.level}</span>
        )}
        {badge}
      </div>
      <div className="px-2 py-1.5">
        <p className="font-display text-base tracking-wide text-white truncate leading-none">{ninja.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{ninja.role}</p>
      </div>
    </motion.button>
  );
};
