import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/hooks/useAppConfig";
import { Suspense, lazy, Component, type ReactNode } from "react";

// Eager — critical path pages
import Index from "./pages/Index";
import Landing from "./pages/Landing";

// Lazy — loaded only when navigated to
const Auth = lazy(() => import("./pages/Auth"));
const ParcelAudit = lazy(() => import("./pages/ParcelAudit"));
const ParcelAudit2 = lazy(() => import("./pages/ParcelAudit2"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Login = lazy(() => import("./pages/login"));
const Account = lazy(() => import("./pages/Account"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("App error boundary caught:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <p style={{ fontSize: 16, color: "#333" }}>Įvyko klaida. Pabandykite atnaujinti puslapį.</p>
          <button onClick={() => window.location.reload()} style={{ background: "#1a9e6e", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14 }}>Atnaujinti</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppConfigProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTopColor: "#1a9e6e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>}>
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
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AppConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;