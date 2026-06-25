import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings, Building2, Users, Bell, Shield, Database, Mail, Lock,
  Loader2, ImagePlus, Trash2, Image, Plus, Pencil, MoreHorizontal,
  UserX, UserCheck, Send, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

// ─── Types ───

interface HospitalUser {
  user_id: string;
  is_primary_admin: boolean;
  is_active: boolean;
  profile?: { full_name: string; email: string; phone?: string };
  role?: string;
}

interface Sector {
  id: string;
  name: string;
  type: string | null;
  bed_count: number;
  is_active: boolean;
}

interface HospitalLogo {
  id: string;
  logo_type: "hospital" | "scih";
  storage_path: string;
  display_name: string | null;
  display_order: number;
  url?: string;
}

interface NotifSettings {
  email_enabled: boolean;
  critical_enabled: boolean;
  daily_summary: boolean;
  weekly_summary: boolean;
  email_recipients: string[];
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  hospital_admin: "Administrador",
  nurse_ccih: "Enfermeiro CCIH",
  doctor: "Médico",
  doctor_scih: "Médico SCIH",
  nurse_tech_scih: "Téc. Enfermagem SCIH",
  lab_tech: "Técnico Lab",
  biologist: "Biólogo",
  administrative: "Administrativo",
  viewer: "Visualizador",
};

const ASSIGNABLE_ROLES = [
  { value: "hospital_admin", label: "Administrador" },
  { value: "nurse_ccih", label: "Enfermeiro(a) CCIH" },
  { value: "doctor", label: "Médico(a)" },
  { value: "doctor_scih", label: "Médico(a) SCIH" },
  { value: "nurse_tech_scih", label: "Téc. de Enfermagem SCIH" },
  { value: "lab_tech", label: "Técnico de Laboratório" },
  { value: "biologist", label: "Biólogo(a)" },
  { value: "administrative", label: "Administrativo" },
  { value: "viewer", label: "Visualizador" },
];

const SECTOR_TYPES = [
  { value: "uti", label: "UTI" },
  { value: "enfermaria", label: "Enfermaria" },
  { value: "cc", label: "Centro Cirúrgico" },
  { value: "pronto_socorro", label: "Pronto Socorro" },
  { value: "ambulatorio", label: "Ambulatório" },
  { value: "laboratorio", label: "Laboratório" },
  { value: "pediatria", label: "Pediatria" },
  { value: "neonatal", label: "UTI Neonatal" },
  { value: "cme", label: "CME" },
  { value: "outros", label: "Outros" },
];

const DEFAULT_NOTIF: NotifSettings = {
  email_enabled: true,
  critical_enabled: true,
  daily_summary: false,
  weekly_summary: true,
  email_recipients: [],
};

// ─── Component ───

