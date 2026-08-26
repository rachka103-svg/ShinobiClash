import { Loader2 } from "lucide-react";

// Shared helpers for the admin control panels — keeps the input styling and
// section chrome consistent across every new tab without re-declaring them.

export const inputCls =
  "mt-1 w-full bg-black/40 border border-black/10 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-chakra";

export const numCls =
  "w-full bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-chakra";

export const Panel = ({ title, subtitle, icon, children, className = "" }) => (
  <div className={`glass-panel p-4 ${className}`}>
    <h3 className="font-display text-2xl text-ink flex items-center gap-2 mb-1">
      {icon}{title}
    </h3>
    {subtitle && <p className="text-xs text-slate-500 mb-4">{subtitle}</p>}
    {children}
  </div>
);

export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
    {children}
    {hint && <span className="block text-[10px] text-slate-400 mt-0.5">{hint}</span>}
  </label>
);

export const SectionLabel = ({ children }) => (
  <div className="text-xs uppercase tracking-widest text-slate-400 mt-4 mb-2 first:mt-0">{children}</div>
);

export const SaveBar = ({ busy, label = "SAVE", onSave, testId }) => (
  <button onClick={onSave} disabled={busy} data-testid={testId}
    className="w-full mt-5 py-3 rounded-xl bg-chakra text-[#05050A] font-display text-lg tracking-wide disabled:opacity-50 flex items-center justify-center gap-2">
    {busy && <Loader2 className="w-5 h-5 animate-spin" />}
    {busy ? "SAVING…" : label}
  </button>
);
