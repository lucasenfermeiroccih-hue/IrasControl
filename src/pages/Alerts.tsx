import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bell, AlertTriangle, ShieldAlert, CheckCircle, ArrowUpRight, Microscope, Pill, Activity, ThermometerSun } from "lucide-react";

type Priority = "critico" | "alto" | "medio" | "baixo";
type AlertType = "resistencia" | "surto" | "indicador" | "dispositivo" | "cultura";

interface Alert {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: Priority;
  tipo: AlertType;
  setor: string;
  dataHora: string;
  acaoSugerida: string;
  resolvido: boolean;
}

const priorityConfig: Record<Priority, { label: string; color: string; variant: "destructive" | "default" | "secondary" | "outline" }> = {
  critico: { label: "Crítico", color: "text-red-600", variant: "destructive" },
  alto: { label: "Alto", color: "text-orange-600", variant: "default" },
  medio: { label: "Médio", color: "text-yellow-600", variant: "secondary" },
  baixo: { label: "Baixo", color: "text-blue-600", variant: "outline" },
};

const typeIcons: Record<AlertType, typeof Bell> = {
  resistencia: Microscope,
  surto: ShieldAlert,
  indicador: Activity,
  dispositivo: ThermometerSun,
  cultura: Pill,
};

const typeLabels: Record<AlertType, string> = {
  resistencia: "Resistência", surto: "Surto", indicador: "Indicador", dispositivo: "Dispositivo", cultura: "Cultura",
};

