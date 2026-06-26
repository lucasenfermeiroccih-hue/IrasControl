import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IndicatorsPayload {
  pageTitle: string;
  filters: {
    months: string[]; // names
    years: number[];
    units: string[];
  };
  metrics: {
    totalAdmitted: number;
    totalPatientDays: number;
    deaths: number;
    discharges: number;
    cvcDays: number;
    svuDays: number;
    vmDays: number;
    abCount: number;
    extubations: number;
  };
  specialtyData: Array<{ fullName: string; internacoes: number }>;
  topAntibiotics: Array<{ name: string; value: number }>;
  topOrganisms: Array<{ name: string; value: number }>;
}

function safe(s: string) {
  return String(s ?? "").replace(/[\u0000-\u001F]/g, " ");
}

function buildPrompt(p: IndicatorsPayload) {
  return `Você é um especialista em Controle de Infecção Hospitalar (CCIH) e epidemiologia.
Gere um RELATÓRIO ANALÍTICO em português técnico, baseado APENAS nos dados abaixo, do ${p.pageTitle}.

## Filtros aplicados
- Meses: ${p.filters.months.join(", ") || "Todos"}
- Anos: ${p.filters.years.join(", ") || "Todos"}
- Unidades: ${p.filters.units.join(", ") || "Todas"}

## Indicadores operacionais
- Internações: ${p.metrics.totalAdmitted}
- Paciente-dia: ${p.metrics.totalPatientDays}
- Óbitos: ${p.metrics.deaths}
- Altas: ${p.metrics.discharges}
- CVC dias-dispositivo: ${p.metrics.cvcDays}
- SVD dias-dispositivo: ${p.metrics.svuDays}
- VM dias-dispositivo: ${p.metrics.vmDays}
- Antimicrobianos prescritos: ${p.metrics.abCount}
- Extubações: ${p.metrics.extubations}

## Internações por especialidade
${p.specialtyData.map((s) => `- ${s.fullName}: ${s.internacoes}`).join("\n")}

## Top antibióticos mais utilizados
${p.topAntibiotics.map((a, i) => `${i + 1}. ${a.name}: ${a.value}`).join("\n") || "Nenhum"}

## Top microrganismos isolados
${p.topOrganisms.map((m, i) => `${i + 1}. ${m.name}: ${m.value}`).join("\n") || "Nenhum"}

Estruture o relatório com as seguintes seções (use ## para títulos):
## Resumo Executivo
## Análise de Internações e Desfechos
## Análise de Dispositivos Invasivos (densidade por 1000 pac-dia quando aplicável)
## Análise Microbiológica e Uso de Antimicrobianos
## Recomendações Clínicas e de Vigilância
## Conclusão

Use linguagem técnica, cite números, calcule taxas (mortalidade, densidades de uso de dispositivos por 1000 pac-dia) e dê recomendações práticas. NÃO invente dados além dos fornecidos. Não use markdown além de ## para títulos e listas com hífen.`;
}

