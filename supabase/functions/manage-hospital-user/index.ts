import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Identify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller roles
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

    const { action, user_id, hospital_id, full_name, phone, role, email, password } = await req.json();

    if (!action || !user_id || !hospital_id) {
      return json({ error: "Missing required fields: action, user_id, hospital_id" }, 400);
    }

    // Verify caller belongs to the target hospital (skip for super_admin)
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

    // Verify target user belongs to the hospital
    const { data: targetMembership } = await adminClient
      .from("hospital_users")
      .select("id, is_primary_admin")
      .eq("user_id", user_id)
      .eq("hospital_id", hospital_id)
      .maybeSingle();

    if (!targetMembership) {
      return json({ error: "User not found in this hospital" }, 404);
    }

    // Prevent editing primary admin (unless super_admin)
    if (targetMembership.is_primary_admin && !isSuperAdmin) {
      return json({ error: "Cannot modify the primary administrator" }, 403);
    }

    // Prevent self-deactivation
    if (action === "deactivate" && user_id === caller.id) {
      return json({ error: "You cannot deactivate yourself" }, 400);
    }

    if (action === "update") {
      // Update profile
      if (full_name || phone !== undefined) {
        const updates: Record<string, string> = {};
        if (full_name) updates.full_name = full_name;
        if (phone !== undefined) updates.phone = phone;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update(updates)
          .eq("user_id", user_id);

        if (profileError) {
          return json({ error: `Failed to update profile: ${profileError.message}` }, 500);
        }
      }

      // Update email in profiles table if provided
      if (email) {
        const { error: emailProfileError } = await adminClient
          .from("profiles")
          .update({ email })
          .eq("user_id", user_id);

        if (emailProfileError) {
          return json({ error: `Failed to update email in profile: ${emailProfileError.message}` }, 500);
        }
      }

      // Update role if provided
      if (role) {
        if (!isSuperAdmin && !(ALLOWED_ROLES as readonly string[]).includes(role)) {
          return json({ error: `Forbidden: can only assign roles: ${ALLOWED_ROLES.join(", ")}` }, 403);
        }

        // Remove old non-admin roles and set new one
        const { data: existingRoles } = await adminClient
          .from("user_roles")
          .select("id, role")
          .eq("user_id", user_id);

        const nonAdminRoles = (existingRoles || []).filter(
          (r: { role: string }) => r.role !== "super_admin" && r.role !== "hospital_admin"
        );

        // Delete old assignable roles
        for (const r of nonAdminRoles) {
          await adminClient.from("user_roles").delete().eq("id", r.id);
        }

        // Insert new role
        const { error: roleError } = await adminClient
          .from("user_roles")
          .insert({ user_id, role });

        if (roleError) {
          return json({ error: `Failed to update role: ${roleError.message}` }, 500);
        }
      }

      // Update user in auth (email, password, metadata)
      const authUpdates: Record<string, unknown> = {};
      if (full_name) authUpdates.user_metadata = { full_name };
      if (email) authUpdates.email = email;
      if (password) {
        if (password.length < 6) {
          return json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
        }
        authUpdates.password = password;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await adminClient.auth.admin.updateUserById(user_id, authUpdates);
        if (authError) {
          return json({ error: `Failed to update auth user: ${authError.message}` }, 500);
        }
      }

      return json({ success: true, action: "updated" });
    }

    if (action === "deactivate") {
      const { error: banError } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h",
      });

      if (banError) {
        return json({ error: `Failed to deactivate user: ${banError.message}` }, 500);
      }

      return json({ success: true, action: "deactivated" });
    }

    if (action === "activate") {
      const { error: unbanError } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });

      if (unbanError) {
        return json({ error: `Failed to activate user: ${unbanError.message}` }, 500);
      }

      return json({ success: true, action: "activated" });
    }

    return json({ error: "Invalid action. Use: update, deactivate, activate" }, 400);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
