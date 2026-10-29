import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { lazyPage } from "@/lib/lazyPage";
import { CarregandoTela } from "@/components/CarregandoTela";
import { AppLayout } from "./components/AppLayout.tsx";
import { RequireSuperAdmin } from "./components/RequireSuperAdmin.tsx";
import { RequireAdmin } from "./components/RequireAdmin.tsx";
import { RequireHospitalAccess } from "./components/RequireHospitalAccess.tsx";
const Index = lazyPage(() => import("./pages/Index.tsx"));
const SelectHospital = lazyPage(() => import("./pages/SelectHospital.tsx"));
const Login = lazyPage(() => import("./pages/Login.tsx"));
const Register = lazyPage(() => import("./pages/Register.tsx"));
const ResetPassword = lazyPage(() => import("./pages/ResetPassword.tsx"));
const Pricing = lazyPage(() => import("./pages/Pricing.tsx"));
const Dashboard = lazyPage(() => import("./pages/Dashboard.tsx"));
const AuditBundlesNew = lazyPage(() => import("./pages/AuditBundlesNew.tsx"));
const AuditHandHygieneNew = lazyPage(() => import("./pages/AuditHandHygieneNew.tsx"));
const AuditInfectionControlNew = lazyPage(() => import("./pages/AuditInfectionControlNew.tsx"));
const AuditDispenserNew = lazyPage(() => import("./pages/AuditDispenserNew.tsx"));
const AuditCTINew = lazyPage(() => import("./pages/AuditCTINew.tsx"));
const AuditAntibiogramNew = lazyPage(() => import("./pages/AuditAntibiogramNew.tsx"));
const Reports = lazyPage(() => import("./pages/Reports.tsx"));
const CasesInvestigation = lazyPage(() => import("./pages/CasesInvestigation.tsx"));
const Alerts = lazyPage(() => import("./pages/Alerts.tsx"));
const LaboratoryResults = lazyPage(() => import("./pages/LaboratoryResults.tsx"));
const DashboardBundles = lazyPage(() => import("./pages/DashboardBundles.tsx"));
const DashboardInfectionControl = lazyPage(() => import("./pages/DashboardInfectionControl.tsx"));
const DashboardHygiene = lazyPage(() => import("./pages/DashboardHygiene.tsx"));
const DashboardDispenser = lazyPage(() => import("./pages/DashboardDispenser.tsx"));
const DashboardStructure = lazyPage(() => import("./pages/DashboardStructure.tsx"));
const DashboardPrecautions = lazyPage(() => import("./pages/DashboardPrecautions.tsx"));
const MapeamentoPrecaucao = lazyPage(() => import("./pages/MapeamentoPrecaucao.tsx"));
const AlertasSurto = lazyPage(() => import("./pages/AlertasSurto.tsx"));
const SCIHAuditModule = lazyPage(() => import("./pages/SCIHAuditModule.tsx"));
const DashboardAntimicrobials = lazyPage(() => import("./pages/DashboardAntimicrobials.tsx"));
const ReportsAnalytics = lazyPage(() => import("./pages/ReportsAnalytics.tsx"));
const Forms = lazyPage(() => import("./pages/Forms.tsx"));
const PatientsMonitoring = lazyPage(() => import("./pages/PatientsMonitoring.tsx"));
const AdminSettings = lazyPage(() => import("./pages/AdminSettings.tsx"));
const CRM = lazyPage(() => import("./pages/CRM.tsx"));
const Marketplace = lazyPage(() => import("./pages/Marketplace.tsx"));
const UserProfile = lazyPage(() => import("./pages/UserProfile.tsx"));
const SuperAdmin = lazyPage(() => import("./pages/SuperAdmin.tsx"));
const HospitalUsers = lazyPage(() => import("./pages/HospitalUsers.tsx"));
const IndicadoresNew = lazyPage(() => import("./pages/IndicadoresNew.tsx"));
const IndicadoresDashboard = lazyPage(() => import("./pages/IndicadoresDashboard.tsx"));
const IndicadoresISC = lazyPage(() => import("./pages/IndicadoresISC.tsx"));
const DashboardISC = lazyPage(() => import("./pages/DashboardISC.tsx"));
const IndicadoresDDD = lazyPage(() => import("./pages/IndicadoresDDD.tsx"));
const DashboardDDD = lazyPage(() => import("./pages/DashboardDDD.tsx"));
const DashboardAntibiogram = lazyPage(() => import("./pages/DashboardAntibiogram.tsx"));
const AgentLibrary = lazyPage(() => import("./pages/AgentLibrary.tsx"));
const AgentChat = lazyPage(() => import("./pages/AgentChat.tsx"));
const NotificacaoInvestigacaoCCIH = lazyPage(() => import("./pages/NotificacaoInvestigacaoCCIH.tsx"));
const CasesInvestigationAnalytics = lazyPage(() => import("./pages/CasesInvestigationAnalytics.tsx"));
const AuditHandHygieneConsumptionNew = lazyPage(() => import("./pages/AuditHandHygieneConsumptionNew.tsx"));
const HygieneConsumptionDashboard = lazyPage(() => import("./pages/HygieneConsumptionDashboard.tsx"));
const PatientDashboardIndicators = lazyPage(() => import("./pages/PatientDashboardIndicators.tsx"));
const KanbanCCIH = lazyPage(() => import("./pages/KanbanCCIH.tsx"));
const Conquistas = lazyPage(() => import("./pages/Conquistas.tsx"));
const AuditSectorNew = lazyPage(() => import("./pages/AuditSectorNew.tsx"));
const AuditConstructionNew = lazyPage(() => import("./pages/AuditConstructionNew.tsx"));
const DashboardConstruction = lazyPage(() => import("./pages/DashboardConstruction.tsx"));
const Planos5W2H = lazyPage(() => import("./pages/Planos5W2H.tsx"));
const NotificacoesPage = lazyPage(() => import("./pages/NotificacoesPage.tsx"));
const NotificacaoNew = lazyPage(() => import("./pages/NotificacaoNew.tsx"));
const NotificacoesHistory = lazyPage(() => import("./pages/NotificacoesHistory.tsx"));
const NotificacoesDashboard = lazyPage(() => import("./pages/NotificacoesDashboard.tsx"));
const NotFound = lazyPage(() => import("./pages/NotFound.tsx"));
const Maternidade = lazyPage(() => import("./pages/Maternidade.tsx"));
const MaternityDashboard = lazyPage(() => import("./pages/MaternityDashboard.tsx"));
const MaternityMonthlyForm = lazyPage(() => import("./pages/MaternityMonthlyForm.tsx"));
const MaternityActionPlan = lazyPage(() => import("./pages/MaternityActionPlan.tsx"));
const MaternityReport = lazyPage(() => import("./pages/MaternityReport.tsx"));
const ProtocolosIA = lazyPage(() => import("./pages/ProtocolosIA.tsx"));
const ReunioesMeetingsModule = lazyPage(() => import("./pages/ReunioesMeetingsModule.tsx"));
const PermissoesUsuarios = lazyPage(() => import("./pages/PermissoesUsuarios.tsx"));
const PatientAuditLog = lazyPage(() => import("./pages/PatientAuditLog.tsx"));
const HLDashboard = lazyPage(() => import("./modules/hygiene-logistics/pages/HLDashboard.tsx"));
const HLStock = lazyPage(() => import("./modules/hygiene-logistics/pages/HLStock.tsx"));
const HLProducts = lazyPage(() => import("./modules/hygiene-logistics/pages/HLProducts.tsx"));
const HLMonthlyOrder = lazyPage(() => import("./modules/hygiene-logistics/pages/HLMonthlyOrder.tsx"));
const HLResupplyMatrix = lazyPage(() => import("./modules/hygiene-logistics/pages/HLResupplyMatrix.tsx"));
const HLAbcCurve = lazyPage(() => import("./modules/hygiene-logistics/pages/HLAbcCurve.tsx"));
const HLSawtooth = lazyPage(() => import("./modules/hygiene-logistics/pages/HLSawtooth.tsx"));
const HLStockEntry = lazyPage(() => import("./modules/hygiene-logistics/pages/HLStockEntry.tsx"));
const HLSectorOutput = lazyPage(() => import("./modules/hygiene-logistics/pages/HLSectorOutput.tsx"));
const HLEquipmentInventory = lazyPage(() => import("./modules/hygiene-logistics/pages/HLEquipmentInventory.tsx"));
const HLCleaningSchedule = lazyPage(() => import("./modules/hygiene-logistics/pages/HLCleaningSchedule.tsx"));
const HLCleaningAudit = lazyPage(() => import("./modules/hygiene-logistics/pages/HLCleaningAudit.tsx"));
const HLNonconformities = lazyPage(() => import("./modules/hygiene-logistics/pages/HLNonconformities.tsx"));
const HLReports = lazyPage(() => import("./modules/hygiene-logistics/pages/HLReports.tsx"));
const HLSettings = lazyPage(() => import("./modules/hygiene-logistics/pages/HLSettings.tsx"));
const HLOrderSchedule = lazyPage(() => import("./modules/hygiene-logistics/pages/HLOrderSchedule.tsx"));
const HLValueGrid = lazyPage(() => import("./modules/hygiene-logistics/pages/HLValueGrid.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="irascontrol-tema" disableTransitionOnChange>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<CarregandoTela />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/select-hospital" element={<SelectHospital />} />
          
          {/* Internal routes with sidebar layout */}
          <Route element={<RequireHospitalAccess />}>
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
              <Route path="/precautions/mapping" element={<MapeamentoPrecaucao />} />
              <Route path="/precautions/alertas-surto" element={<AlertasSurto />} />
              <Route path="/tools/scih-audits" element={<SCIHAuditModule />} />
              <Route path="/antimicrobials/monitoring" element={<DashboardAntimicrobials />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/cases/investigation" element={<CasesInvestigation />} />
              <Route path="/cases/investigation/analytics" element={<CasesInvestigationAnalytics />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/laboratory-results" element={<LaboratoryResults />} />
              <Route path="/reports/analytics" element={<ReportsAnalytics />} />
              <Route path="/forms" element={<Forms />} />
              <Route path="/patients/dashboard-indicators" element={<PatientDashboardIndicators />} />
              <Route path="/patients/monitoring" element={<PatientsMonitoring />} />
              <Route path="/patients/audit-log" element={<PatientAuditLog />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/users" element={<HospitalUsers />} />
                <Route path="/admin/permissoes" element={<PermissoesUsuarios />} />
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
              <Route path="/audits/hand-hygiene/consumption/new" element={<AuditHandHygieneConsumptionNew />} />
              <Route path="/hygiene/consumption-dashboard" element={<HygieneConsumptionDashboard />} />
              <Route path="/kanban-ccih" element={<KanbanCCIH />} />
              <Route path="/conquistas" element={<Conquistas />} />
              <Route path="/quality/5w2h" element={<Planos5W2H />} />
              <Route path="/audits/sector/new" element={<AuditSectorNew />} />
              <Route path="/audits/construction/new" element={<AuditConstructionNew />} />
              <Route path="/dashboard/construction" element={<DashboardConstruction />} />
              <Route path="/notificacoes" element={<NotificacoesPage />} />
              <Route path="/notificacoes/nova/:typeId" element={<NotificacaoNew />} />
              <Route path="/notificacoes/:id/editar" element={<NotificacaoNew />} />
              <Route path="/notificacoes/historico" element={<NotificacoesHistory />} />
              <Route path="/notificacoes/dashboard" element={<NotificacoesDashboard />} />
              <Route path="/maternidade" element={<Maternidade />} />
              <Route path="/maternidade/dashboard" element={<MaternityDashboard />} />
              <Route path="/maternidade/lancamento" element={<MaternityMonthlyForm />} />
              <Route path="/maternidade/plano-acao" element={<MaternityActionPlan />} />
              <Route path="/maternidade/relatorio" element={<MaternityReport />} />
              <Route path="/protocolos-ia" element={<ProtocolosIA />} />
              <Route path="/reunioes-atas" element={<ReunioesMeetingsModule />} />
              <Route path="/hygiene-logistics/dashboard" element={<HLDashboard />} />
              <Route path="/hygiene-logistics/stock" element={<HLStock />} />
              <Route path="/hygiene-logistics/products" element={<HLProducts />} />
              <Route path="/hygiene-logistics/monthly-order" element={<HLMonthlyOrder />} />
              <Route path="/hygiene-logistics/resupply-matrix" element={<HLResupplyMatrix />} />
              <Route path="/hygiene-logistics/abc-curve" element={<HLAbcCurve />} />
              <Route path="/hygiene-logistics/sawtooth" element={<HLSawtooth />} />
              <Route path="/hygiene-logistics/sawtooth/:productId" element={<HLSawtooth />} />
              <Route path="/hygiene-logistics/stock-entry" element={<HLStockEntry />} />
              <Route path="/hygiene-logistics/sector-output" element={<HLSectorOutput />} />
              <Route path="/hygiene-logistics/equipment-inventory" element={<HLEquipmentInventory />} />
              <Route path="/hygiene-logistics/cleaning-schedule" element={<HLCleaningSchedule />} />
              <Route path="/hygiene-logistics/cleaning-audit" element={<HLCleaningAudit />} />
              <Route path="/hygiene-logistics/nonconformities" element={<HLNonconformities />} />
              <Route path="/hygiene-logistics/reports" element={<HLReports />} />
              <Route path="/hygiene-logistics/settings" element={<HLSettings />} />
              <Route path="/hygiene-logistics/order-schedule" element={<HLOrderSchedule />} />
              <Route path="/hygiene-logistics/value-grid" element={<HLValueGrid />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