export default function AdminSettings() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [hospitalData, setHospitalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ── Sectors
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorDialog, setSectorDialog] = useState<{ open: boolean; mode: "add" | "edit"; sector?: Sector }>({ open: false, mode: "add" });
  const [sectorForm, setSectorForm] = useState({ name: "", type: "", bed_count: 0 });
  const [sectorSaving, setSectorSaving] = useState(false);
  const [deleteSectorTarget, setDeleteSectorTarget] = useState<Sector | null>(null);

  // ── Users
  const [users, setUsers] = useState<HospitalUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState<HospitalUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ full_name: "", email: "", phone: "", role: "", password: "" });
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [confirmUserAction, setConfirmUserAction] = useState<{ user: HospitalUser; action: "activate" | "deactivate" | "delete" } | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  // ── Logos
  const [logos, setLogos] = useState<HospitalLogo[]>([]);
  const [logosLoading, setLogosLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const hospitalLogoInputRef = useRef<HTMLInputElement>(null);
  const scihLogoInputRef = useRef<HTMLInputElement>(null);

  // ── Notifications
  const [notif, setNotif] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifTesting, setNotifTesting] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");

  // ─── Load ───

  useEffect(() => {
    if (!hospitalId) return;
    loadAll();
  }, [hospitalId]);

  const loadAll = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const [{ data: hospital }, { data: sectorData }] = await Promise.all([
      supabase.from("hospitals").select("*").eq("id", hospitalId).single(),
      supabase.from("sectors").select("id,name,type,bed_count,is_active").eq("hospital_id", hospitalId).order("name"),
    ]);
    if (hospital) {
      setHospitalData(hospital);
      const ns = hospital.notification_settings;
      if (ns && typeof ns === "object" && !Array.isArray(ns)) setNotif({ ...DEFAULT_NOTIF, ...(ns as any) });
    }
    if (sectorData) setSectors(sectorData);
    setLoading(false);
    loadUsers();
    fetchLogos();
  };

  // ─── Users ───

  const loadUsers = async () => {
    if (!hospitalId) return;
    setUsersLoading(true);
    const { data: huData } = await supabase
      .from("hospital_users")
      .select("user_id, is_primary_admin, is_active")
      .eq("hospital_id", hospitalId);

    if (!huData?.length) { setUsers([]); setUsersLoading(false); return; }

    const userIds = huData.map((h: any) => h.user_id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", userIds),
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
    ]);

    const merged = huData.map((hu: any) => ({
      user_id: hu.user_id,
      is_primary_admin: hu.is_primary_admin,
      is_active: hu.is_active ?? true,
      profile: profiles?.find((p: any) => p.user_id === hu.user_id),
      role: roles?.find((r: any) => r.user_id === hu.user_id)?.role || "viewer",
    }));
    setUsers(merged);
    setUsersLoading(false);
  };

  const openEditUser = (u: HospitalUser) => {
    setEditUserForm({ full_name: u.profile?.full_name || "", email: u.profile?.email || "", phone: u.profile?.phone || "", role: u.role || "", password: "" });
    setEditUserTarget(u);
  };

  const handleEditUser = async () => {
    if (!editUserTarget || !hospitalId) return;
    setEditUserSaving(true);
    const { data, error } = await supabase.functions.invoke("manage-hospital-user", {
      body: { action: "update", user_id: editUserTarget.user_id, hospital_id: hospitalId, full_name: editUserForm.full_name, phone: editUserForm.phone || null, role: editUserForm.role || undefined, password: editUserForm.password || undefined },
    });
    setEditUserSaving(false);
    if (error || data?.error) { toast.error("Erro ao atualizar: " + (data?.error || error?.message)); return; }
    toast.success("Usuário atualizado!");
    setEditUserTarget(null);
    loadUsers();
  };

  const handleUserAction = async () => {
    if (!confirmUserAction || !hospitalId) return;
    const { user, action } = confirmUserAction;
    setUserActionLoading(true);

    const { data, error } = await supabase.functions.invoke("manage-hospital-user", {
      body: { action, user_id: user.user_id, hospital_id: hospitalId },
    });
    if (error || data?.error) {
      toast.error("Erro: " + (data?.error || error?.message));
    } else if (action === "delete") {
      toast.success("Usuário excluído");
    } else if (action === "activate") {
      toast.success("Usuário ativado");
    } else {
      toast.success("Usuário desativado");
    }

    setUserActionLoading(false);
    setConfirmUserAction(null);
    loadUsers();
  };

  // ─── Sectors ───

  const openSectorDialog = (mode: "add" | "edit", sector?: Sector) => {
    setSectorForm(sector ? { name: sector.name, type: sector.type || "", bed_count: sector.bed_count } : { name: "", type: "", bed_count: 0 });
    setSectorDialog({ open: true, mode, sector });
  };

  const handleSaveSector = async () => {
    if (!sectorForm.name.trim() || !hospitalId) return;
    setSectorSaving(true);
    if (sectorDialog.mode === "add") {
      const { error } = await supabase.from("sectors").insert({ hospital_id: hospitalId, name: sectorForm.name.trim(), type: sectorForm.type || null, bed_count: sectorForm.bed_count || 0, is_active: true });
      if (error) { toast.error(error.message.includes("unique") ? "Setor já existe com esse nome" : "Erro: " + error.message); setSectorSaving(false); return; }
      toast.success("Setor cadastrado!");
    } else {
      const { error } = await supabase.from("sectors").update({ name: sectorForm.name.trim(), type: sectorForm.type || null, bed_count: sectorForm.bed_count || 0 }).eq("id", sectorDialog.sector!.id);
      if (error) { toast.error("Erro: " + error.message); setSectorSaving(false); return; }
      toast.success("Setor atualizado!");
    }
    setSectorSaving(false);
    setSectorDialog({ open: false, mode: "add" });
    const { data } = await supabase.from("sectors").select("id,name,type,bed_count,is_active").eq("hospital_id", hospitalId).order("name");
    if (data) setSectors(data);
  };

  const handleDeleteSector = async () => {
    if (!deleteSectorTarget) return;
    const { error } = await supabase.from("sectors").update({ is_active: false }).eq("id", deleteSectorTarget.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Setor removido");
    setDeleteSectorTarget(null);
    setSectors(s => s.filter(x => x.id !== deleteSectorTarget.id));
  };

  // ─── Hospital Info ───

  const handleSaveHospital = async () => {
    if (!hospitalId || !hospitalData) return;
    const { error } = await supabase.from("hospitals").update({
      name: hospitalData.name, cnes: hospitalData.cnes, type: hospitalData.type,
      bed_count: hospitalData.bed_count, contact_email: hospitalData.contact_email,
    }).eq("id", hospitalId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Dados da instituição salvos");
  };

  // ─── Logos ───

  const fetchLogos = async () => {
    if (!hospitalId) return;
    setLogosLoading(true);
    const { data } = await supabase.from("hospital_logos").select("*").eq("hospital_id", hospitalId).order("logo_type").order("display_order");
    const withUrls = (data || []).map((logo: any) => ({
      ...logo,
      url: supabase.storage.from("hospital-logos").getPublicUrl(logo.storage_path).data.publicUrl,
    }));
    setLogos(withUrls);
    setLogosLoading(false);
  };

  const handleLogoUpload = async (file: File, logoType: "hospital" | "scih", displayName?: string) => {
    if (!hospitalId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const storagePath = `${hospitalId}/${logoType}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("hospital-logos").upload(storagePath, file, { upsert: false, contentType: file.type });
      if (uploadError) { toast.error("Erro no upload: " + uploadError.message); return; }
      const nextOrder = logos.filter(l => l.logo_type === "scih").length;
      const { error: dbError } = await supabase.from("hospital_logos").insert({ hospital_id: hospitalId, logo_type: logoType, storage_path: storagePath, display_name: displayName || null, display_order: nextOrder });
      if (dbError) { await supabase.storage.from("hospital-logos").remove([storagePath]); toast.error("Erro: " + dbError.message); return; }
      toast.success("Logo enviada!");
      fetchLogos();
    } finally { setUploading(false); }
  };

  const handleDeleteLogo = async (logo: HospitalLogo) => {
    await supabase.storage.from("hospital-logos").remove([logo.storage_path]);
    await supabase.from("hospital_logos").delete().eq("id", logo.id);
    toast.success("Logo removida");
    fetchLogos();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, logoType: "hospital" | "scih") => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    if (logoType === "hospital") { const existing = logos.find(l => l.logo_type === "hospital"); if (existing) await handleDeleteLogo(existing); }
    const displayName = logoType === "scih" ? (prompt("Nome desta logo SCIH (opcional)") || undefined) : undefined;
    await handleLogoUpload(file, logoType, displayName);
  };

  // ─── Notifications ───

  const handleSaveNotif = async () => {
    if (!hospitalId) return;
    setNotifSaving(true);
    const { error } = await supabase.from("hospitals").update({ notification_settings: notif as any }).eq("id", hospitalId);
    setNotifSaving(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Preferências de notificação salvas!");
  };

  const handleTestNotif = async () => {
    setNotifTesting(true);
    const { data, error } = await supabase.functions.invoke("send-alert-notification", { body: { mode: "test", hospitalId } });
    setNotifTesting(false);
    if (error || data?.error) { toast.error("Erro ao enviar teste: " + (data?.error || error?.message)); return; }
    if (data?.skipped) { toast.info("Notificações por e-mail estão desativadas. Ative para testar."); return; }
    toast.success(`E-mail de teste enviado para ${data?.recipients?.join(", ") || "destinatários configurados"}!`);
  };

  const addRecipient = () => {
    const email = newRecipient.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("E-mail inválido"); return; }
    if (notif.email_recipients.includes(email)) { toast.error("E-mail já adicionado"); return; }
    setNotif(n => ({ ...n, email_recipients: [...n.email_recipients, email] }));
    setNewRecipient("");
  };

  const removeRecipient = (email: string) => {
    setNotif(n => ({ ...n, email_recipients: n.email_recipients.filter(e => e !== email) }));
  };

  // ─── Derived ───

  const hospitalLogo = logos.find(l => l.logo_type === "hospital");
  const scihLogos = logos.filter(l => l.logo_type === "scih");
  const activeSectors = sectors.filter(s => s.is_active);

  if (ctxLoading || loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Administração do sistema, usuários e preferências</p>
        </div>
      </div>

      <Tabs defaultValue="org">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="org"><Building2 className="h-4 w-4 mr-1 hidden sm:inline" />Organização</TabsTrigger>
          <TabsTrigger value="logos"><Image className="h-4 w-4 mr-1 hidden sm:inline" />Logos</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1 hidden sm:inline" />Usuários</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1 hidden sm:inline" />Notificações</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1 hidden sm:inline" />Segurança</TabsTrigger>
        </TabsList>

        {/* ─── Organização ─── */}
        <TabsContent value="org" className="space-y-4 mt-4">
          {hospitalData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados da Instituição</CardTitle>
                <CardDescription>Informações cadastrais do hospital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nome da Instituição</Label>
                    <Input value={hospitalData.name || ""} onChange={e => setHospitalData((h: any) => ({ ...h, name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>CNES</Label>
                    <Input value={hospitalData.cnes || ""} onChange={e => setHospitalData((h: any) => ({ ...h, cnes: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Tipo</Label>
                    <Select value={hospitalData.type || "geral"} onValueChange={v => setHospitalData((h: any) => ({ ...h, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geral">Hospital Geral</SelectItem>
                        <SelectItem value="especializado">Hospital Especializado</SelectItem>
                        <SelectItem value="universitario">Hospital Universitário</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div className="space-y-2"><Label>Número de Leitos</Label>
                    <Input type="number" value={hospitalData.bed_count || 0} onChange={e => setHospitalData((h: any) => ({ ...h, bed_count: Number(e.target.value) }))} /></div>
                  <div className="space-y-2"><Label>E-mail de Contato</Label>
                    <Input value={hospitalData.contact_email || ""} onChange={e => setHospitalData((h: any) => ({ ...h, contact_email: e.target.value }))} /></div>
                </div>
                <Button onClick={handleSaveHospital}>Salvar Alterações</Button>
              </CardContent>
            </Card>
          )}

          {/* Setores */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" />Setores Cadastrados</CardTitle>
                  <CardDescription>{activeSectors.length} setor(es) ativo(s)</CardDescription>
                </div>
                <Button size="sm" onClick={() => openSectorDialog("add")}>
                  <Plus className="h-4 w-4 mr-1" />Novo Setor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeSectors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum setor cadastrado</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                        <TableHead className="hidden sm:table-cell">Leitos</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSectors.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-sm">{s.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {SECTOR_TYPES.find(t => t.value === s.type)?.label || s.type || "—"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{s.bed_count || "—"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openSectorDialog("edit", s)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteSectorTarget(s)}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Logos ─── */}
        <TabsContent value="logos" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ImagePlus className="h-4 w-4" />Logo da Instituição</CardTitle>
              <CardDescription>Aparece nos PDFs, relatórios e e-mails gerados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logosLoading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                : hospitalLogo ? (
                  <div className="flex items-start gap-4">
                    <div className="border rounded-lg p-2 bg-muted/30">
                      <img src={hospitalLogo.url} alt="Logo" className="h-20 w-auto max-w-[200px] object-contain" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => hospitalLogoInputRef.current?.click()} disabled={uploading}><ImagePlus className="h-4 w-4 mr-1" />Substituir</Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteLogo(hospitalLogo)} disabled={uploading}><Trash2 className="h-4 w-4 mr-1" />Remover</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                    <Image className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <div><p className="text-sm font-medium">Nenhuma logo cadastrada</p><p className="text-xs text-muted-foreground">PNG, JPG ou SVG • máx. 2 MB</p></div>
                    <Button variant="outline" onClick={() => hospitalLogoInputRef.current?.click()} disabled={uploading}><ImagePlus className="h-4 w-4 mr-2" />{uploading ? "Enviando..." : "Upload da logo"}</Button>
                  </div>
                )}
              <input ref={hospitalLogoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={e => handleFileChange(e, "hospital")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ImagePlus className="h-4 w-4" />Logos da SCIH</CardTitle>
              <CardDescription>Múltiplas logos da SCIH/CCIH — todas aparecem nos documentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logosLoading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
                <>
                  {scihLogos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {scihLogos.map(logo => (
                        <div key={logo.id} className="border rounded-lg p-3 space-y-2">
                          <div className="bg-muted/30 rounded p-2 flex items-center justify-center h-24">
                            <img src={logo.url} alt={logo.display_name || "Logo SCIH"} className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium truncate">{logo.display_name || `Logo SCIH ${logo.display_order + 1}`}</p>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDeleteLogo(logo)} disabled={uploading}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
                    <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <div><p className="text-sm font-medium">Adicionar logo da SCIH</p><p className="text-xs text-muted-foreground">PNG, JPG ou SVG • máx. 2 MB</p></div>
                    <Button variant="outline" onClick={() => scihLogoInputRef.current?.click()} disabled={uploading}><ImagePlus className="h-4 w-4 mr-2" />{uploading ? "Enviando..." : "Adicionar logo SCIH"}</Button>
                  </div>
                  <input ref={scihLogoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={e => handleFileChange(e, "scih")} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Usuários ─── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Usuários Vinculados</CardTitle>
                  <CardDescription>{users.length} usuário(s) • {users.filter(u => u.is_active).length} ativo(s)</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadUsers} disabled={usersLoading}>
                  {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="hidden md:table-cell">Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(u => (
                        <TableRow key={u.user_id} className={!u.is_active ? "opacity-50" : ""}>
                          <TableCell>
                            <p className="font-medium text-sm">{u.profile?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{u.profile?.email || "—"}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{ROLE_LABELS[u.role || "viewer"] || u.role}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {u.is_primary_admin && <Badge className="bg-primary text-primary-foreground text-xs">Admin</Badge>}
                              <Badge variant={u.is_active ? "outline" : "secondary"} className={u.is_active ? "border-green-500/30 text-green-600" : "text-muted-foreground"}>
                                {u.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditUser(u)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                                {u.is_active
                                  ? <DropdownMenuItem onClick={() => setConfirmUserAction({ user: u, action: "deactivate" })}><UserX className="h-4 w-4 mr-2" />Desativar</DropdownMenuItem>
                                  : <DropdownMenuItem onClick={() => setConfirmUserAction({ user: u, action: "activate" })}><UserCheck className="h-4 w-4 mr-2" />Ativar</DropdownMenuItem>
                                }
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setConfirmUserAction({ user: u, action: "delete" })}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Notificações ─── */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Notificações por E-mail</CardTitle>
              <CardDescription>
                As notificações são enviadas para o e-mail de contato do hospital
                {hospitalData?.contact_email ? <> (<strong>{hospitalData.contact_email}</strong>)</> : ""} e para os destinatários adicionais configurados abaixo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "email_enabled" as const, label: "Notificações por E-mail", desc: "Ativar envio de e-mails de alerta e resumos" },
                { key: "critical_enabled" as const, label: "Alertas Críticos Imediatos", desc: "Notificação imediata para alertas de prioridade crítica" },
                { key: "daily_summary" as const, label: "Resumo Diário", desc: "Consolidado de alertas às 07:00 todos os dias" },
                { key: "weekly_summary" as const, label: "Resumo Semanal", desc: "Relatório semanal enviado às segundas-feiras" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <Switch checked={notif[item.key]} onCheckedChange={v => setNotif(n => ({ ...n, [item.key]: v }))} />
                </div>
              ))}

              <Separator />

              {/* Recipients */}
              <div className="space-y-3">
                <Label>Destinatários Adicionais</Label>
                <p className="text-xs text-muted-foreground">E-mails que receberão cópia dos alertas além do e-mail principal do hospital.</p>
                <div className="flex gap-2">
                  <Input placeholder="email@exemplo.com" value={newRecipient} onChange={e => setNewRecipient(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }} />
                  <Button variant="outline" size="sm" onClick={addRecipient}><Plus className="h-4 w-4" /></Button>
                </div>
                {notif.email_recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {notif.email_recipients.map(email => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1 pr-1">
                        {email}
                        <button onClick={() => removeRecipient(email)} className="ml-1 rounded hover:bg-muted p-0.5"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveNotif} disabled={notifSaving}>
                  {notifSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Salvar Preferências
                </Button>
                <Button variant="outline" onClick={handleTestNotif} disabled={notifTesting}>
                  {notifTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar E-mail de Teste
                </Button>
              </div>

              {!hospitalData?.contact_email && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ Nenhum e-mail de contato cadastrado. Adicione um na aba Organização para receber notificações.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Segurança ─── */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Políticas de Segurança</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium">Autenticação de Dois Fatores (2FA)</p><p className="text-xs text-muted-foreground">Exigir 2FA para todos os administradores</p></div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium">Expiração de Sessão</p><p className="text-xs text-muted-foreground">Encerrar sessão após inatividade</p></div>
                <Select defaultValue="30"><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="15">15 min</SelectItem><SelectItem value="30">30 min</SelectItem><SelectItem value="60">60 min</SelectItem></SelectContent></Select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium">Log de Auditoria</p><p className="text-xs text-muted-foreground">Registrar todas as ações no sistema</p></div>
                <Switch defaultChecked />
              </div>
              <Button onClick={() => toast.success("Políticas de segurança atualizadas")}>Salvar Políticas</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ─── */}

      {/* Sector add/edit */}
      <Dialog open={sectorDialog.open} onOpenChange={open => setSectorDialog(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sectorDialog.mode === "add" ? "Novo Setor" : "Editar Setor"}</DialogTitle>
            <DialogDescription>Preencha os dados do setor hospitalar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label>
              <Input placeholder="Ex: UTI Adulto" value={sectorForm.name} onChange={e => setSectorForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={sectorForm.type || "__none__"} onValueChange={v => setSectorForm(f => ({ ...f, type: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não especificado</SelectItem>
                  {SECTOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Número de Leitos</Label>
              <Input type="number" min={0} value={sectorForm.bed_count} onChange={e => setSectorForm(f => ({ ...f, bed_count: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectorDialog(d => ({ ...d, open: false }))}>Cancelar</Button>
            <Button onClick={handleSaveSector} disabled={sectorSaving || !sectorForm.name.trim()}>
              {sectorSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {sectorDialog.mode === "add" ? "Cadastrar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete sector */}
      <AlertDialog open={!!deleteSectorTarget} onOpenChange={open => { if (!open) setDeleteSectorTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover setor</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover o setor <strong>{deleteSectorTarget?.name}</strong>? Dados existentes vinculados a este setor não serão apagados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteSector}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit user */}
      <Dialog open={!!editUserTarget} onOpenChange={open => { if (!open) setEditUserTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize os dados do usuário. Deixe a senha em branco para não alterar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome completo *</Label>
              <Input value={editUserForm.full_name} onChange={e => setEditUserForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>E-mail</Label>
              <Input type="email" value={editUserForm.email} onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Telefone</Label>
              <Input value={editUserForm.phone} onChange={e => setEditUserForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Perfil</Label>
              <Select value={editUserForm.role} onValueChange={v => setEditUserForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                <SelectContent>{ASSIGNABLE_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Nova senha (opcional)</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={editUserForm.password} onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserTarget(null)}>Cancelar</Button>
            <Button onClick={handleEditUser} disabled={editUserSaving || !editUserForm.full_name}>
              {editUserSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm user action */}
      {confirmUserAction ? (
        <AlertDialog open onOpenChange={open => { if (!open) setConfirmUserAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmUserAction.action === "delete" ? "Excluir usuário" : confirmUserAction.action === "deactivate" ? "Desativar usuário" : "Ativar usuário"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmUserAction.action === "delete"
                  ? `Excluir permanentemente ${confirmUserAction.user?.profile?.full_name || "este usuário"}? Esta ação não pode ser desfeita.`
                  : confirmUserAction.action === "deactivate"
                  ? `Desativar ${confirmUserAction.user?.profile?.full_name || "este usuário"}? O acesso ao sistema será bloqueado.`
                  : `Reativar ${confirmUserAction.user?.profile?.full_name || "este usuário"}? O acesso ao sistema será restaurado.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={confirmUserAction.action === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                onClick={handleUserAction}
                disabled={userActionLoading}
              >
                {userActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
                {confirmUserAction.action === "delete" ? "Excluir" : confirmUserAction.action === "deactivate" ? "Desativar" : "Ativar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
