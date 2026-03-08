import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Players from "./pages/Players";
import Teams from "./pages/Teams";
import Championship from "./pages/Championship";
import Cups from "./pages/Cups";
import LiveScore from "./pages/LiveScore";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/live" element={<Layout><LiveScore /></Layout>} />
          <Route path="/" element={<Layout><Players /></Layout>} />
          <Route path="/times" element={<Layout><Teams /></Layout>} />
          <Route path="/campeonato" element={<Layout><Championship /></Layout>} />
          <Route path="/copas" element={<Layout><Cups /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;