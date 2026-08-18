import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { NonConformity } from "../data/mockData";
import { setHLState, useHL } from "../store";
import { DataTable, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

const STATUS_TONE: Record<NonConformity["status"], string> = {
  Aberta: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  "Em andamento": "border-blue-500/40 bg-blue-500/10 text-blue-600",
  Vencida: "border-destructive/40 bg-destructive/10 text-destructive",
  Encerrada: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
};

const CLASS_TONE: Record<string, string> = {
  Alta: "border-destructive/40 bg-destructive/10 text-destructive",
  Média: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700",
  Baixa: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
};

export default function HLNonconformities() {
  const { nonconformities, sectors } = useHL();
  const [f, setF] = useState({ status: "todos", setor: "todos", origem: "todas", classificacao: "todas", responsavel: "", periodo: "" });
  const [novo, setNovo] = useState({ setor: "", descricao: "", classificacao: "Média", responsavel: "", prazo: "", acao: "" });

  const filtered = useMemo(() => nonconformities.filter((n) =>
    (f.status === "todos" || n.status === f.status) &&
    (f.setor === "todos" || n.setor === f.setor) &&
    (f.origem === "todas" || n.origem === f.origem) &&
    (f.classificacao === "todas" || n.classificacao === f.classificacao) &&
    (!f.responsavel || n.responsavel.toLowerCase().includes(f.responsavel.toLowerCase())) &&
    (!f.periodo || n.data >= f.periodo)), [nonconformities, f]);

  const count = (st: NonConformity["status"]) => nonconformities.filter((n) => n.status === st).length;

  const criar = () => {
    if (!novo.setor || !novo.descricao || !novo.responsavel) {
      toast.error("Setor, descrição e responsável são obrigatórios.");
      return;
    }
    setHLState((s) => ({
      nonconformities: [{
        id: `NC-${Date.now()}`, origem: "Manual", setor: novo.setor,
        data: new Date().toISOString().slice(0, 10), descricao: novo.descricao,
        classificacao: novo.classificacao as NonConformity["classificacao"],
        responsavel: novo.responsavel, prazo: novo.prazo, status: "Aberta",
        acao: novo.acao, encerramento: "",
      }, ...s.nonconformities],
    }));
    toast.success("Não conformidade registrada.");
    setNovo({ setor: "", descricao: "", classificacao: "Média", responsavel: "", prazo: "", acao: "" });
  };

  const encerrar = (id: string) =>
    setHLState((s) => ({
      nonconformities: s.nonconformities.map((n) => (n.id === id
        ? { ...n, status: "Encerrada" as const, encerramento: new Date().toISOString().slice(0, 10) }
        : n)),
    }));

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader title="Não Conformidades e Plano de Ação" description="Tratativa de desvios originados de auditorias, alertas logísticos e registros manuais." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Abertas" value={count("Aberta")} tone="warning" />
        <KpiCard label="Em andamento" value={count("Em andamento")} tone="info" />
        <KpiCard label="Vencidas" value={count("Vencida")} tone="danger" />
        <KpiCard label="Encerradas" value={count("Encerrada")} tone="success" />
      </div>

      <SectionCard title="Nova não conformidade">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div><Label className="text-xs">Setor *</Label>
            <Select value={novo.setor} onValueChange={(v) => setNovo({ ...novo, setor: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Classificação</Label>
            <Select value={novo.classificacao} onValueChange={(v) => setNovo({ ...novo, classificacao: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{["Alta", "Média", "Baixa"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Responsável *</Label><Input className="h-8" value={novo.responsavel} onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })} /></div>
          <div><Label className="text-xs">Prazo</Label><Input className="h-8" type="date" value={novo.prazo} onChange={(e) => setNovo({ ...novo, prazo: e.target.value })} /></div>
          <div className="md:col-span-2"><Label className="text-xs">Descrição *</Label><Input className="h-8" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} /></div>
          <div className="md:col-span-3"><Label className="text-xs">Ação corretiva</Label><Textarea rows={2} value={novo.acao} onChange={(e) => setNovo({ ...novo, acao: e.target.value })} /></div>
        </div>
        <Button className="mt-3" onClick={criar}><Plus className="mr-2 h-4 w-4" />Registrar</Button>
      </SectionCard>

      <SectionCard
        title="Não conformidades"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Status</SelectItem>{Object.keys(STATUS_TONE).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={f.setor} onValueChange={(v) => setF({ ...f, setor: v })}>
              <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Setor</SelectItem>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={f.origem} onValueChange={(v) => setF({ ...f, origem: v })}>
              <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todas">Origem</SelectItem>{["Auditoria", "Manual", "Alerta"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={f.classificacao} onValueChange={(v) => setF({ ...f, classificacao: v })}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todas">Classificação</SelectItem>{["Alta", "Média", "Baixa"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="h-8 w-40" placeholder="Responsável" value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })} />
            <Input className="h-8 w-36" type="date" value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} />
          </div>
        }
      >
        <DataTable
          rows={filtered}
          searchKeys={(n) => `${n.id} ${n.setor} ${n.descricao}`}
          columns={[
            { key: "id", header: "ID", render: (n) => n.id },
            { key: "orig", header: "Origem", render: (n) => n.origem },
            { key: "setor", header: "Setor", render: (n) => n.setor },
            { key: "data", header: "Data", sortValue: (n) => n.data, render: (n) => n.data },
            { key: "desc", header: "Descrição", className: "max-w-[260px] whitespace-normal", render: (n) => n.descricao },
            { key: "cls", header: "Classificação", render: (n) => <Badge variant="outline" className={CLASS_TONE[n.classificacao]}>{n.classificacao}</Badge> },
            { key: "resp", header: "Responsável", render: (n) => n.responsavel },
            { key: "prazo", header: "Prazo", render: (n) => n.prazo },
            { key: "st", header: "Status", render: (n) => <Badge variant="outline" className={STATUS_TONE[n.status]}>{n.status}</Badge> },
            { key: "acao", header: "Ação Corretiva", className: "max-w-[240px] whitespace-normal", render: (n) => <span className="text-[11px] text-muted-foreground">{n.acao}</span> },
            { key: "enc", header: "Encerramento", render: (n) => n.encerramento || "—" },
            { key: "ac", header: "", render: (n) => n.status !== "Encerrada"
              ? <Button size="sm" variant="ghost" onClick={() => encerrar(n.id)}>Encerrar</Button> : null },
          ]}
        />
      </SectionCard>
    </div>
  );
}
