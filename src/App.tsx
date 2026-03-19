import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/hooks/useAppConfig";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import ParcelAudit from "./pages/ParcelAudit";
import ParcelAudit2 from "./pages/ParcelAudit2";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/login";
import Account from "./pages/Account";
import AdminAnalytics from "./pages/AdminAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppConfigProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/map" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auditas" element={<ParcelAudit />} />
              <Route path="/auditas2" element={<ParcelAudit2 />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/login" element={<Login />} />
              <Route path="/account" element={<Account />} />
              <Route path="/analytics" element={<AdminAnalytics />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppConfigProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
