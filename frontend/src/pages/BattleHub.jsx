import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scroll, Moon, Castle, Crosshair, Landmark, ChevronRight, Swords, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";

/**
 * BattleHub — the catalog of every battle mode, reached by tapping the
 * elevated "Battle" action in the bottom dock. Each mode is a clean, tappable
 * card with a live status line. No cinematic map here — just fast wayfinding.
 */
export default function BattleHub() {
  const { user } = useAuth();
  const { stages } = useGame();
  const cleared = user?.cleared_stages?.length || 0;

  const modes = [
    { to: "/campaign", label: "Campaign", icon: Scroll, color: "#FF5722",
      desc: "Battle through 100 chapters of the shadow realm.",
      status: `${cleared}/${stages.length} stages cleared`, testid: "mode-campaign" },
    { to: "/tsukuyomi", label: "Tsukuyomi", icon: Moon, color: "#7C4DFF",
      desc: "The Infinite Nightmare — 25 escalating dream-bosses that drop rare gear sets.",
      status: "Hunt boss gear & materials", testid: "mode-tsukuyomi", featured: true },
    { to: "/dungeons", label: "Resource Dungeons", icon: Landmark, color: "#00E676",
      desc: "Farm Ryo, EXP tomes, gear and crafting materials.",
      status: "Gold · EXP · Gear vaults", testid: "mode-dungeons" },
    { to: "/spire", label: "Endless Spire", icon: Castle, color: "#D500F9",
      desc: "Climb an endless tower of ever-tougher foes.",
      status: `Floor ${user?.spire_floor || 0} reached`, testid: "mode-spire" },
    { to: "/arena", label: "Arena", icon: Crosshair, color: "#FF1744",
      desc: "Async PvP — challenge other shinobi squads.",
      status: `Rating ${user?.arena?.rating ?? 1000}`, testid: "mode-arena" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6" data-testid="battle-hub-page">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#FF572218", border: "1px solid #FF572255" }}>
          <Swords className="w-6 h-6 text-fox" />
        </div>
        <div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-white leading-none">BATTLE</h1>
          <p className="text-slate-400 text-sm mt-1">Choose your battlefield.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modes.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={m.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}
              className={m.featured ? "sm:col-span-2" : ""}>
              <Link
                to={m.to}
                data-testid={m.testid}
                className="group relative flex items-center gap-4 p-4 rounded-2xl overflow-hidden transition-all active:scale-[0.99] h-full"
                style={{ background: `linear-gradient(120deg, ${m.color}1c, rgba(11,11,20,0.9) 60%)`, border: `1px solid ${m.color}44` }}
              >
                {m.featured && <div className="gold-pinstripe absolute top-0 inset-x-0" />}
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ background: `${m.color}22`, boxShadow: `0 0 18px ${m.color}55` }}>
                  <Icon className="w-7 h-7" style={{ color: m.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-2xl tracking-wide text-white leading-none">{m.label}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{m.desc}</p>
                  <p className="text-[11px] font-semibold mt-1.5" style={{ color: m.color }}>{m.status}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 shrink-0 group-hover:text-white transition-colors" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2 text-[11px] text-slate-500">
        <Zap className="w-3.5 h-3.5 text-emerald-400" /> Battles consume Energy. Refill in the Shop or wait for regen.
      </div>
    </div>
  );
}
