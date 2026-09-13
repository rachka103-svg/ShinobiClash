import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mail, Lock, Eye, EyeOff, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import LoginSplash from "@/components/LoginSplash";

const GOLD = "#D69E2E";
const GOLD_LIGHT = "#F5C55A";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);
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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0a0505]">
      {/* Epic cinematic background */}
      <img
        src="/spire-assets/epic-login-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      {/* Splash → Login transition */}
      <AnimatePresence mode="wait">
        {!entered && <LoginSplash key="splash" onEnter={() => setEntered(true)} />}
      </AnimatePresence>

      {/* Login card — revealed after splash */}
      <AnimatePresence>
        {entered && (
          <motion.div
            key="login-card"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-20 w-full max-w-[26rem] rounded-2xl p-7 backdrop-blur-md mx-4"
            style={{
              background: "rgba(10, 10, 11, 0.85)",
              border: `1px solid ${GOLD}44`,
              boxShadow: `0 8px 40px rgba(0, 0, 0, 0.6), 0 0 20px ${GOLD}22`,
            }}
            data-testid="auth-panel"
          >
            {/* Header */}
            <div className="flex flex-col items-center mb-7">
              <h1
                className="font-display text-4xl tracking-wider text-center leading-none"
                style={{
                  background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: `drop-shadow(0 2px 6px ${GOLD}55)`,
                }}
              >
                SHINOBI STRIKE
              </h1>
              <p className="text-white/50 text-xs mt-2 tracking-[0.2em] uppercase">Begin Your Journey</p>
              <p className="text-white/30 text-[10px] mt-1 tracking-wide">Summon. Build. Evolve. Transcend.</p>
            </div>

            {/* Tabs */}
            <div className="flex mb-5 rounded-lg p-1 bg-black/50">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  data-testid={`tab-${m}`}
                  className="flex-1 py-2 rounded-md text-sm font-semibold tracking-wide transition-all"
                  style={
                    mode === m
                      ? { background: GOLD, color: "#0a0505", boxShadow: `0 0 12px ${GOLD}66` }
                      : { color: "#8a8596" }
                  }
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
                    className="text-white/40 hover:text-white/70 transition-colors"
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
                className="w-full py-3 rounded-lg font-display text-lg tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2 hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`,
                  color: "#0a0505",
                  boxShadow: `0 0 18px ${GOLD}44`,
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
              className="w-full py-3 rounded-lg font-display text-lg tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2 hover:scale-[1.02]"
              style={{
                background: "rgba(10, 10, 15, 0.55)",
                border: `1px solid ${GOLD}55`,
                color: GOLD_LIGHT,
              }}
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              QUICK PLAY — DEMO
            </button>

            <p className="text-center text-xs text-white/40 mt-4">
              <button
                type="button"
                onClick={() => toast.info("Password reset is not available in the demo.")}
                className="hover:text-[#D69E2E] transition-colors"
              >
                Forgot Password?
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2 text-[11px] text-white/30">
        <span className="inline-block w-1.5 h-1.5 rotate-45" style={{ background: `${GOLD}66` }} />
        © 2025 SHINOBI STRIKE. All Rights Reserved.
        <span className="inline-block w-1.5 h-1.5 rotate-45" style={{ background: `${GOLD}66` }} />
      </div>
    </div>
  );
}

const Field = ({ label, testid, icon, trailing, type, ...props }) => (
  <div>
    <label className="block text-[11px] font-semibold text-white/40 mb-1.5 uppercase tracking-wide">{label}</label>
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>}
      <input
        {...props}
        type={type}
        required
        data-testid={testid}
        className="w-full py-2.5 rounded-lg bg-black/50 border border-[#3a3530] text-white placeholder-white/20 focus:border-[#D69E2E] focus:outline-none transition-all pl-10 pr-10"
      />
      {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
    </div>
  </div>
);
