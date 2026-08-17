import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Swords, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const change = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      toast.success("Welcome, shinobi!");
      navigate("/");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const quickLogin = async () => {
    setBusy(true);
    try {
      await login("admin@shinobi.com", "admin123");
      toast.success("Welcome, shinobi!");
      navigate("/");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grain relative flex items-center justify-center p-4 overflow-hidden">
      <img src="/art/login-hero.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#05050A] via-[#05050A]/80 to-[#05050A]/40" />
      <div className="absolute inset-0 bg-[#05050A]/40" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md glass border border-white/10 rounded-xl p-8 fade-up"
        data-testid="auth-panel"
      >
        <div className="flex flex-col items-center mb-8">
          <Swords className="w-12 h-12 text-chakra glow-text-cyan mb-3" />
          <h1 className="font-display text-5xl tracking-wider text-white">
            SHINOBI<span className="text-fox">CLASH</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Forge your squad. Conquer the shadow realm.</p>
        </div>

        <div className="flex mb-6 bg-black/40 rounded-lg p-1">
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              data-testid={`tab-${m}`}
              className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-all ${
                mode === m ? "bg-chakra text-[#05050A]" : "text-slate-400 hover:text-white"
              }`}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <Field label="Shinobi Name" value={form.name} onChange={change("name")} placeholder="Choose a codename" testid="name-input" />
          )}
          <Field label="Email" type="email" value={form.email} onChange={change("email")} placeholder="you@village.net" testid="email-input" />
          <Field label="Password" type="password" value={form.password} onChange={change("password")} placeholder="••••••••" testid="password-input" />

          <button
            type="submit"
            disabled={busy}
            data-testid="auth-submit-button"
            className="w-full py-3 rounded-lg font-display text-xl tracking-wider bg-fox text-white hover:bg-orange-600 transition-colors glow-text-orange disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-5 h-5 animate-spin" />}
            {mode === "login" ? "ENTER THE VILLAGE" : "BEGIN YOUR JOURNEY"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] uppercase tracking-widest text-slate-500">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          type="button"
          onClick={quickLogin}
          disabled={busy}
          data-testid="quick-login-button"
          className="w-full py-3 rounded-lg font-display text-xl tracking-wider bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          QUICK PLAY — DEMO
        </button>

        <p className="text-center text-xs text-slate-500 mt-4">
          Demo account — admin@shinobi.com / admin123
        </p>
      </motion.div>
    </div>
  );
}

const Field = ({ label, testid, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      {...props}
      required
      data-testid={testid}
      className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:border-chakra focus:outline-none focus:ring-1 focus:ring-chakra transition-all"
    />
  </div>
);