const initialAlerts: Alert[] = [
  { id: "ALT-001", titulo: "KPC detectada em hemocultura", descricao: "Paciente P-10234 da UTI Adulto com KPC em hemocultura coletada em 26/03. Sensível apenas a polimixina e tigeciclina.", prioridade: "critico", tipo: "resistencia", setor: "UTI Adulto", dataHora: "2026-03-28 08:30", acaoSugerida: "Acionar precauções de contato imediatas. Notificar CCIH. Revisar esquema antimicrobiano.", resolvido: false },
  { id: "ALT-002", titulo: "Surto Acinetobacter — 3 casos em 48h", descricao: "Três pacientes dos leitos 5, 6 e 8 da UTI Adulto com culturas positivas para Acinetobacter baumannii MR nas últimas 48 horas.", prioridade: "critico", tipo: "surto", setor: "UTI Adulto", dataHora: "2026-03-28 07:15", acaoSugerida: "Investigar fonte comum. Reforçar limpeza terminal. Coletar culturas ambientais.", resolvido: false },
  { id: "ALT-003", titulo: "Taxa IPCS-CVC acima da meta", descricao: "A densidade de incidência de IPCS-CVC na UTI Adulto atingiu 6.2/1000 CVC-dia, acima da meta de 5.0.", prioridade: "alto", tipo: "indicador", setor: "UTI Adulto", dataHora: "2026-03-27 18:00", acaoSugerida: "Revisar adesão ao bundle CVC. Intensificar auditorias. Discutir em reunião CCIH.", resolvido: false },
  { id: "ALT-004", titulo: "Adesão higiene mãos < 50%", descricao: "A adesão à higiene das mãos no Pronto Socorro caiu para 42% na última semana.", prioridade: "alto", tipo: "indicador", setor: "Pronto Socorro", dataHora: "2026-03-27 14:30", acaoSugerida: "Reforçar treinamento. Verificar dispensers. Feedback individual.", resolvido: false },
  { id: "ALT-005", titulo: "CVC > 14 dias sem reavaliação", descricao: "Paciente P-10890 da UTI Neonatal com CVC há 16 dias sem registro de reavaliação de necessidade.", prioridade: "alto", tipo: "dispositivo", setor: "UTI Neonatal", dataHora: "2026-03-27 10:00", acaoSugerida: "Solicitar reavaliação médica de necessidade do CVC.", resolvido: false },
  { id: "ALT-006", titulo: "VRE em urocultura", descricao: "Paciente P-11023 da Enfermaria A com VRE isolado em urocultura.", prioridade: "medio", tipo: "resistencia", setor: "Enfermaria A", dataHora: "2026-03-27 09:45", acaoSugerida: "Instalar precauções de contato. Notificar CCIH.", resolvido: false },
  { id: "ALT-007", titulo: "Dispenser álcool vazio — UTI Ped.", descricao: "Dois dispensers de álcool gel na UTI Pediátrica estão vazios há mais de 4 horas.", prioridade: "medio", tipo: "dispositivo", setor: "UTI Pediátrica", dataHora: "2026-03-28 06:00", acaoSugerida: "Solicitar reposição imediata ao setor de suprimentos.", resolvido: true },
  { id: "ALT-008", titulo: "MRSA em swab admissional", descricao: "Paciente P-11345 admitido no PS com MRSA em swab nasal.", prioridade: "medio", tipo: "cultura", setor: "Pronto Socorro", dataHora: "2026-03-26 20:00", acaoSugerida: "Instalar precauções de contato. Avaliar descolonização.", resolvido: false },
  { id: "ALT-009", titulo: "Taxa PAV acima do percentil 75", descricao: "Densidade de PAV na UTI Adulto em 8.1/1000 VM-dia, acima do percentil 75 NHSN.", prioridade: "alto", tipo: "indicador", setor: "UTI Adulto", dataHora: "2026-03-26 18:00", acaoSugerida: "Auditar bundle PAV. Verificar elevação de cabeceira e pausa de sedação.", resolvido: false },
  { id: "ALT-010", titulo: "Candida auris — caso suspeito", descricao: "Paciente P-11200 com cultura de ponta de CVC positiva para Candida sp. em identificação.", prioridade: "critico", tipo: "resistencia", setor: "UTI Adulto", dataHora: "2026-03-26 15:30", acaoSugerida: "Aguardar identificação. Preparar isolamento preventivo. Notificar vigilância.", resolvido: false },
  { id: "ALT-011", titulo: "SVD > 7 dias — Enfermaria B", descricao: "3 pacientes na Enfermaria B com SVD há mais de 7 dias sem reavaliação.", prioridade: "medio", tipo: "dispositivo", setor: "Enfermaria B", dataHora: "2026-03-26 12:00", acaoSugerida: "Solicitar reavaliação de indicação de SVD.", resolvido: true },
  { id: "ALT-012", titulo: "Hemoculturas pendentes > 48h", descricao: "5 hemoculturas coletadas na UTI Neonatal há mais de 48h sem resultado liberado.", prioridade: "baixo", tipo: "cultura", setor: "UTI Neonatal", dataHora: "2026-03-26 10:00", acaoSugerida: "Contatar laboratório para agilizar liberação.", resolvido: false },
  { id: "ALT-013", titulo: "ESBL em cultura de secreção", descricao: "Paciente P-10567 com E. coli ESBL em cultura de secreção de ferida operatória.", prioridade: "medio", tipo: "resistencia", setor: "CC", dataHora: "2026-03-25 16:00", acaoSugerida: "Ajustar antibioticoterapia. Precauções de contato.", resolvido: true },
  { id: "ALT-014", titulo: "Limpeza terminal atrasada", descricao: "Leito 12 da UTI Adulto após alta de paciente com KPC não passou por limpeza terminal.", prioridade: "alto", tipo: "dispositivo", setor: "UTI Adulto", dataHora: "2026-03-25 14:00", acaoSugerida: "Não admitir novo paciente até limpeza terminal concluída.", resolvido: true },
  { id: "ALT-015", titulo: "Consumo carbapenêmicos +30%", descricao: "O consumo de carbapenêmicos na UTI Adulto aumentou 30% no último mês em relação à média trimestral.", prioridade: "baixo", tipo: "indicador", setor: "UTI Adulto", dataHora: "2026-03-25 09:00", acaoSugerida: "Revisar prescrições. Discutir stewardship com farmácia clínica.", resolvido: false },
];

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [filterPriority, setFilterPriority] = useState("todos");
  const [filterType, setFilterType] = useState("todos");
  const [filterSetor, setFilterSetor] = useState("todos");
  const [detail, setDetail] = useState<Alert | null>(null);

  const filtered = alerts.filter((a) => {
    if (filterPriority !== "todos" && a.prioridade !== filterPriority) return false;
    if (filterType !== "todos" && a.tipo !== filterType) return false;
    if (filterSetor !== "todos" && a.setor !== filterSetor) return false;
    return true;
  });

  const setores = [...new Set(alerts.map((a) => a.setor))];

  const kpis = {
    total: alerts.length,
    criticosAtivos: alerts.filter((a) => a.prioridade === "critico" && !a.resolvido).length,
    resolvidosHoje: alerts.filter((a) => a.resolvido && a.dataHora.startsWith("2026-03-28")).length,
    pendentes: alerts.filter((a) => !a.resolvido).length,
  };

  const handleResolve = (id: string) => {
    setAlerts(alerts.map((a) => a.id === id ? { ...a, resolvido: true } : a));
    toast.success("Alerta resolvido!");
    setDetail(null);
  };

  const handleEscalate = (id: string) => {
    toast.info("Alerta escalado para coordenação CCIH.");
    setDetail(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas Críticos</h1>
          <p className="text-muted-foreground">Central de alertas e notificações do sistema</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><Bell className="mx-auto h-8 w-8 text-primary mb-2" /><p className="text-2xl font-bold">{kpis.total}</p><p className="text-sm text-muted-foreground">Total Alertas</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" /><p className="text-2xl font-bold">{kpis.criticosAtivos}</p><p className="text-sm text-muted-foreground">Críticos Ativos</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" /><p className="text-2xl font-bold">{kpis.resolvidosHoje}</p><p className="text-sm text-muted-foreground">Resolvidos Hoje</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-yellow-600 mb-2" /><p className="text-2xl font-bold">{kpis.pendentes}</p><p className="text-sm text-muted-foreground">Pendentes</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Prioridade</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
            <SelectItem value="alto">Alto</SelectItem>
            <SelectItem value="medio">Médio</SelectItem>
            <SelectItem value="baixo">Baixo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Tipo</SelectItem>
            <SelectItem value="resistencia">Resistência</SelectItem>
            <SelectItem value="surto">Surto</SelectItem>
            <SelectItem value="indicador">Indicador</SelectItem>
            <SelectItem value="dispositivo">Dispositivo</SelectItem>
            <SelectItem value="cultura">Cultura</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSetor} onValueChange={setFilterSetor}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Setor</SelectItem>
            {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.map((alert) => {
          const Icon = typeIcons[alert.tipo];
          const pc = priorityConfig[alert.prioridade];
          return (
            <Card key={alert.id} className={`cursor-pointer transition-colors hover:bg-muted/30 ${alert.resolvido ? "opacity-60" : ""}`} onClick={() => setDetail(alert)}>
              <CardContent className="flex items-start gap-4 py-4">
                <div className={`mt-0.5 ${pc.color}`}><Icon className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={pc.variant} className="text-xs">{pc.label}</Badge>
                    <Badge variant="outline" className="text-xs">{typeLabels[alert.tipo]}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{alert.dataHora}</span>
                  </div>
                  <h3 className={`font-semibold text-sm ${alert.resolvido ? "line-through" : ""}`}>{alert.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{alert.descricao}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{alert.setor}</Badge>
                    {alert.resolvido && <Badge variant="secondary" className="text-xs">Resolvido</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Badge variant={priorityConfig[detail.prioridade].variant}>{priorityConfig[detail.prioridade].label}</Badge>{detail.titulo}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 text-xs"><Badge variant="outline">{typeLabels[detail.tipo]}</Badge><Badge variant="outline">{detail.setor}</Badge><span className="text-muted-foreground ml-auto">{detail.dataHora}</span></div>
                <p className="text-sm">{detail.descricao}</p>
                <div className="bg-muted/50 p-3 rounded-md">
                  <h4 className="text-sm font-semibold mb-1">Ação Sugerida</h4>
                  <p className="text-sm text-muted-foreground">{detail.acaoSugerida}</p>
                </div>
                {!detail.resolvido && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleResolve(detail.id)}><CheckCircle className="mr-1 h-4 w-4" />Resolver</Button>
                    <Button size="sm" variant="outline" onClick={() => handleEscalate(detail.id)}><ArrowUpRight className="mr-1 h-4 w-4" />Escalar</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alerts;
