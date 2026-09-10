import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";

const RARITIES = ["R", "SR", "SSR", "UR", "LR", "LLR", "GR"];
const ROLES = ["Attacker", "Tank", "Support", "Assassin", "Mage", "Healer", "Control", "Bruiser"];
const STAT_KEYS = ["hp", "atk", "def", "spd", "chakra", "crit_rate", "crit_damage", "accuracy", "resistance"];
const SCALAR_FIELDS = [
  { key: "star_level_max", label: "Star Level Max", step: 1 },
  { key: "hero_max_level", label: "Hero Max Level", step: 1 },
  { key: "boss_max_level", label: "Boss Max Level", step: 1 },
  { key: "ascension_step", label: "Ascension Step (levels/gate)", step: 1 },
];

const inputCls = "w-full bg-black/40 border border-black/10 rounded px-2 py-1.5 text-sm text-ink outline-none focus:border-chakra";

export default function HeroStatsTab() {
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
      for (const f of SCALAR_FIELDS) {
        if (cfg.heroes[f.key] != null) payload[f.key] = Number(cfg.heroes[f.key]);
      }
      for (const k of ["rarity_base", "role_mod", "ascension_max", "shard_yield_per_duplicate", "exp_tome_gold_cost"]) {
        if (cfg.heroes[k] != null) payload[k] = cfg.heroes[k];
      }
      const { data } = await api.post("/admin/config", payload);
      setCfg(data.config);
      toast.success("Hero stats config saved — live now!");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const setScalar = (k, v) => setCfg((c) => ({ ...c, heroes: { ...c.heroes, [k]: v } }));
  const setRarityStat = (rar, stat, v) => setCfg((c) => ({
    ...c, heroes: { ...c.heroes, rarity_base: { ...c.heroes.rarity_base, [rar]: { ...c.heroes.rarity_base?.[rar], [stat]: Number(v) } } },
  }));
  const setRoleMod = (role, stat, v) => setCfg((c) => ({
    ...c, heroes: { ...c.heroes, role_mod: { ...c.heroes.role_mod, [role]: { ...c.heroes.role_mod?.[role], [stat]: Number(v) } } },
  }));
  const setAscMax = (rar, v) => setCfg((c) => ({
    ...c, heroes: { ...c.heroes, ascension_max: { ...c.heroes.ascension_max, [rar]: Number(v) } },
  }));
  const setShard = (rar, v) => setCfg((c) => ({
    ...c, heroes: { ...c.heroes, shard_yield_per_duplicate: { ...c.heroes.shard_yield_per_duplicate, [rar]: Number(v) } },
  }));
  const setTomeCost = (k, v) => setCfg((c) => ({
    ...c, heroes: { ...c.heroes, exp_tome_gold_cost: { ...c.heroes.exp_tome_gold_cost, [k]: Number(v) } },
  }));

  if (!cfg) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;
  const h = cfg.heroes;

  return (
    <div className="space-y-5" data-testid="admin-herostats">
      {/* Scalars */}
      <div className="glass-panel p-4">
        <h3 className="font-display text-xl text-ink mb-3">General Caps</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SCALAR_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{f.label}</span>
              <input type="number" step={f.step} className={inputCls} value={h[f.key] ?? 0}
                onChange={(e) => setScalar(f.key, Number(e.target.value))} data-testid={`hs-${f.key}`} />
            </label>
          ))}
        </div>
      </div>

      {/* Rarity Base Stats */}
      <div className="glass-panel p-4 overflow-x-auto">
        <h3 className="font-display text-xl text-ink mb-0.5">Base Stats per Rarity</h3>
        <p className="text-xs text-slate-500 mb-3">Foundation stats before role multipliers are applied</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-slate-500">
              <th className="text-left pb-2 pr-2">Rarity</th>
              {STAT_KEYS.map((s) => <th key={s} className="text-right pb-2 px-1">{s.replace("_", " ")}</th>)}
            </tr>
          </thead>
          <tbody>
            {RARITIES.map((r) => (
              <tr key={r}>
                <td className="font-bold text-ink pr-2 py-1">{r}</td>
                {STAT_KEYS.map((s) => (
                  <td key={s} className="px-0.5">
                    <input type="number" className={`${inputCls} text-center`} value={h.rarity_base?.[r]?.[s] ?? 0}
                      onChange={(e) => setRarityStat(r, s, e.target.value)} data-testid={`hs-rb-${r}-${s}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Multipliers */}
      <div className="glass-panel p-4 overflow-x-auto">
        <h3 className="font-display text-xl text-ink mb-0.5">Role Stat Multipliers</h3>
        <p className="text-xs text-slate-500 mb-3">Multiplied against base stats per role (1.0 = neutral)</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-slate-500">
              <th className="text-left pb-2 pr-2">Role</th>
              {["hp", "atk", "def", "spd", "chakra"].map((s) => <th key={s} className="text-right pb-2 px-1">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r}>
                <td className="font-bold text-ink pr-2 py-1 whitespace-nowrap">{r}</td>
                {["hp", "atk", "def", "spd", "chakra"].map((s) => (
                  <td key={s} className="px-0.5">
                    <input type="number" step="0.01" className={`${inputCls} text-center`} value={h.role_mod?.[r]?.[s] ?? 1}
                      onChange={(e) => setRoleMod(r, s, e.target.value)} data-testid={`hs-rm-${r}-${s}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ascension Max + Shard Yield */}
      <div className="glass-panel p-4">
        <h3 className="font-display text-xl text-ink mb-3">Ascension & Shards</h3>
        <div className="grid grid-cols-5 gap-3">
          {RARITIES.map((r) => (
            <label key={r} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{r} Asc Max</span>
              <input type="number" className={inputCls} value={h.ascension_max?.[r] ?? 0}
                onChange={(e) => setAscMax(r, e.target.value)} data-testid={`hs-am-${r}`} />
            </label>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3 mt-3">
          {RARITIES.map((r) => (
            <label key={r} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{r} Shard Yield</span>
              <input type="number" className={inputCls} value={h.shard_yield_per_duplicate?.[r] ?? 0}
                onChange={(e) => setShard(r, e.target.value)} data-testid={`hs-sy-${r}`} />
            </label>
          ))}
        </div>
      </div>

      {/* EXP Tome Costs */}
      <div className="glass-panel p-4">
        <h3 className="font-display text-xl text-ink mb-3">EXP Tome Gold Costs</h3>
        <div className="grid grid-cols-3 gap-3">
          {["exp_tome_minor", "exp_tome_greater", "exp_tome_ancient"].map((k) => (
            <label key={k} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{k.replace(/_/g, " ")}</span>
              <input type="number" className={inputCls} value={h.exp_tome_gold_cost?.[k] ?? 0}
                onChange={(e) => setTomeCost(k, e.target.value)} data-testid={`hs-tc-${k}`} />
            </label>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={busy} data-testid="herostats-save"
        className="w-full py-3 rounded-xl bg-chakra text-[#05050A] font-display text-lg tracking-wide disabled:opacity-50">
        {busy ? "SAVING…" : "SAVE HERO STATS"}
      </button>
    </div>
  );
}
