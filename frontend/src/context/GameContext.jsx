import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [catalog, setCatalog] = useState([]);
  const [catalogById, setCatalogById] = useState({});
  const [advantage, setAdvantage] = useState({});
  const [stages, setStages] = useState([]);
  const [items, setItems] = useState({});
  const [trials, setTrials] = useState([]);
  const [summonCost, setSummonCost] = useState(300);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  const applyCatalog = useCallback((data) => {
    setCatalog(data.ninjas);
    setAdvantage(data.element_advantage);
    setItems(data.items || {});
    setTrials(data.trials || []);
    setSummonCost(data.summon_cost || 300);
    setBanner(data.banner || null);
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
      catalog, catalogById, advantage, stages, items, trials, summonCost, banner,
      loading, catalogError, retryCatalog: loadInitialData, refreshCatalog,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
