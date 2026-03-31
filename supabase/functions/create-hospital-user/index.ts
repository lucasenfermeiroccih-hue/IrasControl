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

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Identify the caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

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
      return json({ error: "Forbidden: hospital_admin or super_admin required" }, 403);
    }

    // 3. Parse request body
    const { email, full_name, phone, hospital_id, role } = await req.json();

    if (!email || !full_name || !hospital_id || !role) {
      return json({ error: "Missing required fields: email, full_name, hospital_id, role" }, 400);
    }

    // 4. Validate role — hospital_admin cannot assign super_admin or hospital_admin
    if (!isSuperAdmin && !ALLOWED_ROLES.includes(role)) {
      return json({
        error: `Forbidden: hospital_admin can only assign roles: ${ALLOWED_ROLES.join(", ")}`,
      }, 403);
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
        return json({ error: "Forbidden: you do not belong to this hospital" }, 403);
      }
    }

    // 6. Verify the hospital exists and is active
    const { data: hospital } = await adminClient
      .from("hospitals")
      .select("id, status")
      .eq("id", hospital_id)
      .maybeSingle();

    if (!hospital) return json({ error: "Hospital not found" }, 404);
    if (hospital.status !== "active") {
      return json({ error: "Hospital is not active" }, 400);
    }

    // 7. Create the user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name, phone: phone || null },
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    const userId = newUser.user.id;

    // 8. Assign role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (roleError) {
      // Rollback: delete the created user
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: `Failed to assign role: ${roleError.message}` }, 500);
    }

    // 9. Link user to hospital
    const { error: linkError } = await adminClient
      .from("hospital_users")
      .insert({ hospital_id, user_id: userId, is_primary_admin: false });

    if (linkError) {
      // Rollback
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: `Failed to link user to hospital: ${linkError.message}` }, 500);
    }

    // 10. Generate magic link so user can set password
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    return json({
      success: true,
      user_id: userId,
      magic_link: linkData?.properties?.action_link || null,
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
