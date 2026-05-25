import { supabase } from "@/integrations/supabase/client";

const GUARDIAO_BASE = "https://5w2h.ekaban.irascontrol.com";

export async function openGuardiaoWithSSO(hospitalId: string | null) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.open(GUARDIAO_BASE, "_blank", "noopener,noreferrer");
    return;
  }
  const { access_token, refresh_token } = data.session;
  const params = new URLSearchParams({ access_token, refresh_token });
  if (hospitalId) params.set("hospital_id", hospitalId);
  window.open(`${GUARDIAO_BASE}#${params.toString()}`, "_blank", "noopener,noreferrer");
}
