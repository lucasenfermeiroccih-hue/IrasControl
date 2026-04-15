import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Roles that a hospital_admin is allowed to assign
const ALLOWED_ROLES = ["nurse_ccih", "doctor", "lab_tech", "viewer"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Always return 200 with { success, error } so supabase.functions.invoke gets the body
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Missing authorization" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Identify the caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ success: false, error: "Unauthorized" });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Verify caller is hospital_admin (or super_admin)
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles || []).map((r: { role: string }) => r.role);
    const isSuperAdmin = roles.includes("super_admin");
    const isHospitalAdmin = roles.includes("hospital_admin");

    if (!isSuperAdmin && !isHospitalAdmin) {
      return json({ success: false, error: "Forbidden: hospital_admin or super_admin required" });
    }

    // 3. Parse request body
    const { email, full_name, phone, hospital_id, role } = await req.json();

    if (!email || !full_name || !hospital_id || !role) {
      return json({ success: false, error: "Preencha todos os campos obrigatórios: nome, e-mail, hospital e perfil" });
    }

    // 4. Validate role
    if (!isSuperAdmin && !ALLOWED_ROLES.includes(role)) {
      return json({
        success: false,
        error: `Perfil não permitido. Perfis válidos: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    // 5. Verify caller belongs to the target hospital (skip for super_admin)
    if (!isSuperAdmin) {
      const { data: membership } = await adminClient
        .from("hospital_users")
        .select("id")
        .eq("user_id", caller.id)
        .eq("hospital_id", hospital_id)
        .maybeSingle();

      if (!membership) {
        return json({ success: false, error: "Você não pertence a este hospital" });
      }
    }

    // 6. Verify the hospital exists and is active
    const { data: hospital } = await adminClient
      .from("hospitals")
      .select("id, status")
      .eq("id", hospital_id)
      .maybeSingle();

    if (!hospital) return json({ success: false, error: "Hospital não encontrado" });
    if (hospital.status !== "active") {
      return json({ success: false, error: "Hospital não está ativo" });
    }

    // 7. Check if user with this email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // Check if already linked to this hospital
      const { data: existingLink } = await adminClient
        .from("hospital_users")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("hospital_id", hospital_id)
        .maybeSingle();

      if (existingLink) {
        return json({ success: false, error: "Este e-mail já está cadastrado neste hospital" });
      }

      userId = existingUser.id;
    } else {
      // Create the user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name, phone: phone || null },
      });

      if (createError) {
        return json({ success: false, error: `Erro ao criar usuário: ${createError.message}` });
      }
      userId = newUser.user.id;
    }

    // 8. Assign role (check if already has this role)
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (roleError) {
        if (!existingUser) {
          await adminClient.auth.admin.deleteUser(userId);
        }
        return json({ success: false, error: `Erro ao atribuir perfil: ${roleError.message}` });
      }
    }

    // 9. Link user to hospital
    const { error: linkError } = await adminClient
      .from("hospital_users")
      .insert({ hospital_id, user_id: userId, is_primary_admin: false });

    if (linkError) {
      if (!existingUser) {
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        await adminClient.auth.admin.deleteUser(userId);
      }
      return json({ success: false, error: `Erro ao vincular usuário ao hospital: ${linkError.message}` });
    }

    // 10. Ensure profile exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await adminClient.from("profiles").insert({
        user_id: userId,
        full_name,
        email,
        phone: phone || null,
      });
    }

    // 11. Generate magic link
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    return json({
      success: true,
      user_id: userId,
      email_sent: !!linkData?.properties?.action_link,
    });
  } catch (err) {
    return json({ success: false, error: err.message || "Erro interno do servidor" });
  }
});
