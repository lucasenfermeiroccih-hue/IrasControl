import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const SEVERITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "#16a34a",
  medium: "#d97706",
  high: "#dc2626",
  critical: "#7c3aed",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY não configurada." }, 500);

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json() as {
      mode: "test" | "alert";
      hospitalId?: string;
      alert?: { title: string; description?: string; severity: string };
    };

    // Resolve hospitalId
    let hospitalId = body.hospitalId;
    if (!hospitalId) {
      const { data: hu } = await adminClient
        .from("hospital_users").select("hospital_id").eq("user_id", user.id).limit(1).maybeSingle();
      hospitalId = hu?.hospital_id;
    }
    if (!hospitalId) return json({ error: "Hospital não encontrado" }, 400);

    // Load hospital + notification settings
    const { data: hospital } = await adminClient
      .from("hospitals")
      .select("name, contact_email, notification_settings")
      .eq("id", hospitalId)
      .single();

    if (!hospital) return json({ error: "Hospital não encontrado" }, 404);

    const settings = (hospital.notification_settings || {}) as {
      email_enabled?: boolean;
      email_recipients?: string[];
    };

    if (!settings.email_enabled && body.mode === "alert") {
      return json({ success: true, skipped: "email_disabled" });
    }

    // Build recipient list
    const extraRecipients: string[] = Array.isArray(settings.email_recipients)
      ? settings.email_recipients.filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      : [];

    const primaryEmail = hospital.contact_email;
    const allRecipients = primaryEmail
      ? [primaryEmail, ...extraRecipients.filter(e => e !== primaryEmail)]
      : extraRecipients;

    if (allRecipients.length === 0) return json({ error: "Nenhum e-mail cadastrado para receber notificações." }, 400);

    const from = Deno.env.get("AUDIT_EMAIL_FROM") || "IRASControl <onboarding@resend.dev>";
    const hospitalName = escapeHtml(hospital.name || "Hospital");

    let subject: string;
    let html: string;

    if (body.mode === "test") {
      subject = `[Teste] Notificações IRASControl — ${hospitalName}`;
      html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#fff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="background:#16a085;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:18px;">IRASControl — Teste de Notificação</h2>
      <p style="margin:4px 0 0;font-size:13px;opacity:.85;">${hospitalName}</p>
    </div>
    <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <p style="font-size:14px;color:#1f2937;">✅ Este é um e-mail de teste enviado pelo sistema <strong>IRASControl</strong>.</p>
      <p style="font-size:14px;color:#1f2937;">As notificações de alertas críticos e resumos periódicos serão entregues neste endereço conforme as configurações salvas.</p>
      <p style="font-size:12px;color:#6b7280;margin-top:16px;">Se você não reconhece este e-mail, ignore-o com segurança.</p>
    </div>
  </div>
</body></html>`;
    } else {
      // alert mode
      const alert = body.alert!;
      const sev = alert.severity || "medium";
      const color = SEVERITY_COLOR[sev] || SEVERITY_COLOR.medium;
      const sevLabel = SEVERITY_LABEL[sev] || sev;
      subject = `[${sevLabel.toUpperCase()}] Alerta: ${escapeHtml(alert.title)} — ${hospitalName}`;
      html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#fff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="background:${color};color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:18px;">⚠️ Alerta ${sevLabel} — IRASControl</h2>
      <p style="margin:4px 0 0;font-size:13px;opacity:.85;">${hospitalName}</p>
    </div>
    <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <h3 style="margin:0 0 8px;font-size:16px;color:#111827;">${escapeHtml(alert.title)}</h3>
      ${alert.description ? `<p style="font-size:14px;color:#374151;">${escapeHtml(alert.description)}</p>` : ""}
      <p style="font-size:13px;color:#6b7280;margin-top:16px;">Acesse o sistema IRASControl para mais detalhes e tomar as ações necessárias.</p>
    </div>
  </div>
</body></html>`;
    }

    const [toEmail, ...ccEmails] = allRecipients;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [toEmail], subject, html,
        ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
      }),
    });

    const result = await res.json();
    if (!res.ok) return json({ error: result?.message || "Falha ao enviar e-mail.", details: result }, 502);

    return json({ success: true, id: result?.id, recipients: allRecipients });
  } catch (e) {
    return json({ error: (e as Error).message || "Erro inesperado." }, 500);
  }
});
