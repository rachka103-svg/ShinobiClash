import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, Coins, Gem, Zap, Ticket, Anvil, Sparkles, BookOpen, Scroll,
  ScrollText, Hammer, Box, Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiErrorDetail } from "@/lib/api";

const ICONS = { zap: Zap, coins: Coins, ticket: Ticket, anvil: Anvil, gem: Gem, sparkles: Sparkles, "book-open": BookOpen, scroll: Scroll, "scroll-text": ScrollText, hammer: Hammer, box: Box };

/**
 * Shop — spend Gems or Ryo on resource/progression consumables (energy,
 * gold, tickets, tomes, crafting & evolution materials). Clean two-tab store.
 */
export default function Shop() {
  const { user, setUser } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("gems");
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get("/game/shop").then(({ data }) => { if (alive) { setItems(data.items || []); setLoading(false); } })
      .catch((e) => { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Failed to load shop"); setLoading(false); });
    return () => { alive = false; };
  }, []);

  const gems = user?.gems ?? 0;
  const ryo = user?.ryo ?? 0;
  const shown = items.filter((i) => i.currency === tab);

  const buy = async (entry) => {
    setBuying(entry.id);
    try {
      const { data } = await api.post("/game/shop/buy", { entry_id: entry.id, qty: 1 });
      if (data.profile) setUser(data.profile);
      toast.success(`Purchased ${entry.name}!`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6" data-testid="shop-page">
      {/* Header + balances */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#FFCA2818", border: "1px solid #FFCA2855" }}>
            <ShoppingBag className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-white leading-none">SHOP</h1>
            <p className="text-slate-400 text-sm mt-1">Spend Gems &amp; Ryo on supplies.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/12" data-testid="shop-gems">
            <Gem className="w-4 h-4 text-jutsu" /><span className="font-display text-base text-white tabular-nums">{gems.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/12" data-testid="shop-ryo">
            <Coins className="w-4 h-4 text-amber-400" /><span className="font-display text-base text-white tabular-nums">{ryo.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4" data-testid="shop-tabs">
        <button onClick={() => setTab("gems")} data-testid="shop-tab-gems"
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-display text-base tracking-wider transition-colors"
          style={tab === "gems" ? { background: "#D500F91f", color: "#D500F9", border: "1px solid #D500F966" } : { color: "rgba(148,163,184,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Gem className="w-4 h-4" /> GEM STORE
        </button>
        <button onClick={() => setTab("ryo")} data-testid="shop-tab-ryo"
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-display text-base tracking-wider transition-colors"
          style={tab === "ryo" ? { background: "#FFCA281f", color: "#FFCA28", border: "1px solid #FFCA2866" } : { color: "rgba(148,163,184,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Coins className="w-4 h-4" /> RYO STORE
        </button>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="shop-grid">
          {shown.map((entry, i) => {
            const Icon = ICONS[entry.icon] || Box;
            const have = entry.currency === "gems" ? gems : ryo;
            const afford = have >= entry.price;
            const CurIcon = entry.currency === "gems" ? Gem : Coins;
            const curColor = entry.currency === "gems" ? "#D500F9" : "#FFCA28";
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}
                className="flex flex-col rounded-2xl bg-white/[0.03] border border-white/10 p-3" data-testid={`shop-item-${entry.id}`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2" style={{ background: `${entry.color}18`, border: `1px solid ${entry.color}44` }}>
                  <Icon className="w-6 h-6" style={{ color: entry.color }} />
                </div>
                <p className="font-display text-base tracking-wide text-white leading-tight">{entry.name}</p>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5 flex-1">{entry.desc}</p>
                <button onClick={() => buy(entry)} disabled={!afford || buying === entry.id} data-testid={`shop-buy-${entry.id}`}
                  className="mt-2.5 w-full py-2 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  style={{ background: `${curColor}1a`, color: curColor, border: `1px solid ${curColor}55` }}>
                  {buying === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CurIcon className="w-3.5 h-3.5" />}
                  {entry.price.toLocaleString()}
                </button>
                {!afford && <p className="text-[10px] text-fox text-center mt-1">Not enough {entry.currency === "gems" ? "Gems" : "Ryo"}</p>}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
