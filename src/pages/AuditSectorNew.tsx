import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, Loader2, CheckCircle2, XCircle, MinusCircle, Ban, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSelectedHospitalId } from "@/lib/selectedHospital";
import { CHECKLISTS_DATA } from "@/data/scih-checklists";

type ResponseValue = "conf" | "parc" | "nc" | "na" | "";

interface ItemResponse {
  response: ResponseValue;
  observation: string;
}

const AUDIT_TYPES = ["Rotina", "Surpresa", "Reauditoria", "Acreditação"];

const RESPONSE_OPTS: { value: ResponseValue; label: string; color: string; icon: React.ReactNode }[] = [
  { value: "conf", label: "Conforme", color: "bg-green-100 text-green-800 border-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  { value: "parc", label: "Parcial", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: <MinusCircle className="h-3 w-3" /> },
  { value: "nc", label: "Não Conforme", color: "bg-red-100 text-red-800 border-red-300", icon: <XCircle className="h-3 w-3" /> },
  { value: "na", label: "N/A", color: "bg-muted text-muted-foreground border-border", icon: <Ban className="h-3 w-3" /> },
];

export default function AuditSectorNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"sector" | "form" | "checklist">("sector");
  const [saving, setSaving] = useState(false);

  const [selectedSector, setSelectedSector] = useState("");
  const [header, setHeader] = useState({
    auditorName: "",
    responsibleName: "",
    auditDate: new Date().toISOString().split("T")[0],
    auditTime: "",
    auditType: "Rotina",
    participants: "",
    observations: "",
  });

  const [responses, setResponses] = useState<Record<string, ItemResponse>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const checklist = selectedSector ? CHECKLISTS_DATA[selectedSector] : null;

  const allItems = checklist
    ? checklist.grupos.flatMap((g, gi) =>
        g.itens.map((q, ii) => ({ key: `${gi}-${ii}`, question: q, group: g.grupo }))
      )
    : [];

  const answered = allItems.filter((i) => responses[i.key]?.response && responses[i.key]?.response !== "");
  const counts = {
    conf: allItems.filter((i) => responses[i.key]?.response === "conf").length,
    parc: allItems.filter((i) => responses[i.key]?.response === "parc").length,
    nc: allItems.filter((i) => responses[i.key]?.response === "nc").length,
    na: allItems.filter((i) => responses[i.key]?.response === "na").length,
  };
  const applicable = allItems.length - counts.na;
  const complianceRate = applicable > 0 ? Math.round(((counts.conf + counts.parc * 0.5) / applicable) * 100) : 0;

  function setResponse(key: string, value: ResponseValue) {
    setResponses((p) => ({ ...p, [key]: { ...p[key], response: value, observation: p[key]?.observation ?? "" } }));
  }

  function setObs(key: string, value: string) {
    setResponses((p) => ({ ...p, [key]: { ...p[key], observation: value, response: p[key]?.response ?? "" } }));
  }

  function toggleGroup(group: string) {
    setExpandedGroups((p) => ({ ...p, [group]: !p[group] }));
  }

  async function handleSave() {
    if (!header.auditorName || !header.auditDate) {
      toast.error("Preencha o nome do auditor e a data.");
      return;
    }
    if (answered.length < allItems.length) {
      toast.error(`Responda todos os itens antes de salvar. (${answered.length}/${allItems.length})`);
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { toast.error("Sessão expirada."); return; }

      const hospitalId = getSelectedHospitalId(session.session.user.id);
      if (!hospitalId) { toast.error("Nenhum hospital selecionado."); return; }

      const { data: audit, error: auditErr } = await supabase
        .from("scih_sector_audits" as any)
        .insert({
          hospital_id: hospitalId,
          sector_key: selectedSector,
          sector_name: checklist!.nome,
          auditor_name: header.auditorName,
          auditor_id: session.session.user.id,
          responsible_name: header.responsibleName || null,
          audit_date: header.auditDate,
          audit_time: header.auditTime || null,
          audit_type: header.auditType,
          participants: header.participants || null,
          observations: header.observations || null,
          total_items: allItems.length,
          compliant_items: counts.conf,
          partial_items: counts.parc,
          nc_items: counts.nc,
          na_items: counts.na,
          compliance_rate: complianceRate,
        })
        .select()
        .single();

      if (auditErr || !audit) throw auditErr;

      const resRows = allItems.map((item) => ({
        audit_id: (audit as any).id,
        group_name: item.group,
        item_index: parseInt(item.key.split("-")[1]),
        question: item.question,
        response: responses[item.key]?.response || "",
        observation: responses[item.key]?.observation || null,
      }));

      const { error: resErr } = await supabase.from("scih_sector_responses" as any).insert(resRows);
      if (resErr) throw resErr;

      // Create NCs for non-compliant items
      const ncItems = allItems.filter((i) => responses[i.key]?.response === "nc");
      if (ncItems.length > 0) {
        const ncRows = ncItems.map((item) => ({
          hospital_id: hospitalId,
          audit_id: (audit as any).id,
          sector_key: selectedSector,
          sector_name: checklist!.nome,
          question: item.question,
          observation: responses[item.key]?.observation || null,
          severity: "Menor",
          status: "Aberta",
          audit_date: header.auditDate,
        }));
        await supabase.from("scih_ncs" as any).insert(ncRows);
      }

      toast.success(`Auditoria salva! Conformidade: ${complianceRate}%`);
      navigate(-1);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar auditoria.");
    } finally {
      setSaving(false);
    }
  }

  if (step === "sector") {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Auditoria por Setor — SCIH
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione o setor a ser auditado:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CHECKLISTS_DATA).map(([key, def]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedSector(key); setStep("form"); }}
                  className="text-left p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="font-medium text-sm">{def.nome}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {def.grupos.reduce((acc, g) => acc + g.itens.length, 0)} itens
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep("sector")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Trocar setor
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {checklist?.nome} — Cabeçalho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Auditor *</Label>
                <Input value={header.auditorName} onChange={(e) => setHeader((p) => ({ ...p, auditorName: e.target.value }))} placeholder="Nome do auditor" />
              </div>
              <div className="space-y-1">
                <Label>Responsável pelo setor</Label>
                <Input value={header.responsibleName} onChange={(e) => setHeader((p) => ({ ...p, responsibleName: e.target.value }))} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={header.auditDate} onChange={(e) => setHeader((p) => ({ ...p, auditDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Input type="time" value={header.auditTime} onChange={(e) => setHeader((p) => ({ ...p, auditTime: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de auditoria</Label>
                <Select value={header.auditType} onValueChange={(v) => setHeader((p) => ({ ...p, auditType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Participantes</Label>
                <Input value={header.participants} onChange={(e) => setHeader((p) => ({ ...p, participants: e.target.value }))} placeholder="Ex: Enf. Maria, Dr. João" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações gerais</Label>
              <Textarea value={header.observations} onChange={(e) => setHeader((p) => ({ ...p, observations: e.target.value }))} rows={2} />
            </div>
            <Button className="w-full" onClick={() => setStep("checklist")}>
              Iniciar Checklist →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setStep("form")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Cabeçalho
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{answered.length}/{allItems.length} respondidos</span>
          <Badge variant="outline" className={complianceRate >= 80 ? "border-green-400 text-green-700" : complianceRate >= 60 ? "border-yellow-400 text-yellow-700" : "border-red-400 text-red-700"}>
            {complianceRate}% conformidade
          </Badge>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-lg bg-green-50 border border-green-200 p-2">
          <div className="text-lg font-bold text-green-700">{counts.conf}</div>
          <div className="text-xs text-green-600">Conforme</div>
        </div>
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2">
          <div className="text-lg font-bold text-yellow-700">{counts.parc}</div>
          <div className="text-xs text-yellow-600">Parcial</div>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-2">
          <div className="text-lg font-bold text-red-700">{counts.nc}</div>
          <div className="text-xs text-red-600">Não Conf.</div>
        </div>
        <div className="rounded-lg bg-muted/60 border border-border p-2">
          <div className="text-lg font-bold text-muted-foreground">{counts.na}</div>
          <div className="text-xs text-muted-foreground">N/A</div>
        </div>
      </div>

      {checklist!.grupos.map((group, gi) => {
        const isOpen = expandedGroups[group.grupo] !== false;
        return (
          <Card key={gi}>
            <CardHeader
              className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleGroup(group.grupo)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{group.grupo}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {group.itens.filter((_, ii) => responses[`${gi}-${ii}`]?.response).length}/{group.itens.length}
                  </span>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent className="px-4 pb-4 space-y-4">
                {group.itens.map((question, ii) => {
                  const key = `${gi}-${ii}`;
                  const cur = responses[key]?.response ?? "";
                  return (
                    <div key={ii} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                      <p className="text-sm">{ii + 1}. {question}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {RESPONSE_OPTS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setResponse(key, opt.value)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${cur === opt.value ? opt.color + " ring-2 ring-offset-1 ring-current" : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"}`}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                      {(cur === "nc" || cur === "parc") && (
                        <Input
                          placeholder="Observação (opcional)"
                          value={responses[key]?.observation ?? ""}
                          onChange={(e) => setObs(key, e.target.value)}
                          className="text-xs h-8"
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button
        className="w-full"
        onClick={handleSave}
        disabled={saving || answered.length < allItems.length}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {saving ? "Salvando..." : `Finalizar Auditoria (${answered.length}/${allItems.length})`}
      </Button>
    </div>
  );
}
