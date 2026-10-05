import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster } from "sonner";
import { Swords, WifiOff, RotateCw } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GameProvider, useGame } from "@/context/GameContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import ServerGate from "@/components/ServerGate";
import { AudioProvider } from "@/context/AudioContext";
import GameHud from "@/components/GameHud";
import BottomNav from "@/components/BottomNav";
import Login from "@/pages/Login";
import Lobby from "@/pages/Lobby";
import Campaign from "@/pages/Campaign";
import TeamBuilder from "@/pages/TeamBuilder";
import Summon from "@/pages/Summon";
import BattleHub from "@/pages/BattleHub";
import Battle from "@/pages/Battle";
import Spire from "@/pages/Spire";
import Dungeons from "@/pages/Dungeons";
import Shop from "@/pages/Shop";

// Lazy-load less-visited pages to reduce the initial bundle size.
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const Admin = lazy(() => import("@/pages/Admin"));
const Arena = lazy(() => import("@/pages/Arena"));
const Forge = lazy(() => import("@/pages/Forge"));
const Tsukuyomi = lazy(() => import("@/pages/Tsukuyomi"));
const BossHunt = lazy(() => import("@/pages/BossHunt"));

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#05050A]" data-testid="loading-screen">
    <Swords className="w-10 h-10 text-chakra animate-pulse" />
    <p className="font-display text-2xl tracking-widest text-slate-500">LOADING…</p>
  </div>
);

/** Graceful, in-app fallback for a failed/slow initial request — never a
 * blank page or a browser-level crash overlay. Offers a one-tap retry. */
const ErrorScreen = ({ message, onRetry }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#05050A] px-6 text-center" data-testid="error-screen">
    <WifiOff className="w-10 h-10 text-fox" />
    <p className="font-display text-2xl tracking-widest text-white">CONNECTION TROUBLE</p>
    <p className="text-sm text-slate-400 max-w-sm">{message}</p>
    <button
      onClick={onRetry}
      data-testid="error-retry-button"
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-display text-lg tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors"
    >
      <RotateCw className="w-4 h-4" /> RETRY
    </button>
  </div>
);

/** Lightweight, dismissible-by-retry banner shown when the live game catalog
 * failed to load — never blocks rendering the rest of the app since pages
 * already fall back to empty defaults gracefully. */
const CatalogErrorBanner = () => {
  const { catalogError, retryCatalog } = useGame();
  if (!catalogError) return null;
  return (
    <div className="sticky top-0 z-50 bg-fox/15 border-b border-fox/40 text-fox text-sm px-4 py-2 flex items-center justify-center gap-3" data-testid="catalog-error-banner">
      <WifiOff className="w-4 h-4" />
      <span>{catalogError}</span>
      <button onClick={retryCatalog} data-testid="catalog-retry-button" className="underline hover:text-white transition-colors">Retry</button>
    </div>
  );
};

function Shell({ children, bare }) {
  const loc = useLocation();
  const hideBottomNav = loc.pathname === "/boss-hunt";
  const hideGameHud = loc.pathname === "/battle";
  if (bare) {
    return (
      <div className="App grain min-h-screen relative">
        <main className="relative z-10">{children}</main>
      </div>
    );
  }
  return (
    <div className="App grain min-h-screen relative overflow-hidden">
      <CatalogErrorBanner />
      {!hideGameHud && <GameHud />}
      <main
        className={`fixed inset-x-0 top-0 bottom-0 z-10 overflow-y-auto ${hideGameHud ? "" : "pt-[calc(var(--game-header-height)+var(--sat))]"} ${hideBottomNav ? "" : "pb-[calc(var(--game-nav-height)+var(--sab)+0.5rem)]"}`}
        data-testid="app-main"
      >
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

function Protected({ children, bare }) {
  const { user, loading, authError, retryAuth } = useAuth();
  const loc = useLocation();
  if (loading) return <LoadingScreen />;
  if (authError) return <ErrorScreen message={authError} onRetry={retryAuth} />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Shell bare={bare}>{children}</Shell>;
}

function PublicOnly({ children }) {
  const { user, loading, authError, retryAuth } = useAuth();
  if (loading) return <LoadingScreen />;
  if (authError) return <ErrorScreen message={authError} onRetry={retryAuth} />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user, loading, authError, retryAuth } = useAuth();
  if (loading) return <LoadingScreen />;
  if (authError) return <ErrorScreen message={authError} onRetry={retryAuth} />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <Shell>{children}</Shell>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/" element={<Protected><Lobby /></Protected>} />
      <Route path="/campaign" element={<Protected><Campaign /></Protected>} />
      <Route path="/battle" element={<Protected><BattleHub /></Protected>} />
      <Route path="/tsukuyomi" element={<Protected><Suspense fallback={<LoadingScreen />}><Tsukuyomi /></Suspense></Protected>} />
      <Route path="/shop" element={<Protected><Shop /></Protected>} />
      <Route path="/spire" element={<Protected><Spire /></Protected>} />
      <Route path="/arena" element={<Protected><Suspense fallback={<LoadingScreen />}><Arena /></Suspense></Protected>} />
      <Route path="/gallery" element={<Protected><Suspense fallback={<LoadingScreen />}><Gallery /></Suspense></Protected>} />
      <Route path="/roster" element={<Protected><TeamBuilder /></Protected>} />
      <Route path="/team" element={<Protected><TeamBuilder /></Protected>} />
      <Route path="/summon" element={<Protected><Summon /></Protected>} />
      <Route path="/forge" element={<Protected><Suspense fallback={<LoadingScreen />}><Forge /></Suspense></Protected>} />
      <Route path="/dungeons" element={<Protected><Dungeons /></Protected>} />
      <Route path="/boss-hunt" element={<Protected><Suspense fallback={<LoadingScreen />}><BossHunt /></Suspense></Protected>} />
      <Route path="/leaderboard" element={<Protected><Suspense fallback={<LoadingScreen />}><Leaderboard /></Suspense></Protected>} />
      <Route path="/admin" element={<AdminOnly><Suspense fallback={<LoadingScreen />}><Admin /></Suspense></AdminOnly>} />
      <Route path="/battle/:mode/:id" element={<Protected bare><Battle /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-center" richColors />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AudioProvider>
          <ServerGate>
            <AuthProvider>
              <GameProvider>
                <AppRoutes />
                <ThemedToaster />
              </GameProvider>
            </AuthProvider>
          </ServerGate>
        </AudioProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
