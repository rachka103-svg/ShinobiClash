import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { cachedFetch } from "@/lib/cache";

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
  const [summonCost, setSummonCost] = useState(10000);
  const [goldSummonX10Cost, setGoldSummonX10Cost] = useState(100000);
  const [gemCosts, setGemCosts] = useState({ summon: 150, energy_refill_per_point: 4, energy_refill_min: 15 });
  const [banner, setBanner] = useState(null);
  // --- Phase J expansion config (all data-driven from the backend) ---
  const [summonRates, setSummonRates] = useState({});
  const [summonRatesRyo, setSummonRatesRyo] = useState({});
  const [pityConfig, setPityConfig] = useState({ soft_pity_start: 60, hard_pity: 90, lr_hard_pity: 180, featured_5050: 0.5, featured_5050_rarity: "GR", x10_guarantee_rarity: "SR", pity_rarity: "UR", pity_currencies: ["gems", "ticket"] });
  const [gearConfig, setGearConfig] = useState(null);
  const [craftRecipes, setCraftRecipes] = useState({});
  const [fusionRecipes, setFusionRecipes] = useState({});
  const [expTomeGoldCost, setExpTomeGoldCost] = useState({});
  const [dungeons, setDungeons] = useState([]);
  const [reforgeModifiers, setReforgeModifiers] = useState({});
  const [reforgeMaxPerJutsu, setReforgeMaxPerJutsu] = useState(2);
  const [skins, setSkins] = useState({});
  const [productionCategories, setProductionCategories] = useState([]);
  const [forgeMaxLevel, setForgeMaxLevel] = useState(200);
  const [enemyTemplates, setEnemyTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  const applyCatalog = useCallback((data) => {
    setCatalog(data.ninjas);
    setAdvantage(data.element_advantage);
    setItems(data.items || {});
    setTrials(data.trials || []);
    setSummonCost(data.summon_cost || 10000);
    setGoldSummonX10Cost(data.gold_summon_x10_cost || 100000);
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
    setReforgeModifiers(data.reforge_modifiers || {});
    setReforgeMaxPerJutsu(data.reforge_max_per_jutsu || 2);
    setSkins(data.skins || {});
    setProductionCategories(data.production_categories || []);
    setForgeMaxLevel(data.forge_max_level || 200);
    const map = {};
    data.ninjas.forEach((n) => { map[n.id] = n; });
    // Merge enemy templates (nightmare bosses) into catalogById so battle
    // can resolve them — but NOT into catalog (player gallery stays clean).
    (data.enemy_templates || []).forEach((t) => { map[t.id] = t; });
    setCatalogById(map);
    setEnemyTemplates(data.enemy_templates || []);
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
      // Use cached fetch with revalidation — on warm cache the catalog
      // and stages appear instantly, then refresh in the background.
      const [c, s] = await Promise.all([
        cachedFetch("/game/catalog", { ttl: 300_000, revalidate: true }, api),
        cachedFetch("/game/stages", { ttl: 300_000, revalidate: true }, api),
      ]);
      applyCatalog(c);
      setStages(s.stages);
      setChapters(s.chapters || []);
      setBossMechanics(s.boss_mechanics || {});
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
      catalog, catalogById, advantage, stages, chapters, bossMechanics, items, trials, summonCost, goldSummonX10Cost, gemCosts, banner,
      summonRates, summonRatesRyo, pityConfig, gearConfig, craftRecipes, fusionRecipes, expTomeGoldCost, dungeons,
      reforgeModifiers, reforgeMaxPerJutsu, productionCategories, forgeMaxLevel, enemyTemplates, skins,
      loading, catalogError, retryCatalog: loadInitialData, refreshCatalog,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
