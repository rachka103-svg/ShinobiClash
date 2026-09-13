import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Loader2, Zap, Mail, Lock, Eye, EyeOff,
  Scroll, Mountain, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";

const GOLD = "#d4af37";
const GOLD_BRIGHT = "#f0c75e";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
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
    <div
      className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#050303] select-none"
      data-testid="login-page"
    >
      {/* ── Epic background ── */}
      <img
        src="/art/login-bg-epic.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ objectPosition: "center 30%" }}
      />
      {/* Subtle darkening for text legibility — keeps art visible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 70% 50%, rgba(5,3,3,0.35) 0%, rgba(5,3,3,0.72) 100%)",
        }}
      />

      {/* ── Top-right header ── */}
      <div className="absolute top-5 right-8 z-30 text-right">
        <p className="text-[10px] tracking-[0.3em] text-white/40 uppercase">v1.0.0</p>
        <p className="text-[11px] tracking-[0.25em] text-white/70 uppercase mt-0.5">Live the Legend</p>
        <h1
          className="font-display text-3xl sm:text-4xl tracking-wider leading-none mt-1"
          style={{
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, #fff 60%, ${GOLD})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 8px rgba(212,175,55,0.3))",
          }}
        >
          SHINOBI STRIKE
        </h1>
        <p className="text-[10px] tracking-[0.2em] text-white/50 mt-0.5">忍 ストライク</p>
        <p className="text-[11px] tracking-[0.15em] text-white/60 mt-1.5">
          BEAUTIFUL SOULS. BURN BRIGHTER.
        </p>
      </div>

      {/* ── Left vertical kanji ── */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col items-center gap-3">
        <span
          className="font-display text-7xl text-white/15 leading-none"
          style={{ writingMode: "vertical-rl", textShadow: "0 0 30px rgba(255,255,255,0.08)" }}
        >
          忍
        </span>
        <span
          className="text-[10px] tracking-[0.3em] text-white/25 uppercase"
          style={{ writingMode: "vertical-rl" }}
        >
          Beautiful Souls
        </span>
      </div>

      {/* ── Bottom-left footer ── */}
      <div className="absolute bottom-5 left-8 z-20 hidden sm:block">
        <p className="text-[10px] tracking-[0.25em] text-white/35 uppercase">
          A New Generation of Ninja RPG
        </p>
        <p className="text-[11px] italic text-white/40 mt-1">
          "Different paths, one destiny."
        </p>
        <p className="text-[9px] tracking-[0.15em] text-white/25 mt-0.5">異なる道、ひとつの運命</p>
      </div>

      {/* ── Bottom-right feature icons ── */}
      <div className="absolute bottom-5 right-8 z-20 hidden sm:flex items-center gap-6">
        <FeatureIcon icon={Scroll} label="COLLECT" sub="Unique Shinobi" />
        <FeatureIcon icon={Swords} label="BATTLE" sub="Epic Foes" />
        <FeatureIcon icon={Sparkles} label="EVOLVE" sub="True Power" gold />
        <FeatureIcon icon={Mountain} label="EXPLORE" sub="Living World" />
      </div>

      {/* ── Phase 1: Click to Start ── */}
      <AnimatePresence>
        {!started && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setStarted(true)}
            data-testid="click-to-start"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <p
                className="font-display text-2xl sm:text-3xl tracking-[0.3em] text-white/90"
                style={{ textShadow: "0 0 24px rgba(212,175,55,0.4)" }}
              >
                CLICK TO START
              </p>
            </motion.div>
            <motion.p
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="text-[11px] tracking-[0.2em] text-white/40 uppercase mt-4"
            >
              Tap anywhere to begin your journey
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 2: Login panel ── */}
      <AnimatePresence>
        {started && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative z-30 w-full max-w-[24rem] mx-4 sm:mx-0 sm:mr-12"
            data-testid="auth-panel"
          >
            <div
              className="rounded-xl p-7 backdrop-blur-xl"
              style={{
                background: "rgba(10, 10, 12, 0.82)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* heading */}
              <div className="mb-6">
                <h2 className="font-display text-xl tracking-[0.15em] text-white">
                  BEGIN YOUR JOURNEY
                </h2>
                <p className="text-[12px] text-white/40 mt-1 tracking-wide">
                  Summon. Build. Evolve. Transcend.
                </p>
              </div>

              {/* tabs */}
              <div className="flex mb-5 rounded-lg p-0.5" style={{ background: "rgba(0,0,0,0.5)" }}>
                {["login", "register"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    data-testid={`tab-${m}`}
                    className="flex-1 py-2 rounded-md text-sm font-semibold tracking-wide transition-all"
                    style={
                      mode === m
                        ? { background: GOLD, color: "#0a0a0c", boxShadow: `0 0 12px ${GOLD}55` }
                        : { color: "rgba(255,255,255,0.4)" }
                    }
                  >
                    {m === "login" ? "SIGN IN" : "REGISTER"}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-3.5">
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
                      className="text-white/30 hover:text-white/60 transition-colors"
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
                  className="w-full py-3 rounded-lg font-display text-lg tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(90deg, ${GOLD}, ${GOLD_BRIGHT})`,
                    color: "#0a0a0c",
                    boxShadow: `0 0 20px ${GOLD}44`,
                  }}
                >
                  {busy && <Loader2 className="w-5 h-5 animate-spin" />}
                  {mode === "login" ? "ENTER THE VILLAGE" : "BEGIN YOUR JOURNEY"}
                </button>
              </form>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] uppercase tracking-widest text-white/30">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button
                type="button"
                onClick={quickLogin}
                disabled={busy}
                data-testid="quick-login-button"
                className="w-full py-3 rounded-lg font-display text-base tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-white/5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" style={{ color: GOLD }} />}
                QUICK PLAY — DEMO
              </button>

              <p className="text-center text-xs text-white/40 mt-4">
                <button
                  type="button"
                  onClick={() => toast.info("Password reset is not available in the demo.")}
                  className="hover:text-white/70 transition-colors"
                  style={{ color: GOLD_BRIGHT }}
                >
                  Already have an account? Sign In
                </button>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Copyright ── */}
      <div className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center gap-2 text-[10px] text-white/25 sm:hidden">
        <span className="inline-block w-1.5 h-1.5 rotate-45 bg-white/20" />
        © 2025 SHINOBI STRIKE
        <span className="inline-block w-1.5 h-1.5 rotate-45 bg-white/20" />
      </div>
    </div>
  );
}

