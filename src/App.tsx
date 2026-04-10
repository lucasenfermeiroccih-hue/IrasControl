import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import SelectHospital from "./pages/SelectHospital.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Pricing from "./pages/Pricing.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import AuditBundlesNew from "./pages/AuditBundlesNew.tsx";
import AuditHandHygieneNew from "./pages/AuditHandHygieneNew.tsx";
import AuditInfectionControlNew from "./pages/AuditInfectionControlNew.tsx";
import AuditDispenserNew from "./pages/AuditDispenserNew.tsx";
import AuditCTINew from "./pages/AuditCTINew.tsx";
import AuditAntibiogramNew from "./pages/AuditAntibiogramNew.tsx";
import Reports from "./pages/Reports.tsx";
import CasesInvestigation from "./pages/CasesInvestigation.tsx";
import Alerts from "./pages/Alerts.tsx";
import LaboratoryResults from "./pages/LaboratoryResults.tsx";
import DashboardBundles from "./pages/DashboardBundles.tsx";
import DashboardInfectionControl from "./pages/DashboardInfectionControl.tsx";
import DashboardHygiene from "./pages/DashboardHygiene.tsx";
import DashboardDispenser from "./pages/DashboardDispenser.tsx";
import DashboardStructure from "./pages/DashboardStructure.tsx";
import DashboardPrecautions from "./pages/DashboardPrecautions.tsx";
import DashboardAntimicrobials from "./pages/DashboardAntimicrobials.tsx";
import ReportsAnalytics from "./pages/ReportsAnalytics.tsx";
import Forms from "./pages/Forms.tsx";
import PatientsMonitoring from "./pages/PatientsMonitoring.tsx";
import AdminSettings from "./pages/AdminSettings.tsx";
import CRM from "./pages/CRM.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import UserProfile from "./pages/UserProfile.tsx";
import SuperAdmin from "./pages/SuperAdmin.tsx";
import HospitalUsers from "./pages/HospitalUsers.tsx";
import IndicadoresNew from "./pages/IndicadoresNew.tsx";
import IndicadoresDashboard from "./pages/IndicadoresDashboard.tsx";
import IndicadoresISC from "./pages/IndicadoresISC.tsx";
import DashboardISC from "./pages/DashboardISC.tsx";
import IndicadoresDDD from "./pages/IndicadoresDDD.tsx";
import DashboardDDD from "./pages/DashboardDDD.tsx";
import DashboardAntibiogram from "./pages/DashboardAntibiogram.tsx";
import AgentLibrary from "./pages/AgentLibrary.tsx";
import AgentChat from "./pages/AgentChat.tsx";
import NotificacaoInvestigacaoCCIH from "./pages/NotificacaoInvestigacaoCCIH.tsx";
import { AppLayout } from "./components/AppLayout.tsx";
import { RequireSuperAdmin } from "./components/RequireSuperAdmin.tsx";
import { RequireAdmin } from "./components/RequireAdmin.tsx";
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
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/select-hospital" element={<SelectHospital />} />
          
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
            <Route path="/reports" element={<Reports />} />
            <Route path="/cases/investigation" element={<CasesInvestigation />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/laboratory-results" element={<LaboratoryResults />} />
            <Route path="/reports/analytics" element={<ReportsAnalytics />} />
            <Route path="/forms" element={<Forms />} />
            <Route path="/patients/monitoring" element={<PatientsMonitoring />} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/users" element={<HospitalUsers />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/planos" element={<Pricing />} />
            </Route>
            <Route element={<RequireSuperAdmin />}>
              <Route path="/super-admin" element={<SuperAdmin />} />
            </Route>
            <Route path="/settings/profile" element={<UserProfile />} />
            <Route path="/indicadores/new" element={<IndicadoresNew />} />
            <Route path="/indicadores/dashboard" element={<IndicadoresDashboard />} />
            <Route path="/indicadores-isc" element={<IndicadoresISC />} />
            <Route path="/dashboard-isc" element={<DashboardISC />} />
            <Route path="/indicadores-ddd" element={<IndicadoresDDD />} />
            <Route path="/dashboard-ddd" element={<DashboardDDD />} />
            <Route path="/dashboard/antimicrobial-sensitivity" element={<DashboardAntibiogram />} />
            <Route path="/agentes" element={<AgentLibrary />} />
            <Route path="/chat/:agentId" element={<AgentChat />} />
            <Route path="/notificacao-investigacao-ccih" element={<NotificacaoInvestigacaoCCIH />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
