import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      hospital_name, hospital_cnes, hospital_type, hospital_bed_count,
      hospital_city, hospital_state, hospital_contact_email, hospital_contact_phone,
      admin_full_name, admin_email, admin_password,
    } = await req.json();

    if (!hospital_name || !admin_full_name || !admin_email || !admin_password) {
      return json({ error: "Campos obrigatórios: hospital_name, admin_full_name, admin_email, admin_password" }, 400);
    }

    if (admin_password.length < 6) {
      return json({ error: "A senha deve ter pelo menos 6 caracteres" }, 400);
    }

    // 1. Create hospital
    const { data: hospital, error: hospitalError } = await adminClient
      .from("hospitals")
      .insert({
        name: hospital_name,
        cnes: hospital_cnes || null,
        type: hospital_type || "geral",
        bed_count: hospital_bed_count ? parseInt(hospital_bed_count) : null,
        city: hospital_city || null,
        state: hospital_state || null,
        contact_email: hospital_contact_email || null,
        contact_phone: hospital_contact_phone || null,
        status: "active",
      })
      .select()
      .single();

    if (hospitalError) {
      return json({ error: `Erro ao criar hospital: ${hospitalError.message}` }, 500);
    }

    // 2. Create user (or reuse existing)
    let userId: string;

    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { full_name: admin_full_name },
    });

    if (userError) {
      if (userError.message.includes("already been registered")) {
        // User exists — look up by email and reuse
        const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
        if (listError) {
          await adminClient.from("hospitals").delete().eq("id", hospital.id);
          return json({ error: `Erro ao buscar usuário existente: ${listError.message}` }, 500);
        }
        const existing = listData.users.find((u: any) => u.email === admin_email);
        if (!existing) {
          await adminClient.from("hospitals").delete().eq("id", hospital.id);
          return json({ error: "Usuário não encontrado após verificação" }, 500);
        }
        userId = existing.id;
      } else {
        await adminClient.from("hospitals").delete().eq("id", hospital.id);
        return json({ error: `Erro ao criar usuário: ${userError.message}` }, 400);
      }
    } else {
      userId = newUser.user.id;
    }

    // 3. Assign hospital_admin role (skip if already has it)
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "hospital_admin" }, { onConflict: "user_id,role" });

    if (roleError) {
      await adminClient.from("hospitals").delete().eq("id", hospital.id);
      return json({ error: `Erro ao atribuir role: ${roleError.message}` }, 500);
    }

    // 4. Link user to hospital as primary admin
    const { error: linkError } = await adminClient
      .from("hospital_users")
      .insert({ hospital_id: hospital.id, user_id: userId, is_primary_admin: true });

    if (linkError) {
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.auth.admin.deleteUser(userId);
      await adminClient.from("hospitals").delete().eq("id", hospital.id);
      return json({ error: `Erro ao vincular ao hospital: ${linkError.message}` }, 500);
    }

    return json({
      success: true,
      hospital_id: hospital.id,
      user_id: userId,
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