// ── Feature icon component ──
const FeatureIcon = ({ icon: Icon, label, sub, gold }) => (
  <div className="flex flex-col items-center gap-1 text-center">
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center"
      style={{
        background: gold ? `${GOLD}15` : "rgba(255,255,255,0.04)",
        border: gold ? `1px solid ${GOLD}55` : "1px solid rgba(255,255,255,0.1)",
        boxShadow: gold ? `0 0 14px ${GOLD}33` : "none",
      }}
    >
      <Icon className="w-5 h-5" style={{ color: gold ? GOLD_BRIGHT : "rgba(255,255,255,0.6)" }} />
    </div>
    <p className="text-[9px] tracking-[0.15em] uppercase" style={{ color: gold ? GOLD_BRIGHT : "rgba(255,255,255,0.5)" }}>
      {label}
    </p>
    <p className="text-[8px] text-white/30">{sub}</p>
  </div>
);

// ── Form field ──
const Field = ({ label, testid, icon, trailing, type, ...props }) => (
  <div>
    <label className="block text-[10px] font-semibold text-white/40 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>}
      <input
        {...props}
        type={type}
        required
        data-testid={testid}
        className="w-full py-2.5 rounded-lg bg-black/50 border border-white/10 text-white placeholder-white/20 focus:border-[#d4af37] focus:outline-none transition-all pl-10 pr-10 text-sm"
      />
      {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
    </div>
  </div>
);
