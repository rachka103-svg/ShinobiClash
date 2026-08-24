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
  const [deals, setDeals] = useState([]);
  const [qty, setQty] = useState({});
  const [tab, setTab] = useState("gems");
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get("/game/shop").then(({ data }) => { if (alive) { setItems(data.items || []); setDeals(data.deals || []); setLoading(false); } })
      .catch((e) => { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Failed to load shop"); setLoading(false); });
    return () => { alive = false; };
  }, []);

  const dealMap = {};
  deals.forEach((d) => { dealMap[d.entry_id] = d; });
  const gems = user?.gems ?? 0;
  const ryo = user?.ryo ?? 0;
  const shown = items.filter((i) => i.currency === tab);
  const getQty = (id) => Math.max(1, Math.min(99, qty[id] || 1));
  const setQtyFor = (id, v) => setQty((q) => ({ ...q, [id]: Math.max(1, Math.min(99, v)) }));

  const buy = async (entry) => {
    const n = getQty(entry.id);
    setBuying(entry.id);
    try {
      const { data } = await api.post("/game/shop/buy", { entry_id: entry.id, qty: n });
      if (data.profile) setUser(data.profile);
      toast.success(`Purchased ${entry.name}${n > 1 ? ` ×${n}` : ""}!`);
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
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-ink leading-none">SHOP</h1>
            <p className="text-slate-500 text-sm mt-1">Spend Gems &amp; Ryo on supplies.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-black/10" data-testid="shop-gems">
            <Gem className="w-4 h-4 text-jutsu" /><span className="font-display text-base text-ink tabular-nums">{gems.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-black/10" data-testid="shop-ryo">
            <Coins className="w-4 h-4 text-amber-400" /><span className="font-display text-base text-ink tabular-nums">{ryo.toLocaleString()}</span>
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
            const deal = dealMap[entry.id];
            const unit = deal ? deal.deal_price : entry.price;
            const n = getQty(entry.id);
            const total = unit * n;
            const have = entry.currency === "gems" ? gems : ryo;
            const afford = have >= total;
            const CurIcon = entry.currency === "gems" ? Gem : Coins;
            const curColor = entry.currency === "gems" ? "#D500F9" : "#FFCA28";
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}
                className="flex flex-col rounded-2xl bg-black/[0.04] border p-3 relative" style={{ borderColor: deal ? "rgba(255,202,40,0.5)" : "rgba(255,255,255,0.1)" }} data-testid={`shop-item-${entry.id}`}>
                {deal && <span className="absolute top-2 right-2 text-[9px] font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-amber-400 text-[#05050A]" data-testid={`shop-deal-${entry.id}`}>-{deal.discount_pct}%</span>}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2" style={{ background: `${entry.color}18`, border: `1px solid ${entry.color}44` }}>
                  <Icon className="w-6 h-6" style={{ color: entry.color }} />
                </div>
                <p className="font-display text-base tracking-wide text-ink leading-tight">{entry.name}</p>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 flex-1">{entry.desc}</p>
                {/* qty stepper */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={() => setQtyFor(entry.id, n - 1)} data-testid={`shop-qty-dec-${entry.id}`} className="w-7 h-7 rounded-lg bg-black/[0.04] border border-black/10 text-slate-600 hover:bg-black/10 transition-colors">−</button>
                  <input
                    type="number" min={1} max={99} value={n}
                    onChange={(e) => setQtyFor(entry.id, parseInt(e.target.value || "1", 10))}
                    data-testid={`shop-qty-${entry.id}`}
                    className="font-display text-lg text-ink w-12 text-center tabular-nums bg-black/[0.04] border border-black/10 rounded-lg py-0.5 outline-none focus:border-white/30"
                  />
                  <button onClick={() => setQtyFor(entry.id, n + 1)} data-testid={`shop-qty-inc-${entry.id}`} className="w-7 h-7 rounded-lg bg-black/[0.04] border border-black/10 text-slate-600 hover:bg-black/10 transition-colors">+</button>
                </div>
                <button onClick={() => buy(entry)} disabled={!afford || buying === entry.id} data-testid={`shop-buy-${entry.id}`}
                  className="mt-2 w-full py-2 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  style={{ background: `${curColor}1a`, color: curColor, border: `1px solid ${curColor}55` }}>
                  {buying === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CurIcon className="w-3.5 h-3.5" />}
                  {total.toLocaleString()}
                  {deal && <span className="text-[10px] line-through text-slate-500 ml-1">{(entry.price * n).toLocaleString()}</span>}
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
