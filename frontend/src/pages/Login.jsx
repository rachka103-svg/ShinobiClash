import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Swords, Loader2, Zap, Moon, Sun, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { formatApiErrorDetail } from "@/lib/api";

const PURPLE = "#7d26cd";
const PURPLE_LIGHT = "#9d4eff";

export default function Login() {
  const { login, register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0a0a0f]">
      {/* single full-screen cinematic background */}
      <img
        src="/spire-assets/login-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[#0a0a0f]/35" />

      {/* top-left mini logo */}
      <div className="absolute top-5 left-6 z-20 flex flex-col items-center gap-1 select-none">
        <Swords className="w-5 h-5" style={{ color: PURPLE_LIGHT }} />
        <span className="font-display text-[9px] tracking-[0.2em] text-purple-200/70">SHINOBI CLASH</span>
      </div>

      {/* top-right theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        data-testid="login-theme-toggle"
        aria-label={isDark ? "Switch to Ivory & Ink light theme" : "Switch to cinematic dark theme"}
        className="absolute top-5 right-6 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-purple-400/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* login card — refined floating glass panel */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-[26rem] rounded-2xl p-7 backdrop-blur-md md:ml-10"
        style={{
          background: "rgba(18, 16, 30, 0.88)",
          border: "1px solid rgba(157, 78, 255, 0.22)",
          boxShadow: "0 8px 40px rgba(125, 38, 205, 0.12)",
        }}
        data-testid="auth-panel"
      >
        {/* header */}
        <div className="flex flex-col items-center mb-8">
          <Swords className="w-10 h-10 mb-3" style={{ color: PURPLE_LIGHT }} />
          <h1 className="font-display text-4xl tracking-wider text-slate-200">
            SHINOBI<span style={{ color: PURPLE_LIGHT }}>CLASH</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Forge your squad. Conquer the shadow realm.</p>
        </div>

        {/* tabs */}
        <div className="flex mb-6 rounded-lg p-1" style={{ background: "rgba(0,0,0,0.4)" }}>
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              data-testid={`tab-${m}`}
              className="flex-1 py-2 rounded-md text-sm font-semibold tracking-wide transition-all"
              style={mode === m ? { background: PURPLE, color: "#fff", boxShadow: `0 0 12px ${PURPLE}66` } : { color: "#8a8596" }}
            >
              {m === "login" ? "SIGN IN" : "REGISTER"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <Field label="Shinobi Name" value={form.name} onChange={change("name")} placeholder="Choose a codename" testid="name-input" />
          )}
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={change("email")}
            placeholder="you@village.net"
            testid="email-input"
            icon={<Mail className="w-4 h-4" />}
          />
          <Field
            label="Password"
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={change("password")}
            placeholder="••••••••"
            testid="password-input"
            icon={<Lock className="w-4 h-4" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                tabIndex={-1}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <button
            type="submit"
            disabled={busy}
            data-testid="auth-submit-button"
            className="w-full py-3 rounded-lg font-display text-lg tracking-wider text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(125,38,205,0.3)] hover:shadow-[0_0_26px_rgba(168,85,247,0.5)]"
            style={{ background: "linear-gradient(90deg, #5b21b6, #a855f7)" }}
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
          className="w-full py-3 rounded-lg font-display text-lg tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2 hover:shadow-[0_0_16px_rgba(125,38,205,0.35)]"
          style={{ background: "rgba(10,10,15,0.55)", border: "1px solid rgba(139,92,246,0.45)", color: "#c4b5fd" }}
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          QUICK PLAY — DEMO
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          <button type="button" onClick={() => toast.info("Password reset is not available in the demo.")} className="hover:text-purple-300 transition-colors">
            Forgot Password?
          </button>
        </p>
      </motion.div>

      {/* footer */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <span className="inline-block w-1.5 h-1.5 rotate-45 bg-purple-400/60" />
        © 2025 SHINOBI CLASH. All Rights Reserved.
        <span className="inline-block w-1.5 h-1.5 rotate-45 bg-purple-400/60" />
      </div>
    </div>
  );
}

const Field = ({ label, testid, icon, trailing, type, ...props }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>}
      <input
        {...props}
        type={type}
        required
        data-testid={testid}
        className="w-full py-2.5 rounded-lg bg-black/40 border border-[#3a354a] text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none transition-all pl-10 pr-10"
      />
      {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
    </div>
  </div>
);
