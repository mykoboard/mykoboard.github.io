import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import Board from "./pages/Board";
import GameLobby from "./pages/GameLobby";
import GameSelection from "./pages/GameSelection";
import NotFound from "./pages/NotFound";
import { WalletGate } from "./components/WalletGate";
import { GameSessionProvider } from "./contexts/GameSessionContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/games" element={<WalletGate><GameSelection /></WalletGate>} />

          <Route
            element={
              <WalletGate>
                <GameSessionProvider>
                  <Outlet />
                </GameSessionProvider>
              </WalletGate>
            }
          >
            <Route path="/games/:gameId" element={<GameLobby />} />
            <Route path="/games/:gameId/:boardId" element={<Board />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
