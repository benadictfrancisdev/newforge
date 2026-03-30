import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { OnboardingOverlay } from "@/components/onboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load all pages for code splitting
const SpaceBotWidget  = lazy(() => import("@/components/SpaceBotWidget"));
const Index           = lazy(() => import("./pages/Index"));
const DataAgent       = lazy(() => import("./pages/DataAgent"));
const Auth            = lazy(() => import("./pages/Auth"));
const Pricing         = lazy(() => import("./pages/Pricing"));
const CognitiveLanding = lazy(() => import("./pages/CognitiveLanding"));
const PersonaReports  = lazy(() => import("./pages/PersonaReports"));
const About           = lazy(() => import("./pages/About"));
const Privacy         = lazy(() => import("./pages/Privacy"));
const Terms           = lazy(() => import("./pages/Terms"));
const Docs            = lazy(() => import("./pages/Docs"));
const NotFound        = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary name="App">
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* BrowserRouter MUST wrap everything that uses useNavigate/useLocation */}
        <BrowserRouter>
          <AuthProvider>
            <OnboardingProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ErrorBoundary name="OnboardingOverlay">
                  <OnboardingOverlay />
                </ErrorBoundary>
                <ErrorBoundary name="SpaceBotWidget">
                  <Suspense fallback={null}>
                    <SpaceBotWidget />
                  </Suspense>
                </ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/"                element={<ErrorBoundary name="Home"><Index /></ErrorBoundary>} />
                    <Route path="/auth"            element={<ErrorBoundary name="Auth"><Auth /></ErrorBoundary>} />
                    <Route path="/data-agent"      element={<ErrorBoundary name="DataAgent"><DataAgent /></ErrorBoundary>} />
                    <Route path="/cognitive"       element={<ErrorBoundary name="Cognitive"><CognitiveLanding /></ErrorBoundary>} />
                    <Route path="/pricing"         element={<ErrorBoundary name="Pricing"><Pricing /></ErrorBoundary>} />
                    <Route path="/persona-reports" element={<ErrorBoundary name="PersonaReports"><PersonaReports /></ErrorBoundary>} />
                    <Route path="/about"           element={<ErrorBoundary name="About"><About /></ErrorBoundary>} />
                    <Route path="/privacy"         element={<ErrorBoundary name="Privacy"><Privacy /></ErrorBoundary>} />
                    <Route path="/terms"           element={<ErrorBoundary name="Terms"><Terms /></ErrorBoundary>} />
                    <Route path="/docs"            element={<ErrorBoundary name="Docs"><Docs /></ErrorBoundary>} />
                    <Route path="*"               element={<ErrorBoundary name="NotFound"><NotFound /></ErrorBoundary>} />
                  </Routes>
                </Suspense>
              </TooltipProvider>
            </OnboardingProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
