import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AuditItemPayload {
  question: string;
  status: string;
  observation?: string | null;
}

interface AuditPayload {
  typeLabel: string;
  date: string;
  sector?: string | null;
  complianceRate?: number | null;
  compliantItems?: number;
  totalItems?: number;
  observations?: string | null;
  items?: AuditItemPayload[];
}

const STATUS_LABEL: Record<string, string> = {
  compliant: "Conforme",
  non_compliant: "Não conforme",
  not_applicable: "Não se aplica",
};

const STATUS_COLOR: Record<string, string> = {
  compliant: "#16a34a",
  non_compliant: "#dc2626",
  not_applicable: "#6b7280",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: string): string {
  // d expected as "YYYY-MM-DD"
  if (!d) return "—";
  const parts = d.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function buildAuditHtml(audit: AuditPayload): string {
  const items = audit.items || [];
  const rows = items.map((it) => {
    const color = STATUS_COLOR[it.status] || "#6b7280";
    const label = STATUS_LABEL[it.status] || it.status;
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px;">${escapeHtml(it.question)}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px;color:${color};font-weight:600;white-space:nowrap;">${label}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px;color:#374151;">${it.observation ? escapeHtml(it.observation) : "—"}</td>
    </tr>`;
  }).join("");

  const naoConformes = items.filter((it) => it.status === "non_compliant");
  const ncList = naoConformes.length > 0
    ? `<ul style="margin:8px 0 0;padding-left:18px;">${naoConformes.map((it) =>
        `<li style="font-size:13px;color:#374151;margin-bottom:4px;">${escapeHtml(it.question)}${it.observation ? ` — <em>${escapeHtml(it.observation)}</em>` : ""}</li>`,
      ).join("")}</ul>`
    : `<p style="font-size:13px;color:#16a34a;margin:8px 0 0;">Nenhuma não conformidade identificada nesta auditoria.</p>`;

  const compliance = typeof audit.complianceRate === "number" ? `${audit.complianceRate.toFixed(1)}%` : "—";

  return `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0;background:#f9fafb;">
      <h3 style="margin:0 0 10px;font-size:15px;color:#111827;">Auditoria — ${escapeHtml(audit.typeLabel)}</h3>
      <table style="border-collapse:collapse;font-size:13px;color:#374151;margin-bottom:12px;">
        <tr><td style="padding:2px 12px 2px 0;"><strong>Data:</strong></td><td>${formatDate(audit.date)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;"><strong>Setor:</strong></td><td>${escapeHtml(audit.sector || "—")}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;"><strong>Conformidade:</strong></td><td>${compliance} (${audit.compliantItems ?? 0}/${audit.totalItems ?? items.length} itens conformes)</td></tr>
      </table>
      ${items.length > 0 ? `
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#eef2ff;">
            <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:left;">Item avaliado</th>
            <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:left;">Situação</th>
            <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:left;">Observação</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>` : ""}
      ${audit.observations ? `<p style="font-size:13px;color:#374151;margin:12px 0 0;"><strong>Observações gerais:</strong> ${escapeHtml(audit.observations)}</p>` : ""}
      <h4 style="margin:16px 0 0;font-size:14px;color:#111827;">Não conformidades e pontos de melhoria</h4>
      ${ncList}
    </div>`;
}

function buildEmailHtml(managerName: string, audit: AuditPayload, photosHtml = ""): string {
  const p = "margin:0 0 12px;font-size:14px;line-height:1.6;color:#1f2937;";
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:680px;margin:0 auto;">
    <p style="${p}">Prezado(a) ${escapeHtml(managerName || "Gestor(a) do Setor")},</p>
    <p style="${p}">Espero que esteja bem.</p>
    <p style="${p}">Informo que foi realizada uma auditoria pelo Serviço de Controle de Infecção Hospitalar no setor sob sua responsabilidade, com o objetivo de avaliar a adesão às boas práticas assistenciais e institucionais relacionadas à prevenção e controle das infecções relacionadas à assistência à saúde.</p>
    <p style="${p}">A auditoria contempla os pontos como higienização das mãos, uso adequado de EPIs, cumprimento das precauções padrão e específicas, organização do ambiente, limpeza e desinfecção de superfícies, identificação de pacientes em isolamento, disponibilidade de insumos e conformidade com os protocolos institucionais vigentes.</p>
    <p style="${p}">Ressalto que a finalidade da auditoria é identificar oportunidades de melhoria, fortalecer a segurança do paciente e apoiar a equipe na padronização dos processos assistenciais.</p>
    <p style="${p}">Segue abaixo a auditoria.</p>
    ${buildAuditHtml(audit)}
    ${photosHtml}
    <p style="${p}">Após a avaliação, as não conformidades e pontos de melhoria são compartilhadas acima com a chefia do setor para ciência, tratativa e elaboração de plano de ação, quando necessário.</p>
    <p style="${p}">Coloco-me à disposição para esclarecimentos.</p>
    <p style="${p}">Atenciosamente,<br>
    <strong>Lucas Lemos</strong><br>
    Enfermeiro SCIH<br>
    Serviço de Controle de Infecção Hospitalar</p>
  </div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, cc, managerName, audit, photoPaths, photoCaptions } = await req.json() as {
      to?: string; cc?: string[]; managerName?: string; audit?: AuditPayload;
      photoPaths?: string[]; photoCaptions?: string[];
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || typeof to !== "string" || !emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: "E-mail do destinatário inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!audit || typeof audit !== "object") {
      return new Response(JSON.stringify({ error: "Dados da auditoria ausentes." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Destinatários em cópia (CC) — apenas e-mails válidos e distintos do destinatário
    const ccList = Array.isArray(cc)
      ? [...new Set(cc.filter((e) => typeof e === "string" && emailRegex.test(e.trim()) && e.trim() !== to).map((e) => e.trim()))]
      : [];

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada no Supabase." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const from = Deno.env.get("AUDIT_EMAIL_FROM") || "IRASControl <onboarding@resend.dev>";

    // Baixar fotos do Storage e preparar como anexos inline (cid)
    const attachments: { filename: string; content: string; content_id: string }[] = [];
    let photosHtml = "";
    if (Array.isArray(photoPaths) && photoPaths.length > 0) {
      const MAX_PHOTOS = 12;
      const MAX_TOTAL_BYTES = 30 * 1024 * 1024; // limite de segurança (~30MB)
      let totalBytes = 0;
      const cells: string[] = [];
      for (let i = 0; i < photoPaths.length && attachments.length < MAX_PHOTOS; i++) {
        const path = photoPaths[i];
        if (typeof path !== "string") continue;
        const { data: blob, error: dlErr } = await callerClient.storage
          .from("audit-photos").download(path);
        if (dlErr || !blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (totalBytes + bytes.length > MAX_TOTAL_BYTES) break;
        totalBytes += bytes.length;
        const ext = (path.split(".").pop() || "jpg").toLowerCase();
        const cid = `audit-photo-${i}`;
        const caption = (Array.isArray(photoCaptions) ? photoCaptions[i] : "")?.trim();
        const label = caption ? `Foto ${i + 1} — ${escapeHtml(caption)}` : `Foto ${i + 1}`;
        attachments.push({ filename: `foto-${i + 1}.${ext}`, content: encodeBase64(bytes), content_id: cid });
        cells.push(`<td width="50%" style="padding:6px;text-align:center;vertical-align:top;">
          <img src="cid:${cid}" alt="${label}" style="width:100%;max-width:300px;height:auto;border:1px solid #e5e7eb;border-radius:8px;" />
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">${label}</div>
        </td>`);
      }
      if (cells.length > 0) {
        let rows = "";
        for (let r = 0; r < cells.length; r += 2) {
          rows += `<tr>${cells[r]}${cells[r + 1] || '<td width="50%"></td>'}</tr>`;
        }
        photosHtml = `<div style="margin:20px 0;">
          <h4 style="margin:0 0 10px;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">Fotos da auditoria (${cells.length})</h4>
          <table role="presentation" width="100%" style="border-collapse:collapse;"><tbody>${rows}</tbody></table>
        </div>`;
      }
    }

    const subject = `Auditoria SCIH — ${audit.typeLabel}${audit.sector ? ` — ${audit.sector}` : ""} (${formatDate(audit.date)})`;
    const html = buildEmailHtml(managerName || "", audit, photosHtml);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from, to: [to], subject, html,
        ...(ccList.length > 0 ? { cc: ccList } : {}),
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: result?.message || "Falha ao enviar e-mail.", details: result }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result?.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Erro inesperado." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
