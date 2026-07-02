export type MeetingStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'minutes_generated'
  | 'under_review'
  | 'approved'
  | 'cancelled';

export type MeetingCharacter = 'ordinary' | 'extraordinary';
export type ActionPriority = 'low' | 'medium' | 'high' | 'critical';
export type ActionStatus = 'open' | 'in_progress' | 'done' | 'cancelled' | 'overdue';

export interface Meeting {
  id?: string;
  hospital_id: string;
  sector_id?: string | null;
  title: string;
  meeting_type: string;
  committee?: string | null;
  department?: string | null;
  theme?: string | null;
  location?: string | null;
  online_link?: string | null;
  scheduled_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  agenda?: string | null;
  previous_pending_items?: string | null;
  raw_text_input?: string | null;
  transcript_text?: string | null;
  ai_summary?: string | null;
  generated_minutes_md?: string | null;
  status: MeetingStatus;
  meeting_character: MeetingCharacter;
  reporter_name?: string | null;
  president_name?: string | null;
  next_meeting_date?: string | null;
  next_meeting_time?: string | null;
  next_meeting_location?: string | null;
  next_meeting_agenda?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingParticipant {
  id?: string;
  meeting_id?: string;
  name: string;
  role?: string | null;
  institution?: string | null;
  email?: string | null;
  phone?: string | null;
  expected: boolean;
  present: boolean;
}

export interface MeetingActionItem {
  id?: string;
  meeting_id?: string;
  hospital_id: string;
  title: string;
  description?: string | null;
  why?: string | null;
  responsible_name: string;
  department?: string | null;
  due_date?: string | null;
  evidence_required?: string | null;
  evidence_url?: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingDecision {
  id?: string;
  meeting_id?: string;
  decision: string;
  responsible_name?: string | null;
  due_date?: string | null;
}

export interface GenerateMinutesResult {
  minutesMarkdown: string;
  summary: string;
  decisions: Omit<MeetingDecision, 'id' | 'meeting_id'>[];
  actionItems: Omit<MeetingActionItem, 'id' | 'meeting_id'>[];
}
