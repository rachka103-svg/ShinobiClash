import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [catalog, setCatalog] = useState([]);
  const [catalogById, setCatalogById] = useState({});
  const [advantage, setAdvantage] = useState({});
  const [stages, setStages] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [bossMechanics, setBossMechanics] = useState({});
  const [items, setItems] = useState({});
  const [trials, setTrials] = useState([]);
  const [summonCost, setSummonCost] = useState(300);
  const [gemCosts, setGemCosts] = useState({ summon: 150, energy_refill_per_point: 4, energy_refill_min: 15 });
  const [banner, setBanner] = useState(null);
  // --- Phase J expansion config (all data-driven from the backend) ---
  const [summonRates, setSummonRates] = useState({});
  const [summonRatesRyo, setSummonRatesRyo] = useState({});
  const [pityConfig, setPityConfig] = useState({ soft_pity_start: 60, hard_pity: 90, featured_5050: 0.5, x10_guarantee_rarity: "SR", pity_rarity: "UR", pity_currencies: ["gems", "ticket"] });
  const [gearConfig, setGearConfig] = useState(null);
  const [craftRecipes, setCraftRecipes] = useState({});
  const [fusionRecipes, setFusionRecipes] = useState({});
  const [expTomeGoldCost, setExpTomeGoldCost] = useState({});
  const [dungeons, setDungeons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  const applyCatalog = useCallback((data) => {
    setCatalog(data.ninjas);
    setAdvantage(data.element_advantage);
    setItems(data.items || {});
    setTrials(data.trials || []);
    setSummonCost(data.summon_cost || 300);
    setGemCosts(data.gem_costs || { summon: 150, energy_refill_per_point: 4, energy_refill_min: 15 });
    setBanner(data.banner || null);
    setSummonRates(data.summon_rates || {});
    setSummonRatesRyo(data.summon_rates_ryo || {});
    if (data.pity_config) setPityConfig(data.pity_config);
    setGearConfig(data.gear_config || null);
    setCraftRecipes(data.craft_recipes || {});
    setFusionRecipes(data.fusion_recipes || {});
    setExpTomeGoldCost(data.exp_tome_gold_cost || {});
    setDungeons(data.dungeons || []);
    const map = {};
    data.ninjas.forEach((n) => { map[n.id] = n; });
    setCatalogById(map);
  }, []);

  const refreshCatalog = useCallback(async () => {
    const { data } = await api.get("/game/catalog");
    applyCatalog(data);
    return data.ninjas;
  }, [applyCatalog]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setCatalogError(null);
    try {
      const [c, s] = await Promise.all([api.get("/game/catalog"), api.get("/game/stages")]);
      applyCatalog(c.data);
      setStages(s.data.stages);
      setChapters(s.data.chapters || []);
      setBossMechanics(s.data.boss_mechanics || {});
    } catch (err) {
      // Never let a failed/slow initial load crash the app — surface a
      // graceful, dismissible/retryable error instead of throwing.
      setCatalogError("Couldn't load game data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [applyCatalog]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return (
    <GameContext.Provider value={{
      catalog, catalogById, advantage, stages, chapters, bossMechanics, items, trials, summonCost, gemCosts, banner,
      summonRates, summonRatesRyo, pityConfig, gearConfig, craftRecipes, fusionRecipes, expTomeGoldCost, dungeons,
      loading, catalogError, retryCatalog: loadInitialData, refreshCatalog,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
