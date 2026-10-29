import { useState, useEffect, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LogOut, Settings, UserCircle, Trophy } from "lucide-react";
import { MeetingAlertsBell } from "@/components/MeetingAlertsBell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuthReady } from "@/hooks/useAuthReady";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CarregandoTela } from "@/components/CarregandoTela";
import { GamificacaoChip } from "@/components/gamificacao/GamificacaoChip";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  hospital_admin: "Administrador",
  nurse_ccih: "Enfermeiro(a) CCIH",
  doctor: "Médico(a)",
  lab_tech: "Técnico Lab.",
  viewer: "Visualizador",
};

export function AppLayout() {
  const navigate = useNavigate();
  const { user: authUser, isReady } = useAuthReady();
  const [profile, setProfile] = useState<{
    full_name: string;
    email: string;
    avatar_url?: string | null;
    roles: string[];
  } | null>(null);

  useEffect(() => {
    if (isReady && !authUser) {
      navigate("/login", { replace: true });
      return;
    }
    if (!authUser) return;

    const load = async () => {
      const [{ data: profileData }, { data: rolesData }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("user_id", authUser.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", authUser.id),
      ]);

      setProfile({
        full_name: profileData?.full_name || authUser.email || "Usuário",
        email: profileData?.email || authUser.email || "",
        avatar_url: authUser.user_metadata?.avatar_url || null,
        roles: (rolesData || []).map((r: { role: string }) => r.role),
      });
    };

    load();
  }, [authUser, isReady, navigate]);

  if (!isReady) {
    return (
      <CarregandoTela />
    );
  }

  if (!authUser) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/login", { replace: true });
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const primaryRole = profile?.roles?.[0];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col bg-background">
          <div className="app-aurora" aria-hidden />
          <div className="app-grid" aria-hidden />
          <header className="surface-glass sticky top-0 z-30 flex h-12 items-center justify-between border-x-0 border-t-0 px-3 md:h-14 md:px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="rounded-lg" />
              <span className="hidden items-center gap-2 sm:flex">
                <span className="live-dot" />
                <span className="label-mono text-muted-foreground">Sistema ativo</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <GamificacaoChip />
              <ThemeToggle />
              <MeetingAlertsBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 rounded-full px-1.5">
                    <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">
                      {profile?.full_name || "Carregando..."}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                        {primaryRole && (
                          <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
                            {ROLE_LABELS[primaryRole] || primaryRole}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
                      <UserCircle className="h-4 w-4 mr-2" />
                      Meu Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/conquistas")}>
                      <Trophy className="h-4 w-4 mr-2" />
                      Conquistas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="relative z-10 flex-1 overflow-auto p-2 sm:p-3 md:p-6">
            <Suspense fallback={<CarregandoTela />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
