import { useState, useRef, useEffect, useMemo } from "react";
import { Moon, Upload, Loader2, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { RARITY, ELEMENT } from "@/lib/styles";
import api, { formatApiErrorDetail } from "@/lib/api";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

/**
 * TsukuyomiTab — admin panel for managing Tsukuyomi nightmare boss portraits.
 * Each of the 25 bosses can have its portrait overridden independently of
 * the underlying hero template's portrait.
 */
export default function TsukuyomiTab() {
  const [bosses, setBosses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const fileRefs = useRef({});

  const fetchBosses = async () => {
    try {
      const { data } = await api.get("/admin/tsukuyomi");
      setBosses(data.bosses || []);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Failed to load nightmares");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBosses(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return bosses;
    const q = query.toLowerCase();
    return bosses.filter((b) => b.name.toLowerCase().includes(q) || b.id.includes(q));
  }, [bosses, query]);

  const uploadPortrait = async (bossId, file) => {
    if (!file) return;
    setUploadingId(bossId);
    try {
      const image = await fileToDataUrl(file);
      await api.post("/admin/tsukuyomi/portrait", { template_id: bossId, image });
      await fetchBosses();
      toast.success("Nightmare portrait updated!");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Upload failed");
    } finally {
      setUploadingId(null);
      if (fileRefs.current[bossId]) fileRefs.current[bossId].value = "";
    }
  };

  const resetPortrait = async (bossId) => {
    setUploadingId(bossId);
    try {
      await api.delete(`/admin/tsukuyomi/${bossId}/portrait`);
      await fetchBosses();
      toast.success("Restored default portrait");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Reset failed");
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-jutsu animate-spin" /></div>;
  }

  return (
    <div data-testid="admin-tsukuyomi">
      <div className="mb-4">
        <h2 className="font-display text-3xl tracking-wide text-ink flex items-center gap-2">
          <Moon className="w-7 h-7 text-jutsu" /> NIGHTMARE PORTRAITS
        </h2>
        <p className="text-sm text-slate-500 mt-1">Override the displayed portrait for each Tsukuyomi dream-boss independently of the hero roster.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full bg-black/40 border border-black/10 rounded-lg pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-chakra"
          placeholder="Search nightmares…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="tsukuyomi-admin-search"
        />
      </div>

      {/* Boss grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" data-testid="tsukuyomi-admin-grid">
        {filtered.map((b) => {
          const rarity = RARITY[b.rarity] || RARITY.SSR;
          const element = ELEMENT[b.element] || {};
          return (
            <div
              key={b.id}
              className="rounded-xl overflow-hidden border bg-[#FFFFFF]"
              style={{ borderColor: `${rarity.color}55` }}
              data-testid={`tsukuyomi-boss-${b.id}`}
            >
              {/* Portrait */}
              <div className="relative h-40 overflow-hidden">
                <img src={b.portrait} alt={b.name} className="w-full h-full object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {b.portrait_overridden && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-jutsu text-ink" data-testid={`tsukuyomi-override-tag-${b.id}`}>
                    CUSTOM
                  </span>
                )}
                <span className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">
                  <Moon className="w-2.5 h-2.5" /> #{b.index}
                </span>
                <div className="absolute bottom-1.5 left-2 right-2">
                  <p className="text-xs font-bold text-white truncate leading-tight">{b.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-bold uppercase" style={{ color: rarity.color }}>{b.rarity}</span>
                    <span className="text-[9px]" style={{ color: element.color }}>{b.element}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2 space-y-1.5">
                <input
                  ref={(el) => (fileRefs.current[b.id] = el)}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid={`tsukuyomi-file-${b.id}`}
                  onChange={(e) => uploadPortrait(b.id, e.target.files?.[0])}
                />
                <button
                  onClick={() => fileRefs.current[b.id]?.click()}
                  disabled={uploadingId === b.id}
                  data-testid={`tsukuyomi-upload-${b.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-chakra/15 text-chakra border border-chakra/30 hover:bg-chakra/25 disabled:opacity-50 transition-all"
                >
                  {uploadingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {b.portrait_overridden ? "Replace" : "Upload Portrait"}
                </button>
                {b.portrait_overridden && (
                  <button
                    onClick={() => resetPortrait(b.id)}
                    disabled={uploadingId === b.id}
                    data-testid={`tsukuyomi-reset-${b.id}`}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-black/[0.04] text-slate-600 border border-black/10 hover:bg-black/10 disabled:opacity-50 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-10">No nightmares match your search.</p>
      )}
    </div>
  );
}
