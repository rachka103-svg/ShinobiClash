import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * CollapsibleSection — on mobile, renders a tappable header that
 * expands/collapses its children. On sm+ screens, always expanded
 * with a plain heading label (no toggle).
 */
export function CollapsibleSection({ title, children, defaultOpen = false, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden w-full flex items-center justify-between py-2.5 px-3 rounded-lg bg-black/[0.04] border border-white/5 text-xs uppercase tracking-widest text-slate-400"
      >
        {title}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <p className="hidden sm:block text-xs uppercase tracking-widest text-slate-500 mb-2">{title}</p>
      <div className={`${open ? "block" : "hidden"} sm:block`}>
        {children}
      </div>
    </div>
  );
}
