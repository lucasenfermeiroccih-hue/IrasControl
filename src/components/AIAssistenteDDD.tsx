import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, AlertTriangle, Loader2, Copy, Check } from "lucide-react";
import { DDDRegistroMensal } from "@/data/antimicrobianos-ddd";
import { generateAIReport, generateAIInsights, generateAIAlerts, AIAnalysisInput } from "@/lib/ddd-ai-engine";
import { toast } from "sonner";

interface Props {
  filtered: DDDRegistroMensal[];
  all: DDDRegistroMensal[];
  filtroMes: string;
  filtroAno: string;
}

export default function AIAssistenteDDD({ filtered, all, filtroMes, filtroAno }: Props) {
  const [activeTab, setActiveTab] = useState("relatorio");
  const [output, setOutput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const input: AIAnalysisInput = { filtered, all, filtroMes, filtroAno };

  const generate = useCallback((type: "relatorio" | "insights" | "alertas") => {
    setLoading(true);
    setActiveTab(type);

    // Simula latência de processamento
    setTimeout(() => {
      let result: string;
      switch (type) {
        case "relatorio": result = generateAIReport(input); break;
        case "insights": result = generateAIInsights(input); break;
        case "alertas": result = generateAIAlerts(input); break;
      }
      setOutput(prev => ({ ...prev, [type]: result }));
      setLoading(false);
    }, 800 + Math.random() * 700);
  }, [input]);

  const handleCopy = useCallback(() => {
    const text = output[activeTab];
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Texto copiado!");
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output, activeTab]);

  const currentOutput = output[activeTab] || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" /> Agente de IA — Análise DDD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => generate("relatorio")} disabled={loading} className="gap-2">
            {loading && activeTab === "relatorio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar Relatório
          </Button>
          <Button variant="outline" onClick={() => generate("insights")} disabled={loading} className="gap-2">
            {loading && activeTab === "insights" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar Insights
          </Button>
          <Button variant="outline" onClick={() => generate("alertas")} disabled={loading} className="gap-2">
            {loading && activeTab === "alertas" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Gerar Alertas
          </Button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando dados... Processando {filtered.length} registros.
          </div>
        )}

        {!loading && (output.relatorio || output.insights || output.alertas) && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                {output.relatorio && <TabsTrigger value="relatorio">Relatório</TabsTrigger>}
                {output.insights && <TabsTrigger value="insights">Insights</TabsTrigger>}
                {output.alertas && <TabsTrigger value="alertas">Alertas</TabsTrigger>}
              </TabsList>
              {currentOutput && (
                <Button size="sm" variant="ghost" onClick={handleCopy} className="gap-1.5 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              )}
            </div>

            {["relatorio", "insights", "alertas"].map(tab => (
              <TabsContent key={tab} value={tab}>
                {output[tab] && (
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                      {output[tab]}
                    </pre>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
