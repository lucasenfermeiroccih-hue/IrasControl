import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CHECKLISTS, CLEANING_AUDIT_TYPES } from "../data/mockData";
import { setHLState, useHL } from "../store";
import { DataTable, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

type Resposta = "Conforme" | "Não Conforme" | "Não se aplica";

interface ItemState {
  resposta: Resposta; peso: number; evidencia: string; observacao: string;
  responsavel: string; prazo: string; reauditoria: string;
}

function classify(score: number) {
  if (score >= 90) return { label: "Aprovado", tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" };
  if (score >= 80) return { label: "Aprovado com Ressalva", tone: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700" };
  if (score >= 70) return { label: "Parcialmente Conforme", tone: "border-orange-500/40 bg-orange-500/10 text-orange-600" };
  return { label: "Reprovado", tone: "border-destructive/40 bg-destructive/10 text-destructive" };
}

export default function HLCleaningAudit() {
  const { audits, sectors } = useHL();
  const [tipo, setTipo] = useState(CLEANING_AUDIT_TYPES[0]);
  const [header, setHeader] = useState({ setor: "", auditor: "", data: new Date().toISOString().slice(0, 10), turno: "Manhã" });
  const [items, setItems] = useState<Record<string, ItemState>>({});

  const checklist = CHECKLISTS[tipo] ?? [];

  const get = (q: string): ItemState =>
    items[q] ?? { resposta: "Conforme", peso: 1, evidencia: "", observacao: "", responsavel: "", prazo: "", reauditoria: "" };

  const set = (q: string, patch: Partial<ItemState>) =>
    setItems((s) => ({ ...s, [q]: { ...get(q), ...patch } }));

  const { score, conformes, aplicaveis } = useMemo(() => {
    let c = 0, a = 0;
    checklist.forEach((q) => {
      const it = get(q);
      if (it.resposta === "Não se aplica") return;
      a += it.peso;
      if (it.resposta === "Conforme") c += it.peso;
    });
    return { score: a ? Math.round((c / a) * 100) : 0, conformes: c, aplicaveis: a };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, checklist]);

  const classificacao = classify(score);

  const salvar = () => {
    if (!header.setor || !header.auditor) { toast.error("Setor e auditor são obrigatórios."); return; }
    const id = `AUD-${Date.now()}`;
    setHLState((s) => ({
      audits: [{
        id, data: header.data, setor: header.setor, tipo, auditor: header.auditor,
        turno: header.turno, score, classificacao: classificacao.label,
        itensConformes: conformes, itensAplicaveis: aplicaveis,
      }, ...s.audits],
      nonconformities: score < 70
        ? [{
            id: `NC-${Date.now()}`, origem: "Auditoria" as const, setor: header.setor,
            data: header.data,
            descricao: `Auditoria de limpeza (${tipo}) reprovada com score de ${score}%`,
            classificacao: "Alta" as const, responsavel: "Sup. Hotelaria",
            prazo: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10),
            status: "Aberta" as const,
            acao: "Plano de ação automático: retreinamento da equipe e reauditoria em 10 dias.",
            encerramento: "",
          }, ...s.nonconformities]
        : s.nonconformities,
    }));
    toast.success(score < 70
      ? "Auditoria salva — plano de ação automático gerado por reprovação."
      : "Auditoria salva com sucesso.");
    setItems({});
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader title="Auditoria de Limpeza" description="Checklists padronizados com score em tempo real e geração automática de plano de ação." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Score atual" value={`${score}%`} tone={score >= 90 ? "success" : score >= 70 ? "warning" : "danger"} hint={`${conformes} de ${aplicaveis} pontos aplicáveis`} />
        <KpiCard label="Classificação" value={<Badge variant="outline" className={classificacao.tone}>{classificacao.label}</Badge>} />
        <KpiCard label="Auditorias registradas" value={audits.length} tone="info" />
        <KpiCard label="Reprovadas" value={audits.filter((a) => a.classificacao === "Reprovado").length} tone="danger" />
      </div>

      <SectionCard title="Cabeçalho da auditoria">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <div><Label className="text-xs">Tipo de checklist</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v); setItems({}); }}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{CLEANING_AUDIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Setor *</Label>
            <Select value={header.setor} onValueChange={(v) => setHeader({ ...header, setor: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Auditor *</Label><Input className="h-8" value={header.auditor} onChange={(e) => setHeader({ ...header, auditor: e.target.value })} /></div>
          <div><Label className="text-xs">Data</Label><Input className="h-8" type="date" value={header.data} onChange={(e) => setHeader({ ...header, data: e.target.value })} /></div>
          <div><Label className="text-xs">Turno</Label>
            <Select value={header.turno} onValueChange={(v) => setHeader({ ...header, turno: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{["Manhã", "Tarde", "Noite"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select></div>
        </div>
      </SectionCard>

      <SectionCard title={`Checklist — ${tipo}`} description={`Score = (pontos conformes ÷ pontos aplicáveis) × 100 = ${score}%`}>
        <div className="space-y-2">
          {checklist.map((q) => {
            const it = get(q);
            return (
              <div key={q} className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{q}</p>
                <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-7">
                  <div><Label className="text-[11px]">Resposta</Label>
                    <Select value={it.resposta} onValueChange={(v) => set(q, { resposta: v as Resposta })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Conforme">Conforme</SelectItem>
                        <SelectItem value="Não Conforme">Não Conforme</SelectItem>
                        <SelectItem value="Não se aplica">Não se aplica</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-[11px]">Peso</Label>
                    <Input className="h-8" type="number" min={1} value={it.peso} onChange={(e) => set(q, { peso: Number(e.target.value) || 1 })} /></div>
                  <div><Label className="text-[11px]">Evidência</Label>
                    <Input className="h-8" value={it.evidencia} onChange={(e) => set(q, { evidencia: e.target.value })} /></div>
                  <div><Label className="text-[11px]">Observação</Label>
                    <Input className="h-8" value={it.observacao} onChange={(e) => set(q, { observacao: e.target.value })} /></div>
                  <div><Label className="text-[11px]">Resp. correção</Label>
                    <Input className="h-8" value={it.responsavel} onChange={(e) => set(q, { responsavel: e.target.value })} /></div>
                  <div><Label className="text-[11px]">Prazo</Label>
                    <Input className="h-8" type="date" value={it.prazo} onChange={(e) => set(q, { prazo: e.target.value })} /></div>
                  <div><Label className="text-[11px]">Reauditoria</Label>
                    <Input className="h-8" type="date" value={it.reauditoria} onChange={(e) => set(q, { reauditoria: e.target.value })} /></div>
                </div>
              </div>
            );
          })}
        </div>
        <Button className="mt-3" onClick={salvar}><Save className="mr-2 h-4 w-4" />Salvar auditoria</Button>
      </SectionCard>

      <SectionCard title="Auditorias realizadas">
        <DataTable
          rows={audits}
          searchKeys={(a) => `${a.setor} ${a.tipo} ${a.auditor}`}
          columns={[
            { key: "id", header: "ID", render: (a) => a.id },
            { key: "data", header: "Data", sortValue: (a) => a.data, render: (a) => a.data },
            { key: "setor", header: "Setor", render: (a) => a.setor },
            { key: "tipo", header: "Tipo", render: (a) => a.tipo },
            { key: "aud", header: "Auditor", render: (a) => a.auditor },
            { key: "turno", header: "Turno", render: (a) => a.turno },
            { key: "score", header: "Score", sortValue: (a) => a.score, render: (a) => `${a.score}%` },
            { key: "cls", header: "Classificação", render: (a) => (
              <Badge variant="outline" className={classify(a.score).tone}>{a.classificacao}</Badge>
            ) },
          ]}
        />
      </SectionCard>
    </div>
  );
}
