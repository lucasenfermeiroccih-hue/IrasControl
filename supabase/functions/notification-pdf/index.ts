import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MES_OPTIONS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmt(v: any, decimals = 2): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return isFinite(v) ? v.toFixed(decimals) : "—";
  return String(v);
}

function truncate(s: string, max = 70): string {
  return s.length <= max ? s : s.slice(0, max - 3) + "…";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { notification_id } = await req.json();
    if (!notification_id) throw new Error("notification_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    const supabase = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader! } },
    });

    // Verify user has access
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Não autorizado");

    // Load notification with type
    const { data: notif, error: notifErr } = await supabase
      .from("notifications")
      .select("*, notification_types(*)")
      .eq("id", notification_id)
      .single();
    if (notifErr || !notif) throw new Error(notifErr?.message || "Notificação não encontrada");

    // Load hospital
    const { data: hospital } = await supabase
      .from("hospitals")
      .select("name, state, city, cnpj, cnes, type")
      .eq("id", notif.hospital_id)
      .single();

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 40;
    const LINE_H = 16;
    const COL_W = PAGE_W - MARGIN * 2;

    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function newPage() {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      drawHeader();
    }

    function checkY(needed = 40) {
      if (y < MARGIN + needed) newPage();
    }

    function drawHeader() {
      // Blue header bar
      page.drawRectangle({ x: MARGIN, y: PAGE_H - MARGIN - 50, width: COL_W, height: 50, color: rgb(0.24, 0.31, 0.71) });
      page.drawText("IRASControl", { x: MARGIN + 10, y: PAGE_H - MARGIN - 18, size: 14, font: fontBold, color: rgb(1, 1, 1) });
      page.drawText("Notificação ANVISA/PLACON", { x: MARGIN + 10, y: PAGE_H - MARGIN - 35, size: 10, font, color: rgb(0.8, 0.85, 1) });
      y = PAGE_H - MARGIN - 65;
    }

    function drawSectionTitle(title: string) {
      checkY(30);
      y -= 8;
      page.drawRectangle({ x: MARGIN, y: y - 2, width: COL_W, height: 20, color: rgb(0.94, 0.95, 0.99) });
      page.drawText(title.toUpperCase(), { x: MARGIN + 6, y: y + 4, size: 9, font: fontBold, color: rgb(0.24, 0.31, 0.71) });
      y -= 24;
    }

    function drawField(label: string, value: string, indent = 0) {
      checkY(20);
      page.drawText(label + ":", { x: MARGIN + indent, y, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(truncate(value, 80), { x: MARGIN + indent + 140, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
      y -= LINE_H;
    }

    function drawRow(cols: string[], widths: number[], bold = false) {
      checkY(16);
      let x = MARGIN;
      for (let i = 0; i < cols.length; i++) {
        page.drawText(truncate(cols[i], Math.floor(widths[i] / 5.5)), {
          x, y, size: 8, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1),
        });
        x += widths[i];
      }
      y -= LINE_H;
    }

    function drawHLine() {
      page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + COL_W, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      y -= 4;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    drawHeader();

    // Title block
    const nt = notif.notification_types as any;
    y -= 4;
    page.drawText(nt?.nome || notif.type_id, { x: MARGIN, y, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= LINE_H + 4;
    page.drawText(`Fonte: ${nt?.fonte || "ANVISA"}${nt?.anvisa_id ? " #" + nt.anvisa_id : ""}   ·   Número: ${notif.numero || "—"}   ·   Status: ${notif.status}`, {
      x: MARGIN, y, size: 8, font, color: rgb(0.4, 0.4, 0.4),
    });
    y -= LINE_H;
    drawHLine();

    // Hospital data
    drawSectionTitle("Dados do Serviço de Saúde");
    drawField("Estabelecimento", hospital?.name || "—");
    drawField("Estado / Cidade", `${hospital?.state || "—"} / ${hospital?.city || "—"}`);
    drawField("CNPJ", hospital?.cnpj || "—");
    drawField("CNES", hospital?.cnes || "—");
    drawHLine();

    // Notification metadata
    drawSectionTitle("Identificação da Notificação");
    drawField("Número", notif.numero || "—");
    drawField("Período de vigilância", `${notif.mes_vigilancia || "—"} / ${notif.ano_vigilancia}`);
    drawField("Status", notif.status);
    if (notif.finalized_at) {
      drawField("Finalizado em", new Date(notif.finalized_at).toLocaleDateString("pt-BR"));
    }
    drawField("Data do evento", notif.data_evento ? new Date(notif.data_evento).toLocaleDateString("pt-BR") : "—");
    drawHLine();

    // Form inputs
    const inputs = (notif.inputs as any) || {};
    const topVals = inputs._top || inputs;
    const blockVals = inputs._blocks || {};

    drawSectionTitle("Dados do Formulário");

    // Render top-level fields
    const skipKeys = new Set(["_top", "_blocks", "ano", "mes", "estado", "cnpj"]);
    for (const [key, val] of Object.entries(topVals)) {
      if (skipKeys.has(key)) continue;
      const displayVal = Array.isArray(val) ? val.join(", ") : String(val ?? "—");
      drawField(key.replace(/_/g, " "), displayVal);
    }

    // Render block values
    for (const [blocoId, instances] of Object.entries(blockVals)) {
      if (!instances || typeof instances !== "object") continue;
      drawSectionTitle(blocoId.replace(/_/g, " "));
      for (const [instanceKey, fields] of Object.entries(instances as Record<string, any>)) {
        checkY(24);
        page.drawText(`▶ ${instanceKey}`, { x: MARGIN, y, size: 9, font: fontBold, color: rgb(0.24, 0.31, 0.71) });
        y -= LINE_H;
        for (const [k, v] of Object.entries(fields || {})) {
          const displayVal = typeof v === "object" && v !== null
            ? JSON.stringify(v).slice(0, 60)
            : String(v ?? "—");
          drawField(k.replace(/_/g, " "), displayVal, 10);
        }
        y -= 4;
      }
    }

    drawHLine();

    // Calculated indicators
    const calc = (notif.calculated as any) || {};
    if (Object.keys(calc).length > 0) {
      drawSectionTitle("Indicadores Calculados");
      drawRow(["Indicador", "Valor", "Unidade"], [220, 120, 175], true);
      drawHLine();

      const schema = nt?.schema as any;
      const indicators: any[] = schema?.indicadores || [];
      for (const ind of indicators) {
        const val = calc[ind.key];
        drawRow([
          ind.label || ind.key,
          val !== null && val !== undefined && isFinite(val) ? Number(val).toFixed(2) : "—",
          ind.unidade || "",
        ], [220, 120, 175]);
      }

      // If no schema, just dump calc keys
      if (indicators.length === 0) {
        for (const [k, v] of Object.entries(calc)) {
          drawRow([k.replace(/_/g, " "), fmt(v), ""], [220, 120, 175]);
        }
      }
    }

    // Footer
    const totalPages = doc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = doc.getPage(i);
      p.drawText(`IRASControl  ·  Gerado em ${new Date().toLocaleDateString("pt-BR")}  ·  Página ${i + 1} de ${totalPages}`, {
        x: MARGIN, y: MARGIN - 15, size: 7, font, color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await doc.save();
    const pdfBase64 = encodeBase64(pdfBytes);

    // Upload to storage
    const filename = `${notif.hospital_id}/${notif.numero || notif.id}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("notifications")
      .upload(filename, Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0)), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) throw new Error("Erro no upload: " + uploadErr.message);

    // Update pdf_path
    await supabase.from("notifications").update({ pdf_path: filename }).eq("id", notification_id);

    // History
    await supabase.from("notification_history").insert({
      notification_id,
      action: "pdf_gerado",
      changed_by: user.id,
      snapshot: { filename },
    });

    // Signed URL (60 min)
    const { data: signedData, error: signedErr } = await supabase.storage
      .from("notifications")
      .createSignedUrl(filename, 3600);
    if (signedErr) throw new Error("Erro signed URL: " + signedErr.message);

    return new Response(
      JSON.stringify({ signedUrl: signedData.signedUrl, filename }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
