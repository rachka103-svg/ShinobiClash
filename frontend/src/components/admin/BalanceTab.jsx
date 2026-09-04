import { useState, useMemo, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";

const RARITIES = ["R", "SR", "SSR", "UR", "LR", "LLR", "GR"];
const SCALAR_FIELDS = [
  { key: "energy_max_default", label: "Max Energy", step: 1 },
  { key: "energy_regen_seconds", label: "Energy Regen (sec/point)", step: 1 },
  { key: "arena_attempts_max", label: "Arena Attempts/Day", step: 1 },
  { key: "arena_rating_default", label: "Arena Starting Rating", step: 1 },
  { key: "arena_rating_win", label: "Arena Win Rating", step: 1 },
  { key: "arena_rating_loss", label: "Arena Loss Rating", step: 1 },
  { key: "arena_win_milestone_every", label: "Arena Milestone Every", step: 1 },
  { key: "arena_win_milestone_gems", label: "Arena Milestone Gems", step: 1 },
  { key: "star_bonus_per_star", label: "Star Bonus Per Star", step: 0.01 },
  { key: "skill_power_per_rank", label: "Skill Power Per Rank", step: 0.01 },
  { key: "skill_rank_max", label: "Skill Rank Max", step: 1 },
  { key: "passive_unlock_rank", label: "Passive Unlock Rank", step: 1 },
  { key: "gear_enhance_max", label: "Gear Enhance Max", step: 1 },
  { key: "gear_main_growth_per_plus", label: "Gear Main Growth/Plus", step: 0.01 },
];

const inputCls = "w-full bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-chakra";

export default function BalanceTab() {
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/config");
      setCfg(data.config);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const payload = {};
      // scalars
      for (const f of SCALAR_FIELDS) {
        if (cfg.balance[f.key] != null) payload[f.key] = Number(cfg.balance[f.key]);
      }
      // json fields
      for (const k of ["summon_weights", "gold_summon_weights", "energy_cost", "arena_win_rewards",
                        "gear_summon_rates", "craft_rarity_weights", "drop_table"]) {
        if (cfg.balance[k] != null) payload[k] = cfg.balance[k];
      }
      const { data } = await api.post("/admin/config", payload);
      setCfg(data.config);
      toast.success("Balance config saved — live now!");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const setScalar = (k, v) => setCfg((c) => ({ ...c, balance: { ...c.balance, [k]: v } }));
  const setDictVal = (dictKey, subKey, v) => setCfg((c) => ({ ...c, balance: { ...c.balance, [dictKey]: { ...c.balance[dictKey], [subKey]: v } } }));

  if (!cfg) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;
  const b = cfg.balance;

  return (
    <div className="space-y-5" data-testid="admin-balance">
      {/* Summon Weights */}
      <Section title="Summon Weights" desc="Gacha pull probability weights per rarity tier">
        <div className="grid grid-cols-5 gap-3">
          {RARITIES.map((r) => (
            <label key={r} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{r}</span>
              <input type="number" className={inputCls} value={b.summon_weights?.[r] ?? 0}
                onChange={(e) => setDictVal("summon_weights", r, Number(e.target.value))} data-testid={`bw-gem-${r}`} />
            </label>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Gem/Premium banner weights</p>
        <div className="grid grid-cols-5 gap-3 mt-3">
          {RARITIES.map((r) => (
            <label key={r} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{r}</span>
              <input type="number" className={inputCls} value={b.gold_summon_weights?.[r] ?? 0}
                onChange={(e) => setDictVal("gold_summon_weights", r, Number(e.target.value))} data-testid={`bw-ryo-${r}`} />
            </label>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Ryo/Budget banner weights (lower rare rates, no pity)</p>
      </Section>

      {/* Energy */}
      <Section title="Energy System" desc="Energy capacity, regen rate, and per-mode costs">
        <div className="grid grid-cols-2 gap-3">
          {SCALAR_FIELDS.slice(0, 2).map((f) => (
            <NumField key={f.key} {...f} value={b[f.key]} onChange={(v) => setScalar(f.key, v)} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {["campaign", "spire", "trial", "tsukuyomi"].map((m) => (
            <label key={m} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{m}</span>
              <input type="number" className={inputCls} value={b.energy_cost?.[m] ?? 0}
                onChange={(e) => setDictVal("energy_cost", m, Number(e.target.value))} data-testid={`bw-ec-${m}`} />
            </label>
          ))}
        </div>
      </Section>

      {/* Arena */}
      <Section title="Arena PvP" desc="Rating, attempts, and win rewards">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SCALAR_FIELDS.slice(2, 8).map((f) => (
            <NumField key={f.key} {...f} value={b[f.key]} onChange={(v) => setScalar(f.key, v)} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Arena Win Ryo</span>
            <input type="number" className={inputCls} value={b.arena_win_rewards?.ryo ?? 0}
              onChange={(e) => setDictVal("arena_win_rewards", "ryo", Number(e.target.value))} data-testid="bw-arena-ryo" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Arena Win Hero EXP</span>
            <input type="number" className={inputCls} value={b.arena_win_rewards?.hero_exp_base ?? 0}
              onChange={(e) => setDictVal("arena_win_rewards", "hero_exp_base", Number(e.target.value))} data-testid="bw-arena-exp" />
          </label>
        </div>
      </Section>

      {/* Progression */}
      <Section title="Progression & Skills" desc="Star bonuses, skill ranks, passive unlock">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SCALAR_FIELDS.slice(8, 14).map((f) => (
            <NumField key={f.key} {...f} value={b[f.key]} onChange={(v) => setScalar(f.key, v)} />
          ))}
        </div>
      </Section>

      {/* Gear */}
      <Section title="Gear System" desc="Summon rates, enhance limits, stat growth, craft weights">
        <div className="grid grid-cols-3 gap-3">
          {["rare", "epic", "legendary"].map((r) => (
            <label key={r} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Gear {r} %</span>
              <input type="number" className={inputCls} value={b.gear_summon_rates?.[r] ?? 0}
                onChange={(e) => setDictVal("gear_summon_rates", r, Number(e.target.value))} data-testid={`bw-gear-${r}`} />
            </label>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {["fine", "rare", "epic", "legendary"].map((r) => (
            <label key={r} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Craft {r}</span>
              <input type="number" className={inputCls} value={b.craft_rarity_weights?.[r] ?? 0}
                onChange={(e) => setDictVal("craft_rarity_weights", r, Number(e.target.value))} data-testid={`bw-craft-${r}`} />
            </label>
          ))}
        </div>
      </Section>

      {/* Drop Table */}
      <Section title="Drop Table" desc="Item drop weights on battle wins (item_id, qty, weight)">
        <div className="space-y-2">
          {(b.drop_table || []).map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input className={inputCls} value={row[0] || ""} placeholder="item_id"
                onChange={(e) => setCfg((c) => {
                  const dt = [...(c.balance.drop_table || [])];
                  dt[i] = [e.target.value, row[1], row[2]];
                  return { ...c, balance: { ...c.balance, drop_table: dt } };
                })} data-testid={`bw-drop-${i}-id`} />
              <input type="number" className={inputCls} value={row[1] || 0} placeholder="qty"
                onChange={(e) => setCfg((c) => {
                  const dt = [...(c.balance.drop_table || [])];
                  dt[i] = [row[0], Number(e.target.value), row[2]];
                  return { ...c, balance: { ...c.balance, drop_table: dt } };
                })} data-testid={`bw-drop-${i}-qty`} />
              <input type="number" className={inputCls} value={row[2] || 0} placeholder="weight"
                onChange={(e) => setCfg((c) => {
                  const dt = [...(c.balance.drop_table || [])];
                  dt[i] = [row[0], row[1], Number(e.target.value)];
                  return { ...c, balance: { ...c.balance, drop_table: dt } };
                })} data-testid={`bw-drop-${i}-w`} />
            </div>
          ))}
        </div>
      </Section>

      <button onClick={save} disabled={busy} data-testid="balance-save"
        className="w-full py-3 rounded-xl bg-chakra text-[#05050A] font-display text-lg tracking-wide disabled:opacity-50">
        {busy ? "SAVING…" : "SAVE BALANCE CONFIG"}
      </button>
    </div>
  );
}

function Section({ title, desc, children }) {
  return (
    <div className="glass-panel p-4">
      <h3 className="font-display text-xl text-ink mb-0.5">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{desc}</p>
      {children}
    </div>
  );
}

function NumField({ key: k, label, step, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
      <input type="number" step={step} className="w-full bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-chakra"
        value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} data-testid={`bw-${k}`} />
    </label>
  );
}
