import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Sliders, Zap, TrendingUp, Dices, Loader2 } from "lucide-react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY } from "@/lib/styles";
import { Panel, Field, SectionLabel, numCls, SaveBar } from "./AdminShared";

// Grouped tuning knobs so the form is scannable.
const GROWTH_FIELDS = [
  ["stat_level_growth", "HP/ATK Level Growth", 0.01],
  ["def_level_growth", "DEF Level Growth", 0.01],
  ["spd_level_growth", "SPD Level Growth", 0.01],
  ["stat_ascension_growth", "Ascension Growth (all)", 0.01],
  ["spd_ascension_growth", "SPD Ascension Growth", 0.01],
  ["ascension_step", "Ascension Level Step", 1],
];
const EXP_FIELDS = [
  ["player_exp_base", "Player EXP Base", 1],
  ["player_exp_per_level", "Player EXP / Level", 1],
  ["hero_exp_base", "Hero EXP Base", 1],
  ["hero_exp_per_level", "Hero EXP / Level", 1],
  ["hero_exp_quadratic", "Hero EXP Quadratic", 1],
];
const ENERGY_FIELDS = [
  ["energy_max", "Energy Max Cap", 1],
  ["energy_regen_seconds", "Regen Seconds / pt", 1],
  ["energy_cost_campaign", "Campaign Cost", 1],
  ["energy_cost_trial", "Trial Cost", 1],
  ["energy_cost_spire", "Spire Cost", 1],
  ["energy_cost_tsukuyomi", "Tsukuyomi Cost", 1],
];

export default function Tuning() {
  const [tuning, setTuning] = useState(null);
  const [gemW, setGemW] = useState({});
  const [goldW, setGoldW] = useState({});
  const [rates, setRates] = useState({});
  const [ratesRyo, setRatesRyo] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/tuning");
      setTuning(data.tuning); setGemW(data.summon_weights_gem);
      setGoldW(data.summon_weights_gold); setRates(data.summon_rates || {});
      setRatesRyo(data.summon_rates_ryo || {});
    } catch (e) { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message); }
  };
  useMemo(() => { load(); }, []); // eslint-disable-line

  const setT = (k, v) => setTuning((t) => ({ ...t, [k]: v }));
  const setW = (which, r, v) => {
    const setter = which === "gem" ? setGemW : setGoldW;
    setter((w) => ({ ...w, [r]: v }));
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        tuning: Object.fromEntries(Object.entries(tuning).map(([k, v]) => [k, Number(v)])),
        summon_weights_gem: Object.fromEntries(Object.entries(gemW).map(([k, v]) => [k, Number(v)])),
        summon_weights_gold: Object.fromEntries(Object.entries(goldW).map(([k, v]) => [k, Number(v)])),
      };
      const { data } = await api.post("/admin/tuning", payload);
      setTuning(data.tuning); setGemW(data.summon_weights_gem); setGoldW(data.summon_weights_gold);
      setRates(data.summon_rates || {}); setRatesRyo(data.summon_rates_ryo || {});
      toast.success("Game tuning applied live!");
    } catch (e) { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message); }
    finally { setBusy(false); }
  };

  if (!tuning) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;

  const RateCard = ({ title, icon, r }) => (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1">{icon}{title}</div>
      <div className="space-y-1">
        {Object.entries(r).map(([rar, pct]) => (
          <div key={rar} className="flex items-center justify-between text-sm">
            <span className="font-bold" style={{ color: (RARITY[rar] || RARITY.R).color }}>{rar}</span>
            <span className="text-ink tabular-nums">{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-3 gap-5" data-testid="admin-tuning">
      <div className="lg:col-span-2 space-y-5">
        <Panel title="GROWTH & STATS" subtitle="Tune how hero stats scale with level and ascension. Higher = faster power creep." icon={<TrendingUp className="w-6 h-6 text-jutsu" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {GROWTH_FIELDS.map(([k, lbl, step]) => (
              <Field key={k} label={lbl}>
                <input type="number" step={step} value={tuning[k]} onChange={(e) => setT(k, e.target.value)}
                  data-testid={`tune-${k}`} className={numCls} />
              </Field>
            ))}
          </div>
          <SectionLabel>Experience Curves</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {EXP_FIELDS.map(([k, lbl]) => (
              <Field key={k} label={lbl}>
                <input type="number" step={1} value={tuning[k]} onChange={(e) => setT(k, e.target.value)}
                  data-testid={`tune-${k}`} className={numCls} />
              </Field>
            ))}
          </div>
        </Panel>

        <Panel title="ENERGY SYSTEM" subtitle="Gate battle attempts and regeneration speed." icon={<Zap className="w-6 h-6 text-chakra" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ENERGY_FIELDS.map(([k, lbl]) => (
              <Field key={k} label={lbl}>
                <input type="number" step={1} value={tuning[k]} onChange={(e) => setT(k, e.target.value)}
                  data-testid={`tune-${k}`} className={numCls} />
              </Field>
            ))}
          </div>
        </Panel>

        <Panel title="SUMMON WEIGHTS" subtitle="Per-rarity pull weights for the Gem (pity-backed) and Gold/Ryo banners. Higher weight = more common." icon={<Dices className="w-6 h-6 text-fox" />}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Gem Banner</div>
              {Object.entries(gemW).map(([rar, w]) => (
                <label key={rar} className="flex items-center gap-2 mb-1.5">
                  <span className="font-bold text-sm w-8" style={{ color: (RARITY[rar] || RARITY.R).color }}>{rar}</span>
                  <input type="number" min={1} value={w} onChange={(e) => setW("gem", rar, e.target.value)}
                    data-testid={`tune-gemw-${rar}`} className={numCls} />
                </label>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Gold/Ryo Banner</div>
              {Object.entries(goldW).map(([rar, w]) => (
                <label key={rar} className="flex items-center gap-2 mb-1.5">
                  <span className="font-bold text-sm w-8" style={{ color: (RARITY[rar] || RARITY.R).color }}>{rar}</span>
                  <input type="number" min={1} value={w} onChange={(e) => setW("gold", rar, e.target.value)}
                    data-testid={`tune-goldw-${rar}`} className={numCls} />
                </label>
              ))}
            </div>
          </div>
        </Panel>

        <SaveBar busy={busy} onSave={save} testId="tune-save" />
      </div>

      <div className="space-y-5">
        <Panel title="LIVE GEM RATES" subtitle="Resulting advertised pull % from current weights." icon={<Sliders className="w-5 h-5 text-slate-500" />} className="lg:col-span-1">
          <RateCard title="Gem Banner" icon={<Dices className="w-3 h-3" />} r={rates} />
          <div className="mt-4"><RateCard title="Gold/Ryo Banner" icon={<Dices className="w-3 h-3" />} r={ratesRyo} /></div>
        </Panel>
      </div>
    </div>
  );
}


