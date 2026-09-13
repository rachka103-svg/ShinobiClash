import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { getItemSource } from "@/lib/itemSources";
import { ItemIcon } from "@/components/ItemIcon";

/**
 * ItemSourcePopover — a small popover that shows where an item drops and
 * offers a button to navigate there. Rendered inside a Dialog/Popover anchor.
 */
export default function ItemSourcePopover({ itemId, itemMeta, onClose }) {
  const navigate = useNavigate();
  const src = getItemSource(itemId);

  if (!src) return null;

  return (
    <div className="p-4 rounded-xl bg-[#FFFFFF] border border-black/10 shadow-xl min-w-[220px] max-w-[280px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${itemMeta?.color || "#999"}15` }}>
          <ItemIcon icon={itemMeta?.icon} className="w-5 h-5" style={{ color: itemMeta?.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink truncate">{itemMeta?.name || itemId}</p>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {src.source}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-slate-600 leading-snug mb-3">{src.detail}</p>
      <button
        onClick={() => { onClose?.(); navigate(src.route); }}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-chakra/15 text-chakra border border-chakra/40 text-xs font-bold hover:bg-chakra/25 transition-colors"
      >
        Go to {src.source} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
