import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Scroll, Users, Sparkles, Grid3x3, Castle, Crosshair, LayoutGrid,
  Swords, Anvil, Trophy, Landmark, Wand2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

// Thumb-reachable primary destinations; Summon is the elevated center action.
const PRIMARY = [
  { to: "/", label: "Home", icon: Home, color: "#00E5FF", testid: "nav-lobby" },
  { to: "/campaign", label: "Battle", icon: Scroll, color: "#FF5722", testid: "nav-campaign" },
  { to: "/summon", label: "Summon", icon: Sparkles, color: "#FFCA28", center: true, testid: "nav-summon" },
  { to: "/roster", label: "Heroes", icon: Users, color: "#D500F9", testid: "nav-roster" },
];

const MORE = [
  { to: "/dungeons", label: "Dungeons", icon: Landmark, color: "#7C4DFF", testid: "nav-dungeons" },
  { to: "/spire", label: "Spire", icon: Castle, color: "#D500F9", testid: "nav-spire" },
  { to: "/arena", label: "Arena", icon: Crosshair, color: "#FF1744", testid: "nav-arena" },
  { to: "/gallery", label: "Gallery", icon: LayoutGrid, color: "#00E676", testid: "nav-gallery" },
  { to: "/forge", label: "Forge", icon: Anvil, color: "#FF5722", testid: "nav-forge" },
  { to: "/leaderboard", label: "Ranks", icon: Trophy, color: "#FFCA28", testid: "nav-leaderboard" },
];

/**
 * BottomNav — a fixed, console-style navigation dock. Icons + labels, a raised
 * glowing center action (Summon), animated active indicator, and a bottom
 * "More" sheet for secondary destinations. Replaces the browser-style header.
 */
export default function BottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  const more = user?.role === "admin"
    ? [...MORE, { to: "/admin", label: "Admin", icon: Wand2, color: "#00E5FF", testid: "nav-admin" }]
    : MORE;
  const moreActive = more.some((m) => m.to === loc.pathname);
  const isActive = (to) => (to === "/" ? loc.pathname === "/" : loc.pathname === to);

  const slots = [PRIMARY[0], PRIMARY[1], PRIMARY[2], PRIMARY[3], { more: true }];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
      data-testid="bottom-nav"
    >
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#05050A] via-[#05050A]/85 to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-lg px-3 pb-2">
        <div
          className="relative flex items-end justify-between rounded-2xl px-2 h-16 border border-white/12"
          style={{ background: "rgba(11,11,20,0.82)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 -8px 30px rgba(0,0,0,0.5)" }}
        >
          {/* gold hairline crown */}
          <div className="gold-pinstripe absolute -top-px inset-x-6 opacity-60" />

          {slots.map((s, i) => {
            if (s.more) {
              return (
                <Sheet key="more">
                  <SheetTrigger asChild>
                    <button data-testid="nav-more" className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full group">
                      <Grid3x3 className="w-5 h-5 transition-colors" style={{ color: moreActive ? "#00E5FF" : "#94a3b8" }} />
                      <span className="text-[10px] font-semibold tracking-wide" style={{ color: moreActive ? "#00E5FF" : "#64748b" }}>More</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="bg-[#0B0B14] border-t border-white/12 rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]" data-testid="nav-more-sheet">
                    <SheetHeader>
                      <SheetTitle className="font-display text-2xl tracking-wide text-white">MORE</SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      {more.map((m) => {
                        const MIcon = m.icon;
                        const active = m.to === loc.pathname;
                        return (
                          <SheetClose asChild key={m.to}>
                            <Link
                              to={m.to}
                              data-testid={m.testid}
                              className="flex flex-col items-center gap-2 py-3 rounded-2xl transition-all active:scale-95"
                              style={{ background: active ? `${m.color}1f` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? m.color : "rgba(255,255,255,0.08)"}` }}
                            >
                              <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${m.color}18`, boxShadow: `0 0 14px ${m.color}44` }}>
                                <MIcon className="w-5 h-5" style={{ color: m.color }} />
                              </span>
                              <span className="text-xs font-semibold text-white">{m.label}</span>
                            </Link>
                          </SheetClose>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            const Icon = s.icon;
            const active = isActive(s.to);

            // Elevated center action (Summon)
            if (s.center) {
              return (
                <div key={s.to} className="flex-1 flex justify-center">
                  <Link to={s.to} data-testid={s.testid} className="relative -mt-7 flex flex-col items-center group" aria-label={s.label}>
                    <span
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-active:scale-95"
                      style={{
                        background: `radial-gradient(circle at 50% 35%, ${s.color}, #B8860B)`,
                        border: "2px solid rgba(255,255,255,0.25)",
                        boxShadow: `0 0 22px ${s.color}aa, inset 0 2px 4px rgba(255,255,255,0.4)`,
                      }}
                    >
                      <Icon className="w-7 h-7 text-[#3a2a02]" />
                    </span>
                    <span className="text-[10px] font-bold tracking-wide mt-0.5" style={{ color: active ? s.color : "#cbd5e1" }}>{s.label}</span>
                  </Link>
                </div>
              );
            }

            return (
              <Link key={s.to} to={s.to} data-testid={s.testid} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative group">
                {active && (
                  <motion.span layoutId="nav-active" className="absolute top-1 w-8 h-1 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                )}
                <Icon className="w-5 h-5 transition-transform group-active:scale-90" style={{ color: active ? s.color : "#94a3b8", filter: active ? `drop-shadow(0 0 6px ${s.color})` : "none" }} />
                <span className="text-[10px] font-semibold tracking-wide" style={{ color: active ? s.color : "#64748b" }}>{s.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
