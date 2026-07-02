import { supabase } from '@/integrations/supabase/client';
import type { Meeting, MeetingParticipant, MeetingActionItem, MeetingDecision } from './types';

const db = supabase as any;

export async function createMeeting(meeting: Meeting): Promise<Meeting> {
  const { data, error } = await db.from('meetings').insert(meeting).select('*').single();
  if (error) throw error;
  return data as Meeting;
}

export async function updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting> {
  const { data, error } = await db
    .from('meetings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Meeting;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data, error } = await db.from('meetings').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Meeting;
}

export async function listMeetings(hospitalId: string): Promise<Meeting[]> {
  const { data, error } = await db
    .from('meetings')
    .select('*')
    .eq('hospital_id', hospitalId)
    .order('scheduled_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await db.from('meetings').delete().eq('id', id);
  if (error) throw error;
}

export async function saveParticipants(
  meetingId: string,
  participants: MeetingParticipant[]
): Promise<MeetingParticipant[]> {
  await db.from('meeting_participants').delete().eq('meeting_id', meetingId);
  if (!participants.length) return [];
  const { data, error } = await db
    .from('meeting_participants')
    .insert(participants.map(p => ({ ...p, meeting_id: meetingId })))
    .select('*');
  if (error) throw error;
  return (data ?? []) as MeetingParticipant[];
}

export async function listParticipants(meetingId: string): Promise<MeetingParticipant[]> {
  const { data, error } = await db
    .from('meeting_participants')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as MeetingParticipant[];
}

export async function upsertActionItem(item: MeetingActionItem): Promise<MeetingActionItem> {
  const payload = { ...item, updated_at: new Date().toISOString() };
  if (item.id) {
    const { data, error } = await db
      .from('meeting_action_items')
      .update(payload)
      .eq('id', item.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as MeetingActionItem;
  }
  const { data, error } = await db
    .from('meeting_action_items')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as MeetingActionItem;
}

export async function deleteActionItem(id: string): Promise<void> {
  const { error } = await db.from('meeting_action_items').delete().eq('id', id);
  if (error) throw error;
}

export async function listActionItems(meetingId: string): Promise<MeetingActionItem[]> {
  const { data, error } = await db
    .from('meeting_action_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('due_date');
  if (error) throw error;
  return (data ?? []) as MeetingActionItem[];
}

export async function listAllActionItems(hospitalId: string): Promise<MeetingActionItem[]> {
  const { data, error } = await db
    .from('meeting_action_items')
    .select('*')
    .eq('hospital_id', hospitalId)
    .order('due_date');
  if (error) throw error;
  return (data ?? []) as MeetingActionItem[];
}

export async function saveDecisions(
  meetingId: string,
  decisions: Omit<MeetingDecision, 'id' | 'meeting_id'>[]
): Promise<MeetingDecision[]> {
  if (!decisions.length) return [];
  const { data, error } = await db
    .from('meeting_decisions')
    .insert(decisions.map(d => ({ ...d, meeting_id: meetingId })))
    .select('*');
  if (error) throw error;
  return (data ?? []) as MeetingDecision[];
}

export async function listDecisions(meetingId: string): Promise<MeetingDecision[]> {
  const { data, error } = await db
    .from('meeting_decisions')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as MeetingDecision[];
}
