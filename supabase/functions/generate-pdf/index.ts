import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function generatePdfHtml(type: string, data: any, hospitalName: string): string {
  const date = new Date().toLocaleDateString("pt-BR");
  const header = `
    <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #16a085;padding-bottom:16px;">
      <h1 style="color:#16a085;margin:0;font-size:22px;">IRASControl</h1>
      <p style="color:#666;margin:4px 0;font-size:12px;">${escapeHtml(hospitalName)}</p>
      <p style="color:#999;margin:0;font-size:11px;">Gerado em ${date}</p>
    </div>
  `;

  if (type === "dashboard") {
    const d = data;
    return `<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:40px;color:#333;font-size:13px;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;font-size:12px;}</style></head><body>
      ${header}
      <h2 style="font-size:16px;">Relatório do Dashboard</h2>
      <table>
        <tr><th>Indicador</th><th>Valor</th></tr>
        <tr><td>Pacientes Monitorados</td><td>${d.totalPatients}</td></tr>
        <tr><td>Casos Suspeitos</td><td>${d.suspectCases}</td></tr>
        <tr><td>IRAS Confirmadas</td><td>${d.confirmedCases}</td></tr>
        <tr><td>Taxa de Conformidade</td><td>${d.complianceRate}%</td></tr>
        <tr><td>Alertas Ativos</td><td>${d.activeAlerts}</td></tr>
      </table>
      ${d.irasBySector?.length > 0 ? `
        <h3 style="font-size:14px;margin-top:24px;">IRAS por Setor</h3>
        <table>
          <tr><th>Setor</th><th>Taxa (%)</th></tr>
          ${d.irasBySector.map((s: any) => `<tr><td>${escapeHtml(s.setor)}</td><td>${s.taxa}</td></tr>`).join("")}
        </table>
      ` : ""}
      ${d.topMicro?.length > 0 ? `
        <h3 style="font-size:14px;margin-top:24px;">Top Microrganismos</h3>
        <table>
          <tr><th>Organismo</th><th>Isolados</th></tr>
          ${d.topMicro.map((m: any) => `<tr><td>${escapeHtml(m.name)}</td><td>${m.count}</td></tr>`).join("")}
        </table>
      ` : ""}
    </body></html>`;
  }

  if (type === "cases") {
    const d = data;
    return `<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:40px;color:#333;font-size:13px;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;font-size:12px;}</style></head><body>
      ${header}
      <h2 style="font-size:16px;">Relatório de Casos de Investigação</h2>
      <table>
        <tr><th>Indicador</th><th>Valor</th></tr>
        <tr><td>Abertos</td><td>${d.kpis?.abertos || 0}</td></tr>
        <tr><td>Em Investigação</td><td>${d.kpis?.emInvestigacao || 0}</td></tr>
        <tr><td>Confirmados</td><td>${d.kpis?.confirmados || 0}</td></tr>
        <tr><td>Encerrados</td><td>${d.kpis?.encerrados || 0}</td></tr>
      </table>
      <h3 style="font-size:14px;margin-top:24px;">Lista de Casos</h3>
      <table>
        <tr><th>ID</th><th>Paciente</th><th>Setor</th><th>Evento</th><th>Status</th><th>Data</th></tr>
        ${(d.cases || []).map((c: any) => `<tr><td>${escapeHtml(c.id)}</td><td>${escapeHtml(c.paciente)}</td><td>${escapeHtml(c.setor)}</td><td>${escapeHtml(c.evento)}</td><td>${escapeHtml(c.status)}</td><td>${escapeHtml(c.data)}</td></tr>`).join("")}
      </table>
    </body></html>`;
  }

  if (type === "microorganisms") {
    const d = data;
    return `<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:40px;color:#333;font-size:13px;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;font-size:12px;}</style></head><body>
      ${header}
      <h2 style="font-size:16px;">Relatório de Microorganismos</h2>
      <p>Total de registros: <strong>${d.total}</strong></p>
      ${d.distribution?.length > 0 ? `
        <h3 style="font-size:14px;margin-top:24px;">Distribuição</h3>
        <table>
          <tr><th>Organismo</th><th>Total</th></tr>
          ${d.distribution.map((item: any) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.total}</td></tr>`).join("")}
        </table>
      ` : ""}
      <h3 style="font-size:14px;margin-top:24px;">Registros</h3>
      <table>
        <tr><th>Data</th><th>Prontuário</th><th>Setor</th><th>Tipo</th><th>Microorganismo</th></tr>
        ${(d.records || []).slice(0, 100).map((r: any) => `<tr><td>${escapeHtml(r.data)}</td><td>${escapeHtml(r.prontuario)}</td><td>${escapeHtml(r.setor)}</td><td>${escapeHtml(r.tipo)}</td><td>${escapeHtml(r.microorganismo)}</td></tr>`).join("")}
      </table>
    </body></html>`;
  }

  if (type === "patients") {
    const d = data;
    return `<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:40px;color:#333;font-size:13px;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;font-size:12px;}</style></head><body>
      ${header}
      <h2 style="font-size:16px;">Relatório de Pacientes</h2>
      <p>Total: <strong>${d.total}</strong></p>
      <table>
        <tr><th>Paciente</th><th>Prontuário</th><th>Setor</th><th>Leito</th><th>Status</th><th>Admissão</th></tr>
        ${(d.patients || []).map((p: any) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.record)}</td><td>${escapeHtml(p.sector)}</td><td>${escapeHtml(p.bed)}</td><td>${escapeHtml(p.status)}</td><td>${escapeHtml(p.admission)}</td></tr>`).join("")}
      </table>
    </body></html>`;
  }

  if (type === "alerts") {
    const d = data;
    return `<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:40px;color:#333;font-size:13px;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;font-size:12px;}</style></head><body>
      ${header}
      <h2 style="font-size:16px;">Relatório de Alertas</h2>
      <table>
        <tr><th>Título</th><th>Severidade</th><th>Status</th><th>Data</th></tr>
        ${(d.alerts || []).map((a: any) => `<tr><td>${escapeHtml(a.title)}</td><td>${escapeHtml(a.severity)}</td><td>${escapeHtml(a.status)}</td><td>${escapeHtml(a.date)}</td></tr>`).join("")}
      </table>
    </body></html>`;
  }

  if (type === "audits") {
    const d = data;
    return `<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:40px;color:#333;font-size:13px;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;font-size:12px;}</style></head><body>
      ${header}
      <h2 style="font-size:16px;">Relatório de Auditorias</h2>
      <table>
        <tr><th>Tipo</th><th>Setor</th><th>Data</th><th>Conformidade</th><th>Itens</th></tr>
        ${(d.audits || []).map((a: any) => `<tr><td>${escapeHtml(a.type)}</td><td>${escapeHtml(a.sector)}</td><td>${escapeHtml(a.date)}</td><td>${a.compliance}%</td><td>${a.compliant}/${a.total}</td></tr>`).join("")}
      </table>
    </body></html>`;
  }

  return `<html><body>${header}<p>Tipo de relatório não reconhecido: ${escapeHtml(type)}</p></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { type, hospitalId, data } = await req.json();

    if (!type || !data) {
      return json({ error: "type e data são obrigatórios" }, 400);
    }

    // Get hospital name
    let hospitalName = "Hospital";
    if (hospitalId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: hospital } = await adminClient
        .from("hospitals")
        .select("name")
        .eq("id", hospitalId)
        .single();
      if (hospital) hospitalName = hospital.name;
    }

    const html = generatePdfHtml(type, data, hospitalName);

    // Convert HTML to a simple printable page and return as base64
    // Since we don't have a PDF renderer in edge functions, we return HTML
    // that the client can print to PDF, or we encode it as a simple PDF-like format
    
    // For now, generate a minimal PDF with the HTML content embedded
    // Using a simple text-based PDF generation
    const pdfContent = generateMinimalPdf(html, type, hospitalName, data);

    return json({ pdf: pdfContent, html });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});

function generateMinimalPdf(html: string, type: string, hospitalName: string, data: any): string {
  // Generate a simple PDF using raw PDF syntax
  const date = new Date().toLocaleDateString("pt-BR");
  
  // Build text content for PDF
  let textLines: string[] = [];
  textLines.push("IRASControl - " + hospitalName);
  textLines.push("Gerado em " + date);
  textLines.push("");
  
  if (type === "dashboard") {
    textLines.push("RELATORIO DO DASHBOARD");
    textLines.push("");
    textLines.push("Pacientes Monitorados: " + data.totalPatients);
    textLines.push("Casos Suspeitos: " + data.suspectCases);
    textLines.push("IRAS Confirmadas: " + data.confirmedCases);
    textLines.push("Taxa de Conformidade: " + data.complianceRate + "%");
    textLines.push("Alertas Ativos: " + data.activeAlerts);
    if (data.irasBySector?.length > 0) {
      textLines.push("");
      textLines.push("IRAS POR SETOR:");
      data.irasBySector.forEach((s: any) => textLines.push("  " + s.setor + ": " + s.taxa + "%"));
    }
    if (data.topMicro?.length > 0) {
      textLines.push("");
      textLines.push("TOP MICRORGANISMOS:");
      data.topMicro.forEach((m: any) => textLines.push("  " + m.name + ": " + m.count + " isolados"));
    }
  } else if (type === "cases") {
    textLines.push("RELATORIO DE CASOS DE INVESTIGACAO");
    textLines.push("");
    textLines.push("Abertos: " + (data.kpis?.abertos || 0));
    textLines.push("Em Investigacao: " + (data.kpis?.emInvestigacao || 0));
    textLines.push("Confirmados: " + (data.kpis?.confirmados || 0));
    textLines.push("Encerrados: " + (data.kpis?.encerrados || 0));
    textLines.push("");
    (data.cases || []).forEach((c: any) => {
      textLines.push(c.id + " | " + c.paciente + " | " + c.setor + " | " + c.evento + " | " + c.status + " | " + c.data);
    });
  } else if (type === "microorganisms") {
    textLines.push("RELATORIO DE MICROORGANISMOS");
    textLines.push("Total: " + data.total);
    textLines.push("");
    if (data.distribution?.length > 0) {
      textLines.push("DISTRIBUICAO:");
      data.distribution.forEach((d: any) => textLines.push("  " + d.name + ": " + d.total));
    }
    textLines.push("");
    (data.records || []).slice(0, 50).forEach((r: any) => {
      textLines.push(r.data + " | " + r.prontuario + " | " + r.setor + " | " + r.tipo + " | " + r.microorganismo);
    });
  } else if (type === "patients") {
    textLines.push("RELATORIO DE PACIENTES");
    textLines.push("Total: " + data.total);
    textLines.push("");
    (data.patients || []).forEach((p: any) => {
      textLines.push(p.name + " | " + p.record + " | " + p.sector + " | " + p.bed + " | " + p.status);
    });
  } else if (type === "alerts") {
    textLines.push("RELATORIO DE ALERTAS");
    textLines.push("");
    (data.alerts || []).forEach((a: any) => {
      textLines.push(a.title + " | " + a.severity + " | " + a.status + " | " + a.date);
    });
  } else if (type === "audits") {
    textLines.push("RELATORIO DE AUDITORIAS");
    textLines.push("");
    (data.audits || []).forEach((a: any) => {
      textLines.push(a.type + " | " + a.sector + " | " + a.date + " | " + a.compliance + "% | " + a.compliant + "/" + a.total);
    });
  }

  // Build a minimal valid PDF
  const content = textLines.join("\n");
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);
  
  // PDF structure
  const objects: string[] = [];
  
  // Object 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  
  // Object 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  
  // Object 4: Font
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  
  // Build page content with text operations
  let streamContent = "BT\n/F1 10 Tf\n";
  let y = 780;
  const maxWidth = 80; // chars per line approx
  
  for (const line of textLines) {
    if (y < 40) break; // page overflow protection
    // Escape PDF special chars
    const escaped = line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      // Remove non-ASCII for basic PDF compatibility
      .replace(/[^\x20-\x7E]/g, "?");
    
    if (escaped.length > maxWidth) {
      // Word wrap
      let remaining = escaped;
      while (remaining.length > 0 && y >= 40) {
        const chunk = remaining.substring(0, maxWidth);
        remaining = remaining.substring(maxWidth);
        streamContent += `1 0 0 1 40 ${y} Tm\n(${chunk}) Tj\n`;
        y -= 14;
      }
    } else {
      streamContent += `1 0 0 1 40 ${y} Tm\n(${escaped}) Tj\n`;
      y -= 14;
    }
  }
  streamContent += "ET";
  
  // Object 5: Stream
  const streamBytes = encoder.encode(streamContent);
  objects.push(`5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj`);
  
  // Object 3: Page
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj");
  
  // Build final PDF
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  
  // Sort objects by number
  const sorted = [objects[0], objects[1], objects[4], objects[3], objects[2]]; // 1,2,4,3,5 → sort by obj num
  const objOrder = [
    { num: 1, content: objects[0] },
    { num: 2, content: objects[1] },
    { num: 3, content: objects[4] },
    { num: 4, content: objects[2] },
    { num: 5, content: objects[3] },
  ];
  
  for (const obj of objOrder) {
    offsets[obj.num] = pdf.length;
    pdf += obj.content + "\n";
  }
  
  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objOrder.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objOrder.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  
  pdf += "trailer\n";
  pdf += `<< /Size ${objOrder.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += xrefOffset + "\n";
  pdf += "%%EOF";
  
  // Convert to base64
  const pdfBytes = encoder.encode(pdf);
  const binary = Array.from(pdfBytes).map(b => String.fromCharCode(b)).join("");
  return btoa(binary);
}
