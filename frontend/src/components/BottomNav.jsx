import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Scroll, Users, Sparkles, Grid3x3, Mountain, Target, Images,
  Swords, Anvil, Trophy, DoorOpen, Wand2, ShoppingBag, Moon, Skull, Flame,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

// Celestial Pagoda palette
const JADE = "#44d6b5";
const GOLD = "#c4a882";
const SILVER = "#7eb8d4";

// Thumb-reachable primary destinations; Battle is the elevated center action.
const PRIMARY = [
  { to: "/", label: "Home", icon: Home, color: JADE, testid: "nav-lobby" },
  { to: "/summon", label: "Summon", icon: Flame, color: GOLD, testid: "nav-summon" },
  { to: "/battle", label: "Battle", icon: Swords, color: JADE, center: true, testid: "nav-battle" },
  { to: "/roster", label: "Heroes", icon: Users, color: SILVER, testid: "nav-roster" },
];

const MORE = [
  { to: "/shop", label: "Shop", icon: ShoppingBag, color: GOLD, testid: "nav-shop" },
  { to: "/campaign", label: "Campaign", icon: Scroll, color: JADE, testid: "nav-campaign" },
  { to: "/tsukuyomi", label: "Tsukuyomi", icon: Moon, color: SILVER, testid: "nav-tsukuyomi" },
  { to: "/dungeons", label: "Dungeons", icon: DoorOpen, color: "#a88bc4", testid: "nav-dungeons" },
  { to: "/boss-hunt", label: "Boss Hunt", icon: Skull, color: "#e07070", testid: "nav-boss-hunt" },
  { to: "/spire", label: "Spire", icon: Mountain, color: SILVER, testid: "nav-spire" },
  { to: "/arena", label: "Arena", icon: Target, color: "#e07070", testid: "nav-arena" },
  { to: "/gallery", label: "Gallery", icon: Images, color: JADE, testid: "nav-gallery" },
  { to: "/forge", label: "Forge", icon: Anvil, color: GOLD, testid: "nav-forge" },
  { to: "/leaderboard", label: "Ranks", icon: Trophy, color: GOLD, testid: "nav-leaderboard" },
];

const NAV_STYLE = {
  background: "rgba(13, 17, 23, 0.88)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(123, 158, 181, 0.22)",
  boxShadow: "inset 0 1px 0 rgba(123, 158, 181, 0.08), 0 -8px 30px rgba(0, 0, 0, 0.5)",
};

/**
 * BottomNav — Celestial Pagoda navigation dock. Dark translucent jade-rimmed
 * pill with jade/gold active accents and a raised jade-glow center action.
 */
export default function BottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  const more = user?.role === "admin"
    ? [...MORE, { to: "/admin", label: "Admin", icon: Wand2, color: GOLD, testid: "nav-admin" }]
    : MORE;
  const moreActive = more.some((m) => m.to === loc.pathname);
  const isActive = (to) => (to === "/" ? loc.pathname === "/" : loc.pathname === to);

  const slots = [PRIMARY[0], PRIMARY[1], PRIMARY[2], PRIMARY[3], { more: true }];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
      data-testid="bottom-nav"
    >
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/85 to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-lg px-3 pb-2">
        <div className="relative flex items-end justify-between rounded-2xl px-2 h-16" style={NAV_STYLE}>
          {/* jade hairline crown */}
          <div className="absolute -top-px inset-x-6 opacity-60" style={{ height: 1, background: `linear-gradient(90deg, transparent, ${JADE}55 20%, ${JADE} 50%, ${JADE}55 80%, transparent)` }} />

          {slots.map((s) => {
            if (s.more) {
              return (
                <Sheet key="more">
                  <SheetTrigger asChild>
                    <button data-testid="nav-more" className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full group">
                      <Grid3x3 className="w-5 h-5 transition-colors" style={{ color: moreActive ? GOLD : "#6b838c" }} />
                      <span className="text-[10px] font-semibold tracking-wide" style={{ color: moreActive ? GOLD : "#5a707a" }}>More</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                    style={{ background: "rgba(13, 17, 23, 0.96)", borderTop: `1px solid ${JADE}33` }}
                    data-testid="nav-more-sheet"
                  >
                    <SheetHeader>
                      <SheetTitle className="font-display text-2xl tracking-wide" style={{ color: "#dce7ec" }}>MORE</SheetTitle>
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
                              style={{
                                background: active ? `${m.color}1a` : "rgba(123, 158, 181, 0.04)",
                                border: `1px solid ${active ? `${m.color}55` : "rgba(123, 158, 181, 0.12)"}`,
                              }}
                            >
                              <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${m.color}14`, boxShadow: `0 0 14px ${m.color}33` }}>
                                <MIcon className="w-5 h-5" style={{ color: m.color }} />
                              </span>
                              <span className="text-xs font-semibold" style={{ color: "#aebfc5" }}>{m.label}</span>
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

            // Elevated center action (Battle)
            if (s.center) {
              return (
                <div key={s.to} className="flex-1 flex justify-center">
                  <Link to={s.to} data-testid={s.testid} className="relative -mt-7 flex flex-col items-center group" aria-label={s.label}>
                    <span
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-active:scale-95"
                      style={{
                        background: `radial-gradient(circle at 50% 35%, ${s.color}, #2a8a7a)`,
                        border: "2px solid rgba(255, 255, 255, 0.2)",
                        boxShadow: `0 0 16px ${s.color}88, inset 0 2px 4px rgba(255, 255, 255, 0.25)`,
                      }}
                    >
                      <Icon className="w-7 h-7" style={{ color: "#0d1117" }} />
                    </span>
                    <span className="text-[10px] font-bold tracking-wide mt-0.5" style={{ color: active ? s.color : "#aebfc5", textShadow: active ? `0 0 8px ${s.color}88` : "none" }}>{s.label}</span>
                  </Link>
                </div>
              );
            }

            return (
              <Link key={s.to} to={s.to} data-testid={s.testid} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative group" style={active ? { background: `${s.color}10` } : undefined}>
                {active && (
                  <motion.span layoutId="nav-active" className="absolute top-1 w-10 h-1 rounded-full" style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }} />
                )}
                <Icon className="w-5 h-5 transition-transform group-active:scale-90" style={{ color: active ? s.color : "#6b838c", filter: active ? `drop-shadow(0 0 8px ${s.color})` : "none" }} />
                <span className="text-[10px] font-semibold tracking-wide" style={{ color: active ? s.color : "#5a707a", textShadow: active ? `0 0 8px ${s.color}66` : "none" }}>{s.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
