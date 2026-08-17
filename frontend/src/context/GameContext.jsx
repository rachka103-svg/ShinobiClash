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

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([api.get("/game/catalog"), api.get("/game/stages")]);
        applyCatalog(c.data);
        setStages(s.data.stages);
      } finally {
        setLoading(false);
      }
    })();
  }, [applyCatalog]);

  return (
    <GameContext.Provider value={{ catalog, catalogById, advantage, stages, items, trials, summonCost, banner, loading, refreshCatalog }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
