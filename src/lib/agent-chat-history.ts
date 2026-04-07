import { supabase } from "@/integrations/supabase/client";

export interface DbChatSession {
  id: string;
  user_id: string;
  hospital_id: string | null;
  agent_id: string;
  agent_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

/**
 * Get or create a Supabase-persisted session for a given agent.
 * Falls back to localStorage if user is not authenticated.
 */
export async function getOrCreateDbSession(agentId: string, agentName: string): Promise<DbChatSession | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Try to find active session for this agent
  const { data: existing } = await supabase
    .from("agent_chat_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("agent_id", agentId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0] as unknown as DbChatSession;
  }

  // Get hospital_id
  const { data: hospitalUsers } = await supabase
    .from("hospital_users")
    .select("hospital_id")
    .eq("user_id", user.id)
    .limit(1);

  const hospitalId = hospitalUsers?.[0]?.hospital_id || null;

  const { data: newSession, error } = await supabase
    .from("agent_chat_sessions")
    .insert({
      user_id: user.id,
      hospital_id: hospitalId,
      agent_id: agentId,
      agent_name: agentName,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar sessão de chat:", error);
    return null;
  }

  return newSession as unknown as DbChatSession;
}

/**
 * Save a message to Supabase.
 */
export async function saveDbMessage(sessionId: string, role: "user" | "assistant", content: string): Promise<DbChatMessage | null> {
  const { data, error } = await supabase
    .from("agent_chat_messages")
    .insert({ session_id: sessionId, role, content })
    .select()
    .single();

  if (error) {
    console.error("Erro ao salvar mensagem:", error);
    return null;
  }

  return data as unknown as DbChatMessage;
}

/**
 * Load all messages for a session from Supabase.
 */
export async function loadDbMessages(sessionId: string): Promise<DbChatMessage[]> {
  const { data, error } = await supabase
    .from("agent_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar mensagens:", error);
    return [];
  }

  return (data || []) as unknown as DbChatMessage[];
}

/**
 * List all sessions for the current user.
 */
export async function listDbSessions(): Promise<DbChatSession[]> {
  const { data, error } = await supabase
    .from("agent_chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Erro ao listar sessões:", error);
    return [];
  }

  return (data || []) as unknown as DbChatSession[];
}

/**
 * Clear (deactivate) a session.
 */
export async function clearDbSession(sessionId: string): Promise<void> {
  await supabase
    .from("agent_chat_sessions")
    .update({ is_active: false })
    .eq("id", sessionId);
}
