import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Baby, Download, Loader2, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { loadHospitalLogos, renderPdfLogos, type PdfLogo } from "@/lib/pdfLogoUtils";
import { getMaternityRecord } from "@/lib/maternity-service";
import { calculateMaternityIndicators, getMaternityAlerts } from "@/lib/maternity-indicators";
import type { MaternityMonthlyRecord } from "@/lib/maternity-types";
import { MONTH_NAMES } from "@/lib/maternity-types";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

function fmt(value: number | null, suffix = "%") {
  return value === null ? "Sem dado" : `${value}${suffix}`;
}

function fmtDays(value: number | null) {
  return value === null ? "Sem dado" : `${value} dias`;
}

async function generatePdf(
  record: MaternityMonthlyRecord,
  hospitalName: string,
  logos: { hospitalLogo: PdfLogo | null; scihLogos: PdfLogo[] }
) {
  const doc = new jsPDF();
  const indicators = calculateMaternityIndicators(record);
  const alerts = getMaternityAlerts(indicators);
  const period = `${String(record.month).padStart(2, "0")}/${record.year}`;
  const pageW = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 30, "F");
  renderPdfLogos(doc, logos, { x: 14, y: 4, h: 20, pageW });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("IRAS Control — Relatório de Indicadores da Maternidade", pageW / 2, 13, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Hospital: ${hospitalName}    Período: ${period}    Status: ${record.status}`, pageW / 2, 23, { align: "center" });

  doc.setTextColor(0, 0, 0);
  let y = 40;

  // Função auxiliar de seção
  function sectionTitle(title: string) {
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y - 4, pageW - 20, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, 14, y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y += 10;
  }

  function row(label: string, value: string, x2 = 120) {
    doc.text(label, 14, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, x2, y);
    doc.setFont("helvetica", "normal");
    y += 7;
    if (y > 275) { doc.addPage(); y = 20; }
  }

  // Volume obstétrico
  sectionTitle("Volume obstétrico");
  row("Total de admissões:", String(record.total_admissions));
  row("Total de partos:", String(record.total_births));
  row("  Partos vaginais:", String(record.total_vaginal_births));
  row("  Cesarianas:", String(record.total_cesareans));
  y += 3;

  // Ocupação e permanência
  sectionTitle("Ocupação e Tempo Médio de Permanência");
  row("Taxa de ocupação obstétrica:", fmt(indicators.occupancyRate));
  row("Tempo médio de permanência:", fmtDays(indicators.avgLengthOfStay));
  y += 3;

  // Infecção puerperal
  sectionTitle("Monitoramento de Infecção Puerperal e ISC");
  row("Taxa de infecção puerperal:", fmt(indicators.puerperalInfectionRate));
  row("Taxa de ISC pós-cesariana:", fmt(indicators.postCesareanSsiRate));
  row("Taxa de reinternação por infecção puerperal:", fmt(indicators.puerperalInfectionReadmissionRate));
  row("Busca ativa pós-alta:", fmt(indicators.postDischargeSearchRate));
  row("Investigação epidemiológica:", fmt(indicators.epidemiologicalInvestigationRate));
  y += 3;

  // Educação permanente
  sectionTitle("Educação Permanente");
  row("Número de capacitações realizadas:", String(indicators.trainingsCount));
  row("Carga horária mensal:", fmt(indicators.trainingHours, "h"));
  row("Percentual de profissionais capacitados:", fmt(indicators.trainedProfessionalsRate));
  y += 3;

  // Análise crítica
  if (record.analysis) {
    sectionTitle("Análise Crítica");
    const lines = doc.splitTextToSize(record.analysis, pageW - 28);
    doc.setFontSize(9);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 5;
    if (y > 275) { doc.addPage(); y = 20; }
  }

  // Textos padrão de recomendação para casos críticos
  const hasPuerperalInfection = (indicators.puerperalInfectionRate ?? 0) > 0 || (indicators.postCesareanSsiRate ?? 0) > 0;
  const lowPostDischarge = indicators.postDischargeSearchRate !== null && indicators.postDischargeSearchRate < 80;
  const lowTraining = indicators.trainedProfessionalsRate !== null && indicators.trainedProfessionalsRate < 80;

  if (hasPuerperalInfection || lowPostDischarge || lowTraining) {
    sectionTitle("Recomendações Técnicas");

    if (hasPuerperalInfection) {
      const text = "Foi identificada ocorrência de infecção relacionada ao ciclo gravídico-puerperal no período avaliado. Recomenda-se abertura de investigação epidemiológica, revisão de prontuário, avaliação de fatores de risco, análise de antibioticoprofilaxia quando aplicável, revisão de práticas assistenciais e elaboração de plano de ação com responsáveis, prazos e evidências.";
      const lines = doc.splitTextToSize(text, pageW - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 5;
      if (y > 275) { doc.addPage(); y = 20; }
    }

    if (lowPostDischarge) {
      const text = "A cobertura de busca ativa pós-alta encontra-se abaixo do parâmetro institucional sugerido. Recomenda-se fortalecer o fluxo de contato telefônico, retorno ambulatorial, registro padronizado e integração entre SCIH, obstetrícia, ambulatório e emergência para identificação precoce de infecções pós-alta.";
      const lines = doc.splitTextToSize(text, pageW - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 5;
      if (y > 275) { doc.addPage(); y = 20; }
    }

    if (lowTraining) {
      const text = "O percentual de profissionais capacitados encontra-se abaixo da meta sugerida. Recomenda-se cronograma mensal de educação permanente, priorizando classificação de risco obstétrica, prevenção de infecção puerperal, prevenção de ISC pós-cesariana, higiene das mãos, boas práticas de curativo e notificação de eventos infecciosos.";
      const lines = doc.splitTextToSize(text, pageW - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 5;
      if (y > 275) { doc.addPage(); y = 20; }
    }
  }

  // Alertas
  if (alerts.length > 0) {
    sectionTitle("Alertas Identificados");
    alerts.forEach(alert => {
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(`• ${alert.title}`, pageW - 28);
      doc.text(titleLines, 14, y);
      y += titleLines.length * 5;
      doc.setFont("helvetica", "normal");
      const msgLines = doc.splitTextToSize(`  ${alert.message}`, pageW - 30);
      doc.text(msgLines, 16, y);
      y += msgLines.length * 5 + 3;
      if (y > 270) { doc.addPage(); y = 20; }
    });
  }

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`IRAS Control — Módulo Maternidade — ${period}   |   Pág. ${i}/${pageCount}`, 14, 290);
  }

  doc.save(`relatorio_maternidade_${period.replace("/", "_")}.pdf`);
}

export default function MaternityReport() {
  const { hospitalId, hospitalName } = useHospitalContext();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [record, setRecord] = useState<MaternityMonthlyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    async function load() {
      setLoading(true);
      try {
        setRecord(await getMaternityRecord({ hospitalId: hospitalId!, month, year }));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [hospitalId, month, year]);

  const indicators = useMemo(() => record ? calculateMaternityIndicators(record) : null, [record]);

  async function handleGenerate() {
    if (!record) return;
    setGenerating(true);
    try {
      generatePdf(record, hospitalName || "Hospital");
      toast.success("Relatório PDF gerado.");
    } catch (err) {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Baby className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Relatório PDF — Maternidade</h1>
          <p className="text-sm text-muted-foreground">Gerar relatório mensal para gestão e diretoria médica</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Mês</Label>
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.slice(1).map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ano</Label>
              <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </CardContent>
      </Card>

      {!loading && !record && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhum lançamento encontrado para este período.
          </CardContent>
        </Card>
      )}

      {record && indicators && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Prévia do relatório</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <PreviewRow label="Partos" value={String(record.total_births)} />
                <PreviewRow label="Cesarianas" value={String(record.total_cesareans)} />
                <PreviewRow label="Taxa de ocupação" value={fmt(indicators.occupancyRate)} />
                <PreviewRow label="Tempo médio permanência" value={fmtDays(indicators.avgLengthOfStay)} />
                <PreviewRow label="Infecção puerperal" value={fmt(indicators.puerperalInfectionRate)} danger={(indicators.puerperalInfectionRate ?? 0) > 0} />
                <PreviewRow label="ISC pós-cesariana" value={fmt(indicators.postCesareanSsiRate)} danger={(indicators.postCesareanSsiRate ?? 0) > 0} />
                <PreviewRow label="Busca ativa pós-alta" value={fmt(indicators.postDischargeSearchRate)} />
                <PreviewRow label="Investigação epidemiológica" value={fmt(indicators.epidemiologicalInvestigationRate)} />
                <PreviewRow label="Profissionais capacitados" value={fmt(indicators.trainedProfessionalsRate)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Baixar relatório PDF
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function PreviewRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${danger ? "bg-red-50 border-red-200" : "bg-muted/40"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${danger ? "text-red-700" : ""}`}>{value}</div>
    </div>
  );
}
