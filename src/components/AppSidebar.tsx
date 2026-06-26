import {
  LayoutDashboard, ClipboardCheck, Activity, Shield, Bell,
  FileText, Settings, Users, Microscope, Pill, HandMetal,
  MonitorCheck, Building2, ShoppingBag, Stethoscope, FlaskConical,
  BarChart3, FolderOpen, TrendingUp, Sparkles, Tag, ArrowLeftRight, Droplets,
  KanbanSquare, Package, ClipboardList, Puzzle, ExternalLink, ShieldCheck, ShieldAlert, HardHat,
  History,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Button } from "@/components/ui/button";
import { clearAllSelectedHospitalIds, getSelectedHospitalId } from "@/lib/selectedHospital";
import { openGuardiaoWithSSO } from "@/lib/guardiaoSSO";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const publicSections = [
  {
    label: "Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Alertas", url: "/alerts", icon: Bell },
    ],
  },
  {
    label: "Auditorias",
    items: [
      { title: "Bundles CVC/SVD", url: "/audits/bundles/new", icon: ClipboardCheck },
      { title: "Higiene das Mãos", url: "/audits/hand-hygiene/new", icon: HandMetal },
      { title: "Vigilância de Processos", url: "/audits/infection-control/new", icon: MonitorCheck },
      { title: "Dispensers", url: "/audits/dispenser/new", icon: FlaskConical },
      { title: "Infraestrutura CTI", url: "/audits/infrastructure/cti/new", icon: Building2 },
      { title: "Exames/Culturas", url: "/audits/antimicrobial-sensitivity/new", icon: Microscope },
      { title: "Obras/Reformas", url: "/audits/construction/new", icon: HardHat },
    ],
  },
  {
    label: "Monitoramento",
    items: [
      { title: "Pacientes", url: "/patients/monitoring", icon: Stethoscope },
      { title: "Antimicrobianos", url: "/antimicrobials/monitoring", icon: Pill },
      { title: "Higiene", url: "/hygiene/monitoring", icon: Activity },
      { title: "Indicadores", url: "/indicadores/new", icon: TrendingUp },
      { title: "Indicadores ISC", url: "/indicadores-isc", icon: ClipboardCheck },
      { title: "Indicadores DDD", url: "/indicadores-ddd", icon: Pill },
      { title: "Consumo H.M", url: "/audits/hand-hygiene/consumption/new", icon: HandMetal },
      { title: "Precauções", url: "/precautions/monitoring", icon: Shield },
      { title: "Mapeamento", url: "/precautions/mapping", icon: Shield },
      { title: "Alertas Surto", url: "/precautions/alertas-surto", icon: ShieldAlert },
    ],
  },
  {
    label: "Dashboards",
    items: [
      { title: "Bundles", url: "/dashboard/bundles-compliance", icon: BarChart3 },
      { title: "Vig. Processos", url: "/dashboard/infection-control", icon: Shield },
      { title: "Higiene", url: "/hygiene/monitoring", icon: HandMetal },
      { title: "Dispensers", url: "/dashboard/dispenser", icon: FlaskConical },
      { title: "Estrutura CTI", url: "/dashboard/structure", icon: Building2 },
      { title: "Precaução", url: "/precautions/monitoring", icon: Shield },
      { title: "Antimicrobianos", url: "/antimicrobials/monitoring", icon: Pill },
      { title: "Indicadores", url: "/indicadores/dashboard", icon: TrendingUp },
      { title: "Dashboard ISC", url: "/dashboard-isc", icon: BarChart3 },
      { title: "Dashboard DDD", url: "/dashboard-ddd", icon: Pill },
      { title: "Exames/Culturas", url: "/dashboard/antimicrobial-sensitivity", icon: Microscope },
      { title: "Consumo Higiene", url: "/hygiene/consumption-dashboard", icon: Droplets },
      { title: "Indicadores Pacientes", url: "/patients/dashboard-indicators", icon: Stethoscope },
      { title: "Obras/Reformas", url: "/dashboard/construction", icon: HardHat },
    ],
  },
  {
    label: "Investigação",
    items: [
      { title: "Casos CCIH", url: "/cases/investigation", icon: FileText },
      { title: "Lab. Results", url: "/laboratory-results", icon: Microscope },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { title: "Monitoramento Microorganismos", url: "/reports", icon: FileText },
      { title: "Analytics", url: "/reports/analytics", icon: BarChart3 },
      { title: "Formulários", url: "/forms", icon: FolderOpen },
    ],
  },
  {
    label: "IA",
    items: [
      { title: "Biblioteca de Agentes", url: "/agentes", icon: Sparkles },
    ],
  },
];

const adminSection = {
  label: "Admin",
  items: [
    { title: "Super Admin", url: "/super-admin", icon: Shield },
    { title: "Usuários", url: "/admin/users", icon: Users },
    { title: "Configurações", url: "/admin/settings", icon: Settings },
    { title: "CRM", url: "/crm", icon: Users },
    { title: "Marketplace", url: "/marketplace", icon: ShoppingBag },
    { title: "Planos", url: "/planos", icon: Tag },
    { title: "Perfil", url: "/settings/profile", icon: Users },
  ],
};

const userOnlySection = {
  label: "Conta",
  items: [
    { title: "Perfil", url: "/settings/profile", icon: Users },
  ],
};

