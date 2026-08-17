import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Swords } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GameProvider } from "@/context/GameContext";
import { TopBar } from "@/components/TopBar";
import Login from "@/pages/Login";
import Lobby from "@/pages/Lobby";
import Campaign from "@/pages/Campaign";
import Roster from "@/pages/Roster";
import TeamBuilder from "@/pages/TeamBuilder";
import Summon from "@/pages/Summon";
import Leaderboard from "@/pages/Leaderboard";
import Battle from "@/pages/Battle";
import Spire from "@/pages/Spire";
import Gallery from "@/pages/Gallery";
import Admin from "@/pages/Admin";
import Arena from "@/pages/Arena";

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#05050A]" data-testid="loading-screen">
    <Swords className="w-10 h-10 text-chakra animate-pulse" />
    <p className="font-display text-2xl tracking-widest text-slate-500">LOADING…</p>
  </div>
);

function Shell({ children, bare }) {
  return (
    <div className="App grain min-h-screen relative">
      {!bare && <TopBar />}
      <main className="relative z-10">{children}</main>
    </div>
  );
}

function Protected({ children, bare }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Shell bare={bare}>{children}</Shell>;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
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
      <Route path="/spire" element={<Protected><Spire /></Protected>} />
      <Route path="/arena" element={<Protected><Arena /></Protected>} />
      <Route path="/gallery" element={<Protected><Gallery /></Protected>} />
      <Route path="/roster" element={<Protected><Roster /></Protected>} />
      <Route path="/team" element={<Protected><TeamBuilder /></Protected>} />
      <Route path="/summon" element={<Protected><Summon /></Protected>} />
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