function renderMarkdownToPdf(doc: jsPDF, markdown: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const lines = markdown.split("\n");
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      y += 3;
      continue;
    }
    if (line.startsWith("## ")) {
      ensure(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(20, 90, 80);
      const wrapped = doc.splitTextToSize(line.replace(/^##\s+/, ""), maxWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 6 + 2;
      doc.setTextColor(0, 0, 0);
      continue;
    }
    if (line.startsWith("# ")) {
      ensure(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      const wrapped = doc.splitTextToSize(line.replace(/^#\s+/, ""), maxWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 7 + 2;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const text = "• " + line.replace(/^[-*]\s+/, "");
      const wrapped = doc.splitTextToSize(text, maxWidth - 4);
      ensure(wrapped.length * 5);
      doc.text(wrapped, margin + 4, y);
      y += wrapped.length * 5 + 1;
      continue;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const wrapped = doc.splitTextToSize(line.replace(/\*\*/g, ""), maxWidth);
    ensure(wrapped.length * 5);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5 + 1;
  }
}

function renderHeader(doc: jsPDF, p: IndicatorsPayload) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(20, 90, 80);
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Relatório de Indicadores Operacionais — Pacientes", 15, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sub = `Período: ${p.filters.months.join(", ") || "Todos os meses"} / ${p.filters.years.join(", ") || "Todos os anos"}  ·  Unidades: ${p.filters.units.join(", ") || "Todas"}`;
  doc.text(sub, 15, 17);
  doc.setTextColor(0, 0, 0);
}

function renderMetricsTable(doc: jsPDF, p: IndicatorsPayload, startY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const colW = maxWidth / 3;
  const rows: Array<[string, string]> = [
    ["Internações", String(p.metrics.totalAdmitted)],
    ["Paciente-dia", String(p.metrics.totalPatientDays)],
    ["Óbitos", String(p.metrics.deaths)],
    ["Altas", String(p.metrics.discharges)],
    ["CVC pac-dia", String(p.metrics.cvcDays)],
    ["SVD pac-dia", String(p.metrics.svuDays)],
    ["VM pac-dia", String(p.metrics.vmDays)],
    ["Antimicrobianos", String(p.metrics.abCount)],
    ["Extubações", String(p.metrics.extubations)],
  ];
  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo de Indicadores", margin, y);
  y += 4;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (let i = 0; i < rows.length; i += 3) {
    for (let j = 0; j < 3 && i + j < rows.length; j++) {
      const [label, value] = rows[i + j];
      const x = margin + j * colW;
      doc.setTextColor(110);
      doc.text(label, x, y);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(value, x, y + 5);
      doc.setFont("helvetica", "normal");
    }
    y += 12;
  }
  return y + 2;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as IndicatorsPayload;
    if (!payload || !payload.metrics) {
      return new Response(JSON.stringify({ error: "Missing payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call OpenAI
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um analista clínico CCIH. Gere relatórios técnicos objetivos e baseados em dados." },
          { role: "user", content: buildPrompt(payload) },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const aiContent: string = safe(aiData?.choices?.[0]?.message?.content || "Sem conteúdo gerado.");

    // Build PDF
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    renderHeader(doc, payload);
    let y = 28;
    y = renderMetricsTable(doc, payload, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Análise gerada por IA", 15, y + 2);
    y += 6;
    doc.setDrawColor(220);
    doc.line(15, y, doc.internal.pageSize.getWidth() - 15, y);
    y += 4;

    // Apply current y as starting point for markdown render
    // We re-implement a tiny pointer by adding a temporary state
    const startY = y;
    // Render markdown but we need to start at startY; tweak by drawing a spacer
    // Simpler: just call renderMarkdownToPdf but insert blank lines till y?
    // We'll instead write an internal renderer with offset:
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let cy = startY;
    const ensure = (h: number) => {
      if (cy + h > pageHeight - margin) {
        doc.addPage();
        cy = margin;
      }
    };
    for (const raw of aiContent.split("\n")) {
      const line = raw.trimEnd();
      if (!line.trim()) { cy += 3; continue; }
      if (line.startsWith("## ")) {
        ensure(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(20, 90, 80);
        const w = doc.splitTextToSize(line.replace(/^##\s+/, ""), maxWidth);
        doc.text(w, margin, cy);
        cy += w.length * 6 + 2;
        doc.setTextColor(0);
        continue;
      }
      if (line.startsWith("# ")) {
        ensure(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        const w = doc.splitTextToSize(line.replace(/^#\s+/, ""), maxWidth);
        doc.text(w, margin, cy);
        cy += w.length * 7 + 2;
        continue;
      }
      if (/^[-*]\s+/.test(line)) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const text = "• " + line.replace(/^[-*]\s+/, "").replace(/\*\*/g, "");
        const w = doc.splitTextToSize(text, maxWidth - 4);
        ensure(w.length * 5);
        doc.text(w, margin + 4, cy);
        cy += w.length * 5 + 1;
        continue;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const w = doc.splitTextToSize(line.replace(/\*\*/g, ""), maxWidth);
      ensure(w.length * 5);
      doc.text(w, margin, cy);
      cy += w.length * 5 + 1;
    }

    // Footer page numbers
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(
        `Gerado em ${new Date().toLocaleString("pt-BR")} · Página ${i} de ${pages}`,
        15,
        doc.internal.pageSize.getHeight() - 6,
      );
    }

    const arrayBuffer = doc.output("arraybuffer");
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return new Response(JSON.stringify({ pdfBase64: base64, aiContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dashboard-pdf-report error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
