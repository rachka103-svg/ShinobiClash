import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Swords, WifiOff, RotateCw } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GameProvider, useGame } from "@/context/GameContext";
import GameHud from "@/components/GameHud";
import BottomNav from "@/components/BottomNav";
import Login from "@/pages/Login";
import Lobby from "@/pages/Lobby";
import Campaign from "@/pages/Campaign";
import TeamBuilder from "@/pages/TeamBuilder";
import Summon from "@/pages/Summon";
import Leaderboard from "@/pages/Leaderboard";
import Battle from "@/pages/Battle";
import Spire from "@/pages/Spire";
import Gallery from "@/pages/Gallery";
import Admin from "@/pages/Admin";
import Arena from "@/pages/Arena";
import Forge from "@/pages/Forge";
import Dungeons from "@/pages/Dungeons";
import BattleHub from "@/pages/BattleHub";
import Tsukuyomi from "@/pages/Tsukuyomi";
import Shop from "@/pages/Shop";

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
      <GameHud />
      <main
        className="fixed inset-x-0 top-0 bottom-0 z-10 overflow-y-auto pt-[calc(3.25rem+env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
        data-testid="app-main"
      >
        {children}
      </main>
      <BottomNav />
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
      <Route path="/tsukuyomi" element={<Protected><Tsukuyomi /></Protected>} />
      <Route path="/shop" element={<Protected><Shop /></Protected>} />
      <Route path="/spire" element={<Protected><Spire /></Protected>} />
      <Route path="/arena" element={<Protected><Arena /></Protected>} />
      <Route path="/gallery" element={<Protected><Gallery /></Protected>} />
      <Route path="/roster" element={<Protected><TeamBuilder /></Protected>} />
      <Route path="/team" element={<Protected><TeamBuilder /></Protected>} />
      <Route path="/summon" element={<Protected><Summon /></Protected>} />
      <Route path="/forge" element={<Protected><Forge /></Protected>} />
      <Route path="/dungeons" element={<Protected><Dungeons /></Protected>} />
      <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
      <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
      <Route path="/battle/:mode/:id" element={<Protected bare><Battle /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <AppRoutes />
          <Toaster theme="dark" position="top-center" richColors />
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
