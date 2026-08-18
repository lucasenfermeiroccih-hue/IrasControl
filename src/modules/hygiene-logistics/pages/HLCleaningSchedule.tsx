import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CLEANING_TYPES, type CleaningTask } from "../data/mockData";
import { setHLState, useHL } from "../store";
import { DataTable, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

const TONE: Record<CleaningTask["status"], string> = {
  Previsto: "border-blue-500/40 bg-blue-500/10 text-blue-600",
  "Em andamento": "border-yellow-500/40 bg-yellow-500/10 text-yellow-700",
  Concluído: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  Atrasado: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  "Não realizado": "border-destructive/40 bg-destructive/10 text-destructive",
  Reprogramado: "border-border bg-muted text-muted-foreground",
};

export default function HLCleaningSchedule() {
  const { schedule, sectors } = useHL();
  const hoje = new Date().toISOString().slice(0, 10);
  const [fSetor, setFSetor] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [novo, setNovo] = useState({ setor: "", tipo: CLEANING_TYPES[0], turno: "Manhã", previsto: "08:00", profissional: "" });

  const doDia = schedule.filter((s) => s.data === hoje);
  const filtered = useMemo(() => schedule.filter((s) =>
    (fSetor === "todos" || s.setor === fSetor) && (fStatus === "todos" || s.status === fStatus)), [schedule, fSetor, fStatus]);

  const count = (st: CleaningTask["status"]) => schedule.filter((s) => s.status === st).length;

  const adicionar = () => {
    if (!novo.setor || !novo.profissional) { toast.error("Setor e profissional são obrigatórios."); return; }
    setHLState((s) => ({
      schedule: [{
        id: `LIM-${Date.now()}`, data: hoje, setor: novo.setor, tipo: novo.tipo,
        frequencia: "Diária", turno: novo.turno, previsto: novo.previsto, realizado: "",
        profissional: novo.profissional, supervisor: "Sup. Hotelaria", status: "Previsto",
        motivo: "", evidencia: "", observacao: "",
      }, ...s.schedule],
    }));
    toast.success("Limpeza programada adicionada ao cronograma de hoje.");
    setNovo({ ...novo, setor: "", profissional: "" });
  };

  const setStatus = (id: string, status: CleaningTask["status"]) =>
    setHLState((s) => ({
      schedule: s.schedule.map((t) => (t.id === id
        ? { ...t, status, realizado: status === "Concluído" ? new Date().toTimeString().slice(0, 5) : t.realizado }
        : t)),
    }));

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader title="Cronograma de Limpeza" description="Programação diária, por turno e por tipo de limpeza, com rastreio de execução." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Previstos" value={count("Previsto")} tone="info" />
        <KpiCard label="Concluídos" value={count("Concluído")} tone="success" />
        <KpiCard label="Atrasados" value={count("Atrasado")} tone="warning" />
        <KpiCard label="Não realizados" value={count("Não realizado")} tone="danger" />
      </div>

      <SectionCard title={`Limpezas previstas para hoje (${new Date().toLocaleDateString("pt-BR")})`}>
        {doDia.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma limpeza cadastrada para hoje. Use o formulário abaixo para programar.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {doDia.map((t) => (
              <div key={t.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{t.setor}</span>
                  <Badge variant="outline" className={TONE[t.status]}>{t.status}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{t.tipo} · {t.turno} · previsto {t.previsto} · {t.profissional}</p>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "Em andamento")}>Iniciar</Button>
                  <Button size="sm" onClick={() => setStatus(t.id, "Concluído")}>Concluir</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Programar limpeza">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <div><Label className="text-xs">Setor *</Label>
            <Select value={novo.setor} onValueChange={(v) => setNovo({ ...novo, setor: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Tipo</Label>
            <Select value={novo.tipo} onValueChange={(v) => setNovo({ ...novo, tipo: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{CLEANING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Turno</Label>
            <Select value={novo.turno} onValueChange={(v) => setNovo({ ...novo, turno: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{["Manhã", "Tarde", "Noite"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Horário previsto</Label><Input className="h-8" type="time" value={novo.previsto} onChange={(e) => setNovo({ ...novo, previsto: e.target.value })} /></div>
          <div><Label className="text-xs">Profissional *</Label><Input className="h-8" value={novo.profissional} onChange={(e) => setNovo({ ...novo, profissional: e.target.value })} /></div>
        </div>
        <Button className="mt-3" onClick={adicionar}><Plus className="mr-2 h-4 w-4" />Adicionar ao cronograma</Button>
      </SectionCard>

      <SectionCard
        title="Cronograma completo"
        actions={
          <div className="flex gap-2">
            <Select value={fSetor} onValueChange={setFSetor}>
              <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos os setores</SelectItem>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.keys(TONE).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <DataTable
          rows={filtered}
          pageSize={15}
          searchKeys={(t) => `${t.setor} ${t.tipo} ${t.profissional}`}
          columns={[
            { key: "data", header: "Data", sortValue: (t) => t.data, render: (t) => t.data },
            { key: "setor", header: "Setor", render: (t) => t.setor },
            { key: "tipo", header: "Tipo", render: (t) => t.tipo },
            { key: "freq", header: "Frequência", render: (t) => t.frequencia },
            { key: "turno", header: "Turno", render: (t) => t.turno },
            { key: "prev", header: "Previsto", render: (t) => t.previsto },
            { key: "real", header: "Realizado", render: (t) => t.realizado || "—" },
            { key: "prof", header: "Profissional", render: (t) => t.profissional },
            { key: "sup", header: "Supervisor", render: (t) => t.supervisor },
            { key: "st", header: "Status", render: (t) => <Badge variant="outline" className={TONE[t.status]}>{t.status}</Badge> },
            { key: "mot", header: "Motivo não realização", className: "max-w-[180px] whitespace-normal", render: (t) => <span className="text-[11px] text-muted-foreground">{t.motivo || "—"}</span> },
            { key: "ev", header: "Evidência", render: (t) => t.evidencia || "—" },
          ]}
        />
      </SectionCard>
    </div>
  );
}
