import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Pricing from "./pages/Pricing.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import AuditBundlesNew from "./pages/AuditBundlesNew.tsx";
import AuditHandHygieneNew from "./pages/AuditHandHygieneNew.tsx";
import AuditInfectionControlNew from "./pages/AuditInfectionControlNew.tsx";
import AuditDispenserNew from "./pages/AuditDispenserNew.tsx";
import AuditCTINew from "./pages/AuditCTINew.tsx";
import AuditAntibiogramNew from "./pages/AuditAntibiogramNew.tsx";
import DashboardBundles from "./pages/DashboardBundles.tsx";
import DashboardInfectionControl from "./pages/DashboardInfectionControl.tsx";
import DashboardHygiene from "./pages/DashboardHygiene.tsx";
import DashboardDispenser from "./pages/DashboardDispenser.tsx";
import DashboardStructure from "./pages/DashboardStructure.tsx";
import DashboardPrecautions from "./pages/DashboardPrecautions.tsx";
import DashboardAntimicrobials from "./pages/DashboardAntimicrobials.tsx";
import { AppLayout } from "./components/AppLayout.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          
          {/* Internal routes with sidebar layout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/audits/bundles/new" element={<AuditBundlesNew />} />
            <Route path="/audits/hand-hygiene/new" element={<AuditHandHygieneNew />} />
            <Route path="/audits/infection-control/new" element={<AuditInfectionControlNew />} />
            <Route path="/audits/dispenser/new" element={<AuditDispenserNew />} />
            <Route path="/audits/infrastructure/cti/new" element={<AuditCTINew />} />
            <Route path="/audits/antimicrobial-sensitivity/new" element={<AuditAntibiogramNew />} />
            <Route path="/dashboard/bundles-compliance" element={<DashboardBundles />} />
            <Route path="/dashboard/infection-control" element={<DashboardInfectionControl />} />
            <Route path="/hygiene/monitoring" element={<DashboardHygiene />} />
            <Route path="/dashboard/dispenser" element={<DashboardDispenser />} />
            <Route path="/dashboard/structure" element={<DashboardStructure />} />
            <Route path="/precautions/monitoring" element={<DashboardPrecautions />} />
            <Route path="/antimicrobials/monitoring" element={<DashboardAntimicrobials />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
