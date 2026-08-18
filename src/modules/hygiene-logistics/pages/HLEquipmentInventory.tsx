import { useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TOTAL_BANHEIROS, TOTAL_DISP_QUEBRADOS, TOTAL_LIXEIRAS_QUEBRADAS } from "../data/mockData";
import { setHLState, useHL } from "../store";
import { DataTable, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

const STATUS_TONE: Record<string, string> = {
  Funcionando: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  Quebrado: "border-destructive/40 bg-destructive/10 text-destructive",
  Ausente: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  Inadequado: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700",
};

export default function HLEquipmentInventory() {
  const { equipment, equipmentItems } = useHL();
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [vistoria, setVistoria] = useState<string | null>(null);
  const [vistoriaForm, setVistoriaForm] = useState({ responsavel: "", data: new Date().toISOString().slice(0, 10), observacao: "" });

  const rows = useMemo(() => equipment.map((e) => {
    const totalDisp = e.dispSabonete + e.dispAlcool + e.dispPapel;
    const totalLix = e.lixeirasComuns + e.lixeirasInfectantes;
    const total = totalDisp + totalLix;
    const quebrados = e.dispQuebrados + e.lixeirasQuebradas;
    const funcionando = Math.max(0, total - quebrados - e.ausentes);
    const conformidade = total ? Math.round((funcionando / total) * 100) : 0;
    return { ...e, totalDisp, totalLix, total, quebrados, funcionando, conformidade };
  }), [equipment]);

  const totalDispensers = rows.reduce((s, r) => s + r.totalDisp, 0);
  const totalLixeiras = rows.reduce((s, r) => s + r.totalLix, 0);
  const ausentes = rows.reduce((s, r) => s + r.ausentes, 0);

  const registrarVistoria = () => {
    if (!vistoria || !vistoriaForm.responsavel) { toast.error("Informe o responsável pela vistoria."); return; }
    setHLState((s) => ({
      equipment: s.equipment.map((e) => (e.setor === vistoria ? { ...e, ultimaVistoria: vistoriaForm.data } : e)),
    }));
    toast.success(`Vistoria do setor ${vistoria} registrada.`);
    setVistoria(null);
    setVistoriaForm({ responsavel: "", data: new Date().toISOString().slice(0, 10), observacao: "" });
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Inventário de Dispensers e Lixeiras"
        description={`Estrutura física mapeada do HGNI: ${TOTAL_BANHEIROS} banheiros, ${TOTAL_DISP_QUEBRADOS} dispensers quebrados e ${TOTAL_LIXEIRAS_QUEBRADAS} lixeiras quebradas.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total dispensers" value={totalDispensers} hint={`Funcionando: ${totalDispensers - TOTAL_DISP_QUEBRADOS}`} tone="info" />
        <KpiCard label="Dispensers quebrados" value={TOTAL_DISP_QUEBRADOS} tone="danger" />
        <KpiCard label="Total lixeiras" value={totalLixeiras} hint={`Conformes: ${totalLixeiras - TOTAL_LIXEIRAS_QUEBRADAS}`} tone="info" />
        <KpiCard label="Lixeiras quebradas" value={TOTAL_LIXEIRAS_QUEBRADAS} hint={`Ausentes (geral): ${ausentes}`} tone="danger" />
      </div>

      <SectionCard title="Visão por setor">
        <DataTable
          rows={rows}
          pageSize={12}
          searchKeys={(r) => r.setor}
          columns={[
            { key: "setor", header: "Setor", sortValue: (r) => r.setor, render: (r) => <span className="font-medium">{r.setor}</span> },
            { key: "ban", header: "Banheiros", sortValue: (r) => r.banheiros, render: (r) => r.banheiros },
            { key: "ds", header: "Disp. Sabonete", render: (r) => r.dispSabonete },
            { key: "da", header: "Disp. Álcool", render: (r) => r.dispAlcool },
            { key: "dp", header: "Disp. Papel", render: (r) => r.dispPapel },
            { key: "lc", header: "Lix. Comuns", render: (r) => r.lixeirasComuns },
            { key: "li", header: "Lix. Infectantes", render: (r) => r.lixeirasInfectantes },
            { key: "fn", header: "Funcionando", render: (r) => <span className="text-emerald-600">{r.funcionando}</span> },
            { key: "qb", header: "Quebrados", sortValue: (r) => r.quebrados, render: (r) => <span className="font-semibold text-destructive">{r.quebrados}</span> },
            { key: "au", header: "Ausentes", render: (r) => <span className="text-orange-600">{r.ausentes}</span> },
            { key: "cf", header: "% Conformidade", sortValue: (r) => r.conformidade, render: (r) => (
              <Badge variant="outline" className={
                r.conformidade >= 90 ? STATUS_TONE.Funcionando
                  : r.conformidade >= 70 ? STATUS_TONE.Inadequado : STATUS_TONE.Quebrado
              }>{r.conformidade}%</Badge>
            ) },
            { key: "uv", header: "Última Vistoria", render: (r) => r.ultimaVistoria },
            { key: "ac", header: "Ações", render: (r) => (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setDetalhe(r.setor)}>Detalhar</Button>
                <Button size="sm" variant="ghost" onClick={() => setVistoria(r.setor)}>
                  <ClipboardCheck className="mr-1 h-3.5 w-3.5" />Vistoria
                </Button>
              </div>
            ) },
          ]}
        />
      </SectionCard>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Equipamentos — {detalhe}</DialogTitle></DialogHeader>
          <DataTable
            rows={equipmentItems.filter((i) => i.setor === detalhe)}
            pageSize={10}
            searchKeys={(i) => `${i.id} ${i.tipo} ${i.local}`}
            columns={[
              { key: "id", header: "ID", render: (i) => i.id },
              { key: "tipo", header: "Tipo", render: (i) => i.tipo },
              { key: "local", header: "Local específico", render: (i) => i.local },
              { key: "st", header: "Status", render: (i) => <Badge variant="outline" className={STATUS_TONE[i.status]}>{i.status}</Badge> },
              { key: "resp", header: "Responsável correção", render: (i) => i.responsavel },
              { key: "prazo", header: "Prazo", render: (i) => i.prazo },
              { key: "plano", header: "Plano de ação", render: (i) => i.planoStatus },
            ]}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!vistoria} onOpenChange={(o) => !o && setVistoria(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar vistoria — {vistoria}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Data</Label><Input type="date" value={vistoriaForm.data} onChange={(e) => setVistoriaForm({ ...vistoriaForm, data: e.target.value })} /></div>
            <div><Label>Responsável *</Label><Input value={vistoriaForm.responsavel} onChange={(e) => setVistoriaForm({ ...vistoriaForm, responsavel: e.target.value })} /></div>
            <div><Label>Observação</Label><Input value={vistoriaForm.observacao} onChange={(e) => setVistoriaForm({ ...vistoriaForm, observacao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVistoria(null)}>Cancelar</Button>
            <Button onClick={registrarVistoria}>Salvar vistoria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
