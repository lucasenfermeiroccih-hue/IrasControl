import {
  LayoutDashboard, ClipboardCheck, Activity, Shield, Bell,
  FileText, Settings, Users, Microscope, Pill, HandMetal,
  MonitorCheck, Building2, ShoppingBag, Stethoscope, FlaskConical,
  BarChart3, FolderOpen, TrendingUp
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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

const navSections = [
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
      { title: "Antibiograma", url: "/audits/antimicrobial-sensitivity/new", icon: Microscope },
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
    label: "Admin",
    items: [
      { title: "Super Admin", url: "/super-admin", icon: Shield },
      { title: "Usuários", url: "/admin/users", icon: Users },
      { title: "Configurações", url: "/admin/settings", icon: Settings },
      { title: "CRM", url: "/crm", icon: Users },
      { title: "Marketplace", url: "/marketplace", icon: ShoppingBag },
      { title: "Perfil", url: "/settings/profile", icon: Users },
    ],
  },
];

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-sidebar-primary" />
          {!collapsed && <span className="text-lg font-bold text-sidebar-foreground">IRASControl</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section) => (
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
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/50">© 2026 IRASControl</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
