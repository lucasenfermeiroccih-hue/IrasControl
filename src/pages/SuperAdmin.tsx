import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Building2, Plus, Shield, Users, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Hospital = Tables<"hospitals">;

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  pending: "Pendente",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const typeLabels: Record<string, string> = {
  geral: "Hospital Geral",
  especializado: "Especializado",
  universitario: "Universitário",
  upa: "UPA",
};

const brazilianStates = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function SuperAdmin() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHospitalDialog, setShowHospitalDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Hospital form
  const [hospitalForm, setHospitalForm] = useState({
    name: "", cnes: "", type: "geral", bed_count: "",
    city: "", state: "", contact_email: "", contact_phone: "",
  });

  // Admin form
  const [adminForm, setAdminForm] = useState({ full_name: "", email: "" });

  const fetchHospitals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hospitals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar hospitais");
    } else {
      setHospitals(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchHospitals(); }, []);

  const handleCreateHospital = async () => {
    if (!hospitalForm.name) {
      toast.error("Nome do hospital é obrigatório");
      return;
    }
    setSaving(true);
    const insertData: TablesInsert<"hospitals"> = {
      name: hospitalForm.name,
      cnes: hospitalForm.cnes || null,
      type: hospitalForm.type,
      bed_count: hospitalForm.bed_count ? parseInt(hospitalForm.bed_count) : null,
      city: hospitalForm.city || null,
      state: hospitalForm.state || null,
      contact_email: hospitalForm.contact_email || null,
      contact_phone: hospitalForm.contact_phone || null,
      status: "pending",
    };

    const { data, error } = await supabase.from("hospitals").insert(insertData).select().single();
    setSaving(false);

    if (error) {
      toast.error("Erro ao cadastrar hospital: " + error.message);
      return;
    }

    toast.success("Hospital cadastrado com sucesso!");
    setShowHospitalDialog(false);
    setHospitalForm({ name: "", cnes: "", type: "geral", bed_count: "", city: "", state: "", contact_email: "", contact_phone: "" });

    // Open admin creation dialog for this hospital
    setSelectedHospitalId(data.id);
    setShowAdminDialog(true);
    fetchHospitals();
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.email || !adminForm.full_name || !selectedHospitalId) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("create-hospital-admin", {
      body: {
        email: adminForm.email,
        full_name: adminForm.full_name,
        hospital_id: selectedHospitalId,
      },
    });

    setSaving(false);

    if (error || data?.error) {
      toast.error("Erro ao criar administrador: " + (data?.error || error?.message));
      return;
    }

    toast.success("Administrador criado! Um link de acesso foi enviado por e-mail.");
    setShowAdminDialog(false);
    setAdminForm({ full_name: "", email: "" });
    setSelectedHospitalId(null);

    // Update hospital status to active
    await supabase.from("hospitals").update({ status: "active" as const }).eq("id", selectedHospitalId);
    fetchHospitals();
  };

  const openAdminDialog = (hospitalId: string) => {
    setSelectedHospitalId(hospitalId);
    setAdminForm({ full_name: "", email: "" });
    setShowAdminDialog(true);
  };

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Gestão de hospitais e administradores do sistema multi-tenant</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{hospitals.length}</p>
              <p className="text-xs text-muted-foreground">Hospitais Cadastrados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Activity className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{hospitals.filter(h => h.status === "active").length}</p>
              <p className="text-xs text-muted-foreground">Hospitais Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{hospitals.filter(h => h.status === "pending").length}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hospitals table */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Hospitais</h2>
        <Button onClick={() => setShowHospitalDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />Novo Hospital
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hospitals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum hospital cadastrado</p>
              <p className="text-sm">Clique em "Novo Hospital" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital</TableHead>
                  <TableHead className="hidden md:table-cell">CNES</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Cidade/UF</TableHead>
                  <TableHead className="hidden lg:table-cell">Leitos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hospitals.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.contact_email}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{h.cnes || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{typeLabels[h.type] || h.type}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {h.city && h.state ? `${h.city}/${h.state}` : h.city || h.state || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{h.bed_count || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[h.status]}>
                        {statusLabels[h.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openAdminDialog(h.id)}>
                        <Users className="h-4 w-4 mr-1" />Admin
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Hospital Dialog */}
      <Dialog open={showHospitalDialog} onOpenChange={setShowHospitalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Hospital</DialogTitle>
            <DialogDescription>Preencha os dados do hospital. Após o cadastro, você poderá criar o primeiro administrador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Nome do Hospital *</Label>
              <Input value={hospitalForm.name} onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })} placeholder="Hospital São Lucas" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNES</Label>
                <Input value={hospitalForm.cnes} onChange={(e) => setHospitalForm({ ...hospitalForm, cnes: e.target.value })} placeholder="1234567" maxLength={7} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={hospitalForm.type} onValueChange={(v) => setHospitalForm({ ...hospitalForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Hospital Geral</SelectItem>
                    <SelectItem value="especializado">Especializado</SelectItem>
                    <SelectItem value="universitario">Universitário</SelectItem>
                    <SelectItem value="upa">UPA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={hospitalForm.city} onChange={(e) => setHospitalForm({ ...hospitalForm, city: e.target.value })} placeholder="São Paulo" />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={hospitalForm.state} onValueChange={(v) => setHospitalForm({ ...hospitalForm, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Número de Leitos</Label>
              <Input type="number" value={hospitalForm.bed_count} onChange={(e) => setHospitalForm({ ...hospitalForm, bed_count: e.target.value })} placeholder="200" />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail de Contato</Label>
                <Input type="email" value={hospitalForm.contact_email} onChange={(e) => setHospitalForm({ ...hospitalForm, contact_email: e.target.value })} placeholder="ccih@hospital.com" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={hospitalForm.contact_phone} onChange={(e) => setHospitalForm({ ...hospitalForm, contact_phone: e.target.value })} placeholder="(11) 99999-0000" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHospitalDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateHospital} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Cadastrar Hospital
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Administrador</DialogTitle>
            <DialogDescription>
              {selectedHospital
                ? `Criar o primeiro administrador para ${selectedHospital.name}`
                : "Criar administrador do hospital"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={adminForm.full_name} onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })} placeholder="Dr. Carlos Mendes" />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="admin@hospital.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              Um link de acesso será enviado para o e-mail informado. O administrador receberá o perfil <Badge variant="outline" className="text-xs">hospital_admin</Badge>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateAdmin} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Criar Administrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