interface InstalledTool { tool_id: string; name: string; route: string; icon_name: string; }
const SIDEBAR_ICON_MAP: Record<string, React.ElementType> = {
  ClipboardList, Shield, Package, Puzzle, BarChart3, FileText, Microscope,
};

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hospitalName, setHospitalName] = useState("");
  const [multiHospital, setMultiHospital] = useState(false);
  const [installedTools, setInstalledTools] = useState<InstalledTool[]>([]);

  useEffect(() => {
    if (!isReady || !user) return;

    const check = async () => {
      const [{ data: isSuperAdmin }, { data: isHospitalAdmin }, { data: memberships }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "hospital_admin" }),
        supabase.from("hospital_users").select("hospital_id").eq("user_id", user.id),
      ]);
      setIsAdmin(!!isSuperAdmin || !!isHospitalAdmin);
      setMultiHospital((memberships || []).length > 1);

      const selectedId = getSelectedHospitalId(user.id);
      if (selectedId) {
        const { data: hosp } = await supabase.from("hospitals").select("name").eq("id", selectedId).maybeSingle();
        if (hosp) setHospitalName(hosp.name);

        const { data: installs } = await supabase
          .from("hospital_tool_installations")
          .select("tool_id, marketplace_tools(name, route, icon_name)")
          .eq("hospital_id", selectedId)
          .eq("is_active", true);
        if (installs) {
          setInstalledTools(installs.map((i: any) => ({
            tool_id: i.tool_id,
            name: i.marketplace_tools?.name ?? i.tool_id,
            route: i.marketplace_tools?.route ?? `/tools/${i.tool_id}`,
            icon_name: i.marketplace_tools?.icon_name ?? "Package",
          })));
        }
      }
    };
    check();
  }, [user, isReady]);

  const beforeIA = publicSections.filter((s) => s.label !== "IA");
  const iaSection = publicSections.find((s) => s.label === "IA");
  const accountSection = isAdmin ? adminSection : userOnlySection;

  const renderSection = (section: typeof publicSections[0]) => (
    <SidebarGroup key={section.label}>
      <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                <NavLink to={item.url} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-sidebar-primary" />
          {!collapsed && <span className="text-lg font-bold text-sidebar-foreground">IRASControl</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Geral → Relatórios */}
        {beforeIA.map(renderSection)}

        {/* Qualidade — acima de IA */}
        <SidebarGroup>
          <SidebarGroupLabel>Qualidade</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/quality/5w2h"}>
                  <NavLink to="/quality/5w2h" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <ClipboardList className="mr-2 h-4 w-4 shrink-0 text-sidebar-primary" />
                    {!collapsed && <span>Planos 5W2H</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/kanban-ccih")} className="cursor-pointer hover:bg-sidebar-accent/50 w-full">
                  <KanbanSquare className="mr-2 h-4 w-4 shrink-0 text-sidebar-primary" />
                  {!collapsed && <span>Kanban CCIH</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Ferramentas instaladas */}
        {installedTools.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {installedTools.map(tool => {
                  const Icon = SIDEBAR_ICON_MAP[tool.icon_name] ?? Package;
                  return (
                    <SidebarMenuItem key={tool.tool_id}>
                      <SidebarMenuButton asChild isActive={location.pathname.startsWith(tool.route)}>
                        <NavLink to={tool.route} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                          <Icon className="mr-2 h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{tool.name}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Notificações ANVISA/PLACON */}
        <SidebarGroup>
          <SidebarGroupLabel>Notificações ANVISA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/notificacoes"}>
                  <NavLink to="/notificacoes" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <Bell className="mr-2 h-4 w-4 shrink-0" />
                    {!collapsed && <span>Notificações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/notificacoes/dashboard"}>
                  <NavLink to="/notificacoes/dashboard" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <BarChart3 className="mr-2 h-4 w-4 shrink-0" />
                    {!collapsed && <span>Dashboard ANVISA</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/notificacoes/historico"}>
                  <NavLink to="/notificacoes/historico" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <History className="mr-2 h-4 w-4 shrink-0" />
                    {!collapsed && <span>Histórico</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* IA */}
        {iaSection && renderSection(iaSection)}

        {/* Guardião Hospitalar */}
        <SidebarGroup>
          <SidebarGroupLabel>Integrações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => openGuardiaoWithSSO(getSelectedHospitalId(user?.id))}
                  className="cursor-pointer hover:bg-sidebar-accent/50 w-full"
                >
                  <ShieldCheck className="mr-2 h-4 w-4 shrink-0 text-emerald-600" />
                  {!collapsed && (
                    <span className="flex items-center gap-1 truncate">
                      Guardião Hospitalar
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin / Conta */}
        {renderSection(accountSection)}
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-2">
        {multiHospital && (
          <Button
            size="sm"
            className="w-full justify-start text-xs bg-warning text-warning-foreground hover:bg-warning/90 border-0"
            onClick={() => {
              clearAllSelectedHospitalIds(user?.id);
              navigate("/select-hospital");
            }}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            {!collapsed && (
              <span className="truncate">
                {hospitalName ? `Trocar (${hospitalName})` : "Trocar Hospital"}
              </span>
            )}
          </Button>
        )}
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/50">© 2026 IRASControl</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
