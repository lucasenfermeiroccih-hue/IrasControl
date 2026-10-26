import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, Plus, Loader2, Trash2, CheckCircle2, Clock,
  FileText, Download, Users, Calendar, BarChart3, AlertTriangle,
  ChevronLeft, ChevronRight, Save, Sparkles, User, MapPin, Hash, Edit3, Video, PlayCircle, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import {
  createMeeting, updateMeeting, listMeetings, deleteMeeting,
  saveParticipants, listParticipants,
  upsertActionItem, updateActionItemStatus, deleteActionItem, listActionItems, listAllActionItems,
  saveDecisions, listDecisions,
} from "@/modules/meeting-minutes/meetingService";
import { generateMeetingMinutesPdf } from "@/modules/meeting-minutes/generateMeetingMinutesPdf";
import { markdownToPlain } from "@/modules/meeting-minutes/ataFormPdf";
import type {
  Meeting, MeetingParticipant, MeetingActionItem, MeetingDecision,
  ActionStatus, ActionPriority, MeetingStatus, FollowupAction, MeetingEntryType, PreviousPendingStatus,
} from "@/modules/meeting-minutes/types";
import {
  LOCATION_OPTIONS, ONLINE_LOCATION, OTHER_LOCATION, locationOption, isOnlineMeeting,
  isMeetLink, isDriveLink, normalizeUrl, meetingsByDay, monthGrid, civilDate,
} from "@/modules/meeting-minutes/meetingSchedule";

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
.rm-wrap { --bg:#0d1117; --bg2:#161b22; --bg3:#1c2128; --bg4:#21262d; --bd:#30363d; --tx:#e6edf3; --tx2:#8b949e; --tx3:#6e7681; --teal:#1a9e75; --teal-g:rgba(26,158,117,.2); --amber:#d4a017; --red:#da3633; --blue:#388bfd; --r:8px; font-family:'Segoe UI',system-ui,sans-serif; background:var(--bg); color:var(--tx); min-height:calc(100vh - 60px); }
.rm-wrap *{box-sizing:border-box;margin:0;padding:0;}
.rm-tabs{display:flex;gap:2px;background:var(--bg2);border-bottom:1px solid var(--bd);padding:0 16px;overflow-x:auto;scrollbar-width:none;}
.rm-tabs::-webkit-scrollbar{display:none;}
.rm-tab{display:flex;align-items:center;gap:6px;padding:10px 14px;background:none;border:none;border-bottom:2px solid transparent;color:var(--tx2);cursor:pointer;font-size:12px;font-weight:500;white-space:nowrap;font-family:inherit;transition:all .15s;}
.rm-tab:hover{color:var(--tx);}
.rm-tab.active{color:var(--teal);border-bottom-color:var(--teal);}
.rm-main{padding:20px;min-width:0;}
.rm-card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:18px;}
.rm-card-sm{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;}
.rm-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.rm-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.rm-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
@media(max-width:768px){.rm-grid2,.rm-grid3,.rm-grid4{grid-template-columns:1fr;}}
.rm-kpi{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:16px;}
.rm-kpi-val{font-size:30px;font-weight:700;color:var(--teal);}
.rm-kpi-val.warn{color:var(--amber);}
.rm-kpi-val.danger{color:var(--red);}
.rm-kpi-lbl{font-size:11px;color:var(--tx2);margin-top:4px;}
.rm-section{font-size:14px;font-weight:600;color:var(--tx);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--bd);}
.rm-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--r);border:none;cursor:pointer;font-size:12px;font-weight:500;transition:opacity .15s;font-family:inherit;}
.rm-btn:disabled{opacity:.5;cursor:not-allowed;}
.rm-btn:hover:not(:disabled){opacity:.85;}
.rm-btn-teal{background:var(--teal);color:#fff;}
.rm-btn-outline{background:transparent;border:1px solid var(--bd);color:var(--tx2);}
.rm-btn-outline:hover:not(:disabled){color:var(--tx);border-color:var(--tx3);}
.rm-btn-red{background:var(--red);color:#fff;}
.rm-btn-amber{background:var(--amber);color:#000;}
.rm-btn-blue{background:var(--blue);color:#fff;}
.rm-input{background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);color:var(--tx);padding:7px 11px;font-size:12px;width:100%;outline:none;font-family:inherit;}
.rm-input:focus{border-color:var(--teal);}
.rm-select{background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);color:var(--tx);padding:7px 11px;font-size:12px;outline:none;font-family:inherit;width:100%;}
.rm-select:focus{border-color:var(--teal);}
.rm-textarea{background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);color:var(--tx);padding:8px 11px;font-size:12px;width:100%;outline:none;resize:vertical;min-height:80px;font-family:inherit;}
.rm-textarea:focus{border-color:var(--teal);}
.rm-label{font-size:11px;color:var(--tx2);margin-bottom:3px;display:block;}
.rm-field{display:flex;flex-direction:column;gap:3px;}
.rm-table{width:100%;border-collapse:collapse;font-size:12px;}
.rm-table th{padding:9px 10px;background:var(--bg3);color:var(--tx2);font-weight:600;text-align:left;border-bottom:1px solid var(--bd);}
.rm-table td{padding:9px 10px;border-bottom:1px solid var(--bd);color:var(--tx);vertical-align:top;}
.rm-table tr:hover td{background:var(--bg3);}
.rm-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;}
.rm-badge-teal{background:rgba(26,158,117,.2);color:#1a9e75;}
.rm-badge-amber{background:rgba(212,160,23,.2);color:#d4a017;}
.rm-badge-red{background:rgba(218,54,51,.2);color:#da3633;}
.rm-badge-blue{background:rgba(56,139,253,.2);color:#388bfd;}
.rm-badge-gray{background:rgba(139,148,158,.15);color:#8b949e;}
.rm-meeting-card{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;cursor:pointer;transition:border-color .15s;}
.rm-meeting-card:hover{border-color:var(--teal);}
.rm-participant-row{display:grid;grid-template-columns:1fr 1fr 1fr auto auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd);}
.rm-checkbox{width:15px;height:15px;accent-color:var(--teal);cursor:pointer;}
.rm-minutes-preview{background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);padding:14px;font-size:12px;line-height:1.6;white-space:pre-wrap;max-height:400px;overflow-y:auto;}
.rm-gap{gap:10px;}
.rm-flex{display:flex;align-items:center;gap:8px;}
.rm-flex-wrap{display:flex;flex-wrap:wrap;gap:8px;}
.rm-mt{margin-top:12px;}
.rm-empty{text-align:center;padding:40px 20px;color:var(--tx2);font-size:13px;}
.rm-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
.rm-cal-h{font-size:10px;color:var(--tx3);text-align:center;padding:4px 0;font-weight:600;text-transform:uppercase;}
.rm-cal-d{min-height:64px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;padding:4px;display:flex;flex-direction:column;gap:2px;cursor:default;}
.rm-cal-d.has{cursor:pointer;border-color:rgba(26,158,117,.5);}
.rm-cal-d.sel{border-color:var(--teal);box-shadow:0 0 0 1px var(--teal);}
.rm-cal-d.today .rm-cal-n{background:var(--teal);color:#fff;border-radius:10px;padding:0 6px;}
.rm-cal-d.empty{background:transparent;border-color:transparent;}
.rm-cal-n{font-size:11px;color:var(--tx2);align-self:flex-start;}
.rm-cal-ev{font-size:10px;line-height:1.25;background:var(--teal-g);color:var(--tx);border-radius:4px;padding:1px 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:flex;align-items:center;gap:3px;}
.rm-link-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:var(--r);font-size:11px;font-weight:600;text-decoration:none;border:1px solid transparent;}
.rm-link-meet{background:#1a73e8;color:#fff;}
.rm-link-rec{background:transparent;border-color:var(--bd);color:var(--tx2);}
.rm-link-rec:hover{color:var(--tx);border-color:var(--tx3);}
.rm-hint{font-size:11px;color:var(--tx2);margin-top:4px;}
.rm-form{border:1px solid var(--bd);border-radius:var(--r);overflow:hidden;}
.rm-form-row{display:grid;border-bottom:1px solid var(--bd);}
.rm-form-row:last-child{border-bottom:none;}
.rm-form-cell{padding:8px 10px;border-right:1px solid var(--bd);display:flex;flex-direction:column;gap:4px;min-width:0;}
.rm-form-cell:last-child{border-right:none;}
.rm-radios{display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:12px;color:var(--tx);}
.rm-radios label{display:flex;align-items:center;gap:5px;cursor:pointer;}
.rm-form-table td{padding:6px;}
.rm-form-table th{white-space:nowrap;}
@media(max-width:768px){.rm-form-row{grid-template-columns:1fr !important;}.rm-form-cell{border-right:none;border-bottom:1px solid var(--bd);}}
.rm-hint.err{color:var(--red);}
@media(max-width:768px){.rm-cal-d{min-height:44px;}.rm-cal-ev span{display:none;}}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MeetingStatus, string> = {
  draft: 'Rascunho', scheduled: 'Agendada', in_progress: 'Em andamento',
  completed: 'Concluída', minutes_generated: 'Ata gerada',
  under_review: 'Em revisão', approved: 'Aprovada', cancelled: 'Cancelada',
};

const STATUS_CLASS: Record<MeetingStatus, string> = {
  draft: 'rm-badge-gray', scheduled: 'rm-badge-blue', in_progress: 'rm-badge-amber',
  completed: 'rm-badge-teal', minutes_generated: 'rm-badge-amber',
  under_review: 'rm-badge-amber', approved: 'rm-badge-teal', cancelled: 'rm-badge-red',
};

const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  open: 'Aberto', in_progress: 'Em andamento', done: 'Concluído', cancelled: 'Cancelado', overdue: 'Vencido',
};

const ENTRY_OPTIONS: [MeetingEntryType, string][] = [
  ['indicator', 'Indicador'], ['planning', 'Planejamento'], ['improvement', 'Melhoria'], ['other', 'Outro'],
];

const PENDING_OPTIONS: [PreviousPendingStatus, string][] = [
  ['previous', 'Pendências Anteriores'], ['first', 'Primeira Reunião'], ['none', 'Não houve pendências da reunião anterior'],
];

const EMPTY_FOLLOWUP: FollowupAction = { what: '', who: '', when: '', status: '', evidence_location: '' };

const ACTION_PRIORITY_LABELS: Record<ActionPriority, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
};

function fmt(d?: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function emptyMeeting(hospitalId: string): Meeting {
  return {
    hospital_id: hospitalId,
    title: '',
    meeting_type: 'ordinary',
    meeting_character: 'ordinary',
    status: 'draft',
    committee: '',
    department: '',
    theme: '',
    location: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    agenda: '',
    previous_pending_items: '',
    raw_text_input: '',
    transcript_text: '',
    reporter_name: '',
    president_name: '',
    next_meeting_date: '',
    next_meeting_time: '',
    next_meeting_location: '',
    next_meeting_agenda: '',
    entry_type: 'other',
    entry_other: 'Reunião mensal',
    previous_pending_status: 'previous',
    followup_actions: [],
    minutes_report: '',
  };
}

/** Botões "Entrar na sala" (Google Meet) e "Ver gravação" (Google Drive). */
function MeetingLinks({ meeting, size = 'md' }: { meeting: Meeting; size?: 'sm' | 'md' }) {
  const meet = meeting.online_link ? normalizeUrl(meeting.online_link) : '';
  const rec = meeting.recording_url ? normalizeUrl(meeting.recording_url) : '';
  if (!meet && !rec) return null;
  const pad = size === 'sm' ? { padding: '3px 8px', fontSize: 10 } : undefined;
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
      {meet && (
        <a className="rm-link-btn rm-link-meet" style={pad} href={meet} target="_blank" rel="noopener noreferrer" title="Entrar na sala do Google Meet">
          <Video size={12} />Entrar na sala
        </a>
      )}
      {rec && (
        <a className="rm-link-btn rm-link-rec" style={pad} href={rec} target="_blank" rel="noopener noreferrer" title="Abrir a gravação no Google Drive">
          <PlayCircle size={12} />Ver gravação
        </a>
      )}
    </span>
  );
}

const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Calendário mensal com as reuniões agendadas; clique no dia lista as reuniões. */
function MeetingCalendar({ meetings, onOpen }: { meetings: Meeting[]; onOpen: (m: Meeting) => void }) {
  const today = civilDate(new Date());
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState<string>(today);
  const byDay = meetingsByDay(meetings);
  const weeks = monthGrid(cursor.y, cursor.m);
  const move = (delta: number) => setCursor(c => {
    const d = new Date(c.y, c.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const dayList = byDay[selected] || [];

  return (
    <div className="rm-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <div className="rm-section" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>Calendário de reuniões</div>
        <div className="rm-flex">
          <button className="rm-btn rm-btn-outline" style={{ padding: '4px 8px' }} onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft size={13} /></button>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 120, textAlign: 'center' }}>{MONTH_NAMES[cursor.m]} {cursor.y}</span>
          <button className="rm-btn rm-btn-outline" style={{ padding: '4px 8px' }} onClick={() => move(1)} aria-label="Próximo mês"><ChevronRight size={13} /></button>
        </div>
      </div>
      <div className="rm-cal">
        {WEEKDAY_HEADERS.map(h => <div key={h} className="rm-cal-h">{h}</div>)}
        {weeks.flat().map((day, i) => {
          if (!day) return <div key={`e${i}`} className="rm-cal-d empty" />;
          const list = byDay[day] || [];
          const cls = ['rm-cal-d', list.length ? 'has' : '', day === selected ? 'sel' : '', day === today ? 'today' : ''].join(' ');
          return (
            <div key={day} className={cls} onClick={() => setSelected(day)}>
              <span className="rm-cal-n">{Number(day.slice(8))}</span>
              {list.slice(0, 2).map(m => (
                <div key={m.id} className="rm-cal-ev" title={`${m.start_time || ''} ${m.title}`}>
                  {isOnlineMeeting(m) ? <Video size={9} /> : <Calendar size={9} />}
                  <span>{m.start_time ? `${m.start_time} ` : ''}{m.title}</span>
                </div>
              ))}
              {list.length > 2 && <div className="rm-cal-ev">+{list.length - 2}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Reuniões em {fmt(selected)}</div>
        {dayList.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--tx2)' }}>Nenhuma reunião agendada neste dia.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dayList.map(m => (
              <div key={m.id} className="rm-meeting-card" style={{ padding: 10 }} onClick={() => onOpen(m)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                      {m.start_time && <span><Clock size={10} /> {m.start_time}{m.end_time ? `–${m.end_time}` : ''}</span>}
                      {m.location && <span><MapPin size={10} /> {m.location}</span>}
                    </div>
                  </div>
                  <MeetingLinks meeting={m} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'agenda' | 'editor' | 'atas' | 'planos';

export default function ReunioesMeetingsModule() {
  const { hospitalId, hospitalName } = useHospitalContext();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allActions, setAllActions] = useState<MeetingActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  // "Outro" escolhido com o texto ainda vazio; nos demais casos a opção vem do próprio local
  const [otherLocation, setOtherLocation] = useState(false);
  const localChoice = otherLocation ? OTHER_LOCATION : locationOption(editingMeeting?.location);

  const loadData = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const [mtgs, actions] = await Promise.all([
        listMeetings(hospitalId),
        listAllActionItems(hospitalId),
      ]);
      setMeetings(mtgs);
      setAllActions(actions);
    } catch {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function openEditor(meeting?: Meeting) {
    const m = meeting ?? (hospitalId ? emptyMeeting(hospitalId) : null);
    if (!m) return;
    setEditingMeeting(m);
    setOtherLocation(false);
    setParticipants([]);
    setActionItems([]);
    setDecisions([]);
    if (m.id) {
      try {
        const [parts, acts, decs] = await Promise.all([
          listParticipants(m.id),
          listActionItems(m.id),
          listDecisions(m.id),
        ]);
        setParticipants(parts);
        setActionItems(acts);
        setDecisions(decs);
      } catch {
        toast.error('Erro ao carregar dados da reunião.');
      }
    }
    setTab('editor');
  }

  function setMeetingField(field: keyof Meeting, value: any) {
    setEditingMeeting(prev => prev ? { ...prev, [field]: value } : prev);
  }

  function addParticipant() {
    setParticipants(prev => [...prev, { name: '', role: '', institution: '', expected: true, present: true }]);
  }

  function updateParticipant(i: number, field: keyof MeetingParticipant, value: any) {
    setParticipants(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  function removeParticipant(i: number) {
    setParticipants(prev => prev.filter((_, idx) => idx !== i));
  }

  // ─── Quadro de ações (acompanhamento) ─────────────────
  const followups: FollowupAction[] = Array.isArray(editingMeeting?.followup_actions) ? editingMeeting!.followup_actions! : [];

  function setFollowups(next: FollowupAction[]) {
    setMeetingField('followup_actions', next);
  }

  function addFollowup() {
    setFollowups([...followups, { ...EMPTY_FOLLOWUP }]);
  }

  function updateFollowup(i: number, field: keyof FollowupAction, value: string) {
    setFollowups(followups.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  }

  function removeFollowup(i: number) {
    setFollowups(followups.filter((_, idx) => idx !== i));
  }

  /** Traz as pendências da reunião anterior (mesmo hospital) para o quadro de ações. */
  async function importPreviousPending() {
    if (!editingMeeting) return;
    const ref = editingMeeting.scheduled_date || editingMeeting.created_at?.slice(0, 10) || '9999-12-31';
    const previous = meetings
      .filter(m => m.id && m.id !== editingMeeting.id && m.status !== 'cancelled' && (m.scheduled_date || '') <= ref && m.scheduled_date)
      .sort((a, b) => (b.scheduled_date || '').localeCompare(a.scheduled_date || ''))[0];
    if (!previous?.id) { toast.error('Nenhuma reunião anterior com data encontrada.'); return; }
    try {
      const acts = await listActionItems(previous.id);
      const rows: FollowupAction[] = acts
        .filter(a => a.status !== 'cancelled')
        .map(a => ({
          what: a.title,
          who: a.responsible_name,
          when: [a.when_text, a.due_date ? fmt(a.due_date) : ''].filter(Boolean).join(' — '),
          status: ACTION_STATUS_LABELS[a.status],
          evidence_location: a.evidence_required || '',
        }));
      if (!rows.length) { toast.error('A reunião anterior não tem pendências cadastradas.'); return; }
      const known = new Set(followups.map(f => f.what.trim()));
      setFollowups([...followups, ...rows.filter(r => !known.has(r.what.trim()))]);
      setMeetingField('previous_pending_status', 'previous');
      toast.success(`${rows.length} pendência(s) importada(s) de ${previous.title}.`);
    } catch {
      toast.error('Erro ao importar pendências.');
    }
  }

  /** Valida e normaliza os links (Meet e gravação). Retorna null se houver erro. */
  function withValidLinks(m: Meeting): Meeting | null {
    const online = m.location === ONLINE_LOCATION;
    const meet = normalizeUrl(m.online_link);
    const rec = normalizeUrl(m.recording_url);
    if (online && !meet) { toast.error('Reunião online: informe o link da sala do Google Meet.'); return null; }
    if (meet && !isMeetLink(meet)) { toast.error('O link da sala deve ser do Google Meet (meet.google.com/...).'); return null; }
    if (rec && !isDriveLink(rec)) { toast.error('O link da gravação deve ser do Google Drive (drive.google.com/...).'); return null; }
    return { ...m, online_link: meet || null, recording_url: rec || null };
  }

  async function handleSaveMeeting() {
    if (!editingMeeting) return;
    if (!editingMeeting.title.trim()) { toast.error('Informe o título da reunião.'); return; }
    const toSave = withValidLinks(editingMeeting);
    if (!toSave) return;
    setSaving(true);
    try {
      const saved = toSave.id
        ? await updateMeeting(toSave.id, toSave)
        : await createMeeting(toSave);
      setEditingMeeting(saved);
      await saveParticipants(saved.id!, participants);
      await loadData();
      toast.success('Reunião salva com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? ''));
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateMinutes() {
    if (!editingMeeting) return;
    if (!editingMeeting.title.trim()) { toast.error('Informe o título da reunião antes de gerar a ata.'); return; }
    const toSave = withValidLinks(editingMeeting);
    if (!toSave) return;
    setGenerating(true);
    try {
      let saved = toSave;
      if (!saved.id) {
        saved = await createMeeting(toSave);
        setEditingMeeting(saved);
      } else {
        saved = await updateMeeting(saved.id, toSave);
      }
      await saveParticipants(saved.id!, participants);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('generate-meeting-minutes', {
        body: {
          meeting: saved,
          participants,
          rawText: saved.raw_text_input,
          transcript: saved.transcript_text,
          previousPendingItems: saved.previous_pending_items,
        },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data as any;

      const updated = await updateMeeting(saved.id!, {
        generated_minutes_md: result.minutesMarkdown,
        ai_summary: result.summary,
        status: 'minutes_generated',
        // o relato do formulário só é preenchido automaticamente quando ainda está vazio
        ...(saved.minutes_report?.trim() ? {} : { minutes_report: markdownToPlain(result.minutesMarkdown || '') }),
      });
      setEditingMeeting(updated);

      // Save decisions and action items from AI
      if (result.decisions?.length) {
        const newDecs = await saveDecisions(saved.id!, result.decisions);
        setDecisions(newDecs);
      }
      if (result.actionItems?.length) {
        const savedActions: MeetingActionItem[] = [];
        for (const item of result.actionItems) {
          const saved2 = await upsertActionItem({
            ...item,
            meeting_id: saved.id!,
            hospital_id: hospitalId!,
          });
          savedActions.push(saved2);
        }
        setActionItems(savedActions);
      }

      await loadData();
      toast.success('Ata gerada com sucesso! Revise antes de aprovar.');
    } catch (e: any) {
      toast.error('Erro ao gerar ata: ' + (e?.message ?? 'Tente novamente.'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleApproveMeeting() {
    if (!editingMeeting?.id) return;
    try {
      const updated = await updateMeeting(editingMeeting.id, { status: 'approved' });
      setEditingMeeting(updated);
      await loadData();
      toast.success('Ata aprovada!');
    } catch {
      toast.error('Erro ao aprovar ata.');
    }
  }

  async function handleDeleteMeeting(id: string) {
    if (!confirm('Deseja excluir esta reunião e todos os seus dados?')) return;
    try {
      await deleteMeeting(id);
      await loadData();
      toast.success('Reunião excluída.');
    } catch {
      toast.error('Erro ao excluir reunião.');
    }
  }

  async function handleExportPdf() {
    if (!editingMeeting) return;
    await generateMeetingMinutesPdf({
      meeting: editingMeeting,
      participants,
      actionItems,
      hospitalName: hospitalName || 'Hospital',
      hospitalId: hospitalId || undefined,
      pendingItems: editingMeeting.previous_pending_items || undefined,
    });
    toast.success('PDF gerado!');
  }

  // Action plan handlers
  function addActionItem() {
    if (!editingMeeting) return;
    setActionItems(prev => [...prev, {
      hospital_id: hospitalId!,
      meeting_id: editingMeeting.id,
      title: '',
      responsible_name: '',
      priority: 'medium',
      status: 'open',
    }]);
  }

  function updateActionItem(i: number, field: keyof MeetingActionItem, value: any) {
    setActionItems(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  }

  async function saveActionItem(i: number) {
    if (!editingMeeting?.id || !hospitalId) return;
    const item = actionItems[i];
    if (!item.title.trim() || !item.responsible_name.trim()) {
      toast.error('Informe título e responsável.');
      return;
    }
    try {
      const saved = await upsertActionItem({ ...item, meeting_id: editingMeeting.id, hospital_id: hospitalId });
      setActionItems(prev => prev.map((a, idx) => idx === i ? saved : a));
      toast.success('Ação salva!');
    } catch {
      toast.error('Erro ao salvar ação.');
    }
  }

  async function removeActionItem(i: number) {
    const item = actionItems[i];
    if (item.id) {
      try {
        await deleteActionItem(item.id);
      } catch {
        toast.error('Erro ao excluir ação.');
        return;
      }
    }
    setActionItems(prev => prev.filter((_, idx) => idx !== i));
  }

  async function updateActionStatus(id: string, status: ActionStatus) {
    try {
      await updateActionItemStatus(id, status);
      await loadData();
      toast.success('Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  }

  // ─── Dashboard metrics ─────────────────────────────────
  const now = new Date();
  const scheduled = meetings.filter(m => m.status === 'scheduled').length;
  const completed = meetings.filter(m => ['completed', 'minutes_generated', 'approved'].includes(m.status)).length;
  const pendingApproval = meetings.filter(m => ['under_review', 'minutes_generated'].includes(m.status)).length;
  const openActions = allActions.filter(a => ['open', 'in_progress'].includes(a.status)).length;
  const overdueActions = allActions.filter(a => a.due_date && new Date(a.due_date) < now && a.status !== 'done').length;
  const doneActions = allActions.filter(a => a.status === 'done').length;
  const completionRate = allActions.length ? Math.round((doneActions / allActions.length) * 100) : null;

  const meetingsWithMinutes = meetings.filter(m => m.generated_minutes_md || m.minutes_report);

  return (
    <div className="rm-wrap">
      <style>{CSS}</style>

      {/* Tabs */}
      <div className="rm-tabs">
        {([
          ['dashboard', BarChart3, 'Dashboard'],
          ['agenda', Calendar, 'Agenda'],
          ['editor', editingMeeting ? Edit3 : Plus, editingMeeting ? 'Editar Reunião' : 'Nova Reunião'],
          ['atas', FileText, 'Atas Geradas'],
          ['planos', CheckCircle2, 'Planos de Ação'],
        ] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            className={`rm-tab${tab === id ? ' active' : ''}`}
            onClick={() => {
              if (id === 'editor' && !editingMeeting && hospitalId) {
                setEditingMeeting(emptyMeeting(hospitalId)); setOtherLocation(false);
                setParticipants([]);
                setActionItems([]);
                setDecisions([]);
              }
              setTab(id as Tab);
            }}
          >
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      <div className="rm-main">

        {/* ─── DASHBOARD ─────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx)' }}>Reuniões e Atas Inteligentes</h1>
                <p style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 2 }}>Gestão completa de reuniões, atas e planos de ação</p>
              </div>
              <button className="rm-btn rm-btn-teal" onClick={() => { if (hospitalId) { setEditingMeeting(emptyMeeting(hospitalId)); setOtherLocation(false); setParticipants([]); setActionItems([]); setDecisions([]); } setTab('editor'); }}>
                <Plus size={13} />Nova Reunião
              </button>
            </div>

            <MeetingCalendar meetings={meetings} onOpen={openEditor} />

            <div className="rm-grid4">
              {[
                { label: 'Reuniões agendadas', val: scheduled, cls: '' },
                { label: 'Reuniões realizadas', val: completed, cls: '' },
                { label: 'Atas pendentes', val: pendingApproval, cls: pendingApproval > 0 ? 'warn' : '' },
                { label: 'Ações em aberto', val: openActions, cls: '' },
                { label: 'Ações vencidas', val: overdueActions, cls: overdueActions > 0 ? 'danger' : '' },
                { label: 'Ações concluídas', val: doneActions, cls: 'teal' },
                { label: 'Taxa de conclusão', val: completionRate !== null ? `${completionRate}%` : '—', cls: '' },
                { label: 'Total de reuniões', val: meetings.length, cls: '' },
              ].map(k => (
                <div key={k.label} className="rm-kpi">
                  <div className={`rm-kpi-val ${k.cls}`}>{k.val}</div>
                  <div className="rm-kpi-lbl">{k.label}</div>
                </div>
              ))}
            </div>

            {overdueActions > 0 && (
              <div style={{ background: 'rgba(218,54,51,.1)', border: '1px solid var(--red)', borderRadius: 'var(--r)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color="var(--red)" />
                <span style={{ fontSize: 13, color: 'var(--red)' }}>{overdueActions} ação(ões) com prazo vencido. Acesse Planos de Ação para visualizar.</span>
              </div>
            )}

            <div className="rm-card">
              <div className="rm-section">Últimas reuniões</div>
              {meetings.length === 0 ? (
                <div className="rm-empty"><ClipboardList size={32} style={{ opacity: .3, marginBottom: 8 }} /><p>Nenhuma reunião registrada ainda.</p></div>
              ) : (
                <table className="rm-table">
                  <thead><tr>
                    <th>Título</th><th>Data</th><th>Comissão</th><th>Status</th><th>Ação</th>
                  </tr></thead>
                  <tbody>
                    {meetings.slice(0, 8).map(m => (
                      <tr key={m.id}>
                        <td>{m.title}</td>
                        <td>{fmt(m.scheduled_date)}</td>
                        <td>{m.committee || m.department || '—'}</td>
                        <td><span className={`rm-badge ${STATUS_CLASS[m.status]}`}>{STATUS_LABELS[m.status]}</span></td>
                        <td>
                          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="rm-btn rm-btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => openEditor(m)}>
                              <Edit3 size={11} />Abrir
                            </button>
                            <MeetingLinks meeting={m} size="sm" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── AGENDA ────────────────────────────────────────── */}
        {tab === 'agenda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Agenda de Reuniões</h2>
              <button className="rm-btn rm-btn-teal" onClick={() => { if (hospitalId) { setEditingMeeting(emptyMeeting(hospitalId)); setOtherLocation(false); setParticipants([]); setActionItems([]); setDecisions([]); } setTab('editor'); }}>
                <Plus size={13} />Nova Reunião
              </button>
            </div>

            {loading ? (
              <div className="rm-empty"><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', opacity: .5 }} /></div>
            ) : meetings.length === 0 ? (
              <div className="rm-empty"><Calendar size={32} style={{ opacity: .3, marginBottom: 8 }} /><p>Nenhuma reunião registrada.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {meetings.map(m => (
                  <div key={m.id} className="rm-meeting-card" onClick={() => openEditor(m)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span className={`rm-badge ${STATUS_CLASS[m.status]}`}>{STATUS_LABELS[m.status]}</span>
                          {m.meeting_character === 'extraordinary' && <span className="rm-badge rm-badge-amber">Extraordinária</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--tx2)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {m.scheduled_date && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={11} />{fmt(m.scheduled_date)}</span>}
                          {(m.committee || m.department) && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Hash size={11} />{m.committee || m.department}</span>}
                          {m.location && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{m.location}</span>}
                          {m.reporter_name && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={11} />Relator: {m.reporter_name}</span>}
                        </div>
                        {m.theme && <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 4 }}>Tema: {m.theme}</div>}
                        <div style={{ marginTop: 8 }}><MeetingLinks meeting={m} /></div>
                      </div>
                      <button
                        className="rm-btn rm-btn-red"
                        style={{ padding: '5px 10px', fontSize: 11, flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); handleDeleteMeeting(m.id!); }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── EDITOR ────────────────────────────────────────── */}
        {tab === 'editor' && editingMeeting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="rm-btn rm-btn-outline" onClick={() => setTab('agenda')}>
                <ChevronLeft size={13} />Agenda
              </button>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>{editingMeeting.id ? 'Editar Reunião' : 'Nova Reunião'}</h2>
                <p style={{ fontSize: 11, color: 'var(--tx2)' }}>Preencha os dados, cole texto ou transcrição e gere a ata automaticamente.</p>
              </div>
            </div>

            {/* Cabeçalho do formulário — mesma ordem do modelo de ata */}
            <div className="rm-card">
              <div className="rm-section">Formulário — Ata de Reuniões</div>
              <div className="rm-grid3" style={{ gap: 12, marginBottom: 12 }}>
                <div className="rm-field" style={{ gridColumn: 'span 2' }}>
                  <label className="rm-label">Título no sistema *</label>
                  <input className="rm-input" value={editingMeeting.title} onChange={e => setMeetingField('title', e.target.value)} placeholder="Ex.: Reunião Ordinária da CCIH — Outubro/2026" />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Status</label>
                  <select className="rm-select" value={editingMeeting.status} onChange={e => setMeetingField('status', e.target.value as MeetingStatus)}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="rm-form">
                <div className="rm-form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                  <div className="rm-form-cell">
                    <label className="rm-label">Relator da Ata</label>
                    <input className="rm-input" value={editingMeeting.reporter_name || ''} onChange={e => setMeetingField('reporter_name', e.target.value)} />
                  </div>
                  <div className="rm-form-cell">
                    <label className="rm-label">Data</label>
                    <input className="rm-input" type="date" value={editingMeeting.scheduled_date || ''} onChange={e => setMeetingField('scheduled_date', e.target.value)} />
                  </div>
                  <div className="rm-form-cell">
                    <label className="rm-label">Setor</label>
                    <input className="rm-input" value={editingMeeting.committee || ''} onChange={e => setMeetingField('committee', e.target.value)} placeholder="Ex.: CCIH" />
                  </div>
                </div>
                <div className="rm-form-row" style={{ gridTemplateColumns: '2fr 1.3fr 0.7fr' }}>
                  <div className="rm-form-cell">
                    <label className="rm-label">Tema</label>
                    <input className="rm-input" value={editingMeeting.theme || ''} onChange={e => setMeetingField('theme', e.target.value)} placeholder="Ex.: Comissão de Controle de Infecção Hospitalar" />
                  </div>
                  <div className="rm-form-cell">
                    <label className="rm-label">Caráter da Reunião</label>
                    <div className="rm-radios">
                      {([['ordinary', 'Ordinária'], ['extraordinary', 'Extraordinária']] as const).map(([v, l]) => (
                        <label key={v}><input type="radio" className="rm-checkbox" checked={editingMeeting.meeting_character === v} onChange={() => setMeetingField('meeting_character', v)} />{l}</label>
                      ))}
                    </div>
                  </div>
                  <div className="rm-form-cell">
                    <label className="rm-label">Início / Término</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input className="rm-input" type="time" value={editingMeeting.start_time || ''} onChange={e => setMeetingField('start_time', e.target.value)} />
                      <input className="rm-input" type="time" value={editingMeeting.end_time || ''} onChange={e => setMeetingField('end_time', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="rm-form-row" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="rm-form-cell">
                    <label className="rm-label">Entrada</label>
                    <div className="rm-radios">
                      {ENTRY_OPTIONS.map(([v, l]) => (
                        <label key={v}><input type="radio" className="rm-checkbox" checked={editingMeeting.entry_type === v} onChange={() => setMeetingField('entry_type', v)} />{l}</label>
                      ))}
                      {editingMeeting.entry_type === 'other' && (
                        <input className="rm-input" style={{ maxWidth: 260 }} value={editingMeeting.entry_other || ''} onChange={e => setMeetingField('entry_other', e.target.value)} placeholder="Ex.: Reunião mensal" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="rm-form-row" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="rm-form-cell">
                    <label className="rm-label">Pendências</label>
                    <div className="rm-radios">
                      {PENDING_OPTIONS.map(([v, l]) => (
                        <label key={v}><input type="radio" className="rm-checkbox" checked={editingMeeting.previous_pending_status === v} onChange={() => setMeetingField('previous_pending_status', v)} />{l}</label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rm-grid3" style={{ gap: 12, marginTop: 12 }}>
                <div className="rm-field">
                  <label className="rm-label">Local</label>
                  <select
                    className="rm-select"
                    value={localChoice}
                    onChange={e => {
                      const v = e.target.value;
                      setOtherLocation(v === OTHER_LOCATION);
                      // "Outro": mantém o texto livre já digitado (ou vazio) até o usuário preencher
                      setMeetingField('location', v === OTHER_LOCATION ? (LOCATION_OPTIONS.includes(editingMeeting.location || '') ? '' : editingMeeting.location || '') : v);
                    }}
                  >
                    <option value="">Selecione</option>
                    {LOCATION_OPTIONS.map(o => <option key={o} value={o}>{o === ONLINE_LOCATION ? 'Online — link do Google Meet' : o}</option>)}
                    {localChoice === OTHER_LOCATION && <option value={OTHER_LOCATION}>Outro</option>}
                  </select>
                  {localChoice === OTHER_LOCATION && (
                    <input className="rm-input" style={{ marginTop: 6 }} value={editingMeeting.location || ''} onChange={e => setMeetingField('location', e.target.value)} placeholder="Digite o local" />
                  )}
                </div>
                <div className="rm-field">
                  <label className="rm-label">Presidente / Condutor</label>
                  <input className="rm-input" value={editingMeeting.president_name || ''} onChange={e => setMeetingField('president_name', e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Código do formulário (rodapé do PDF)</label>
                  <input className="rm-input" value={editingMeeting.form_code || ''} onChange={e => setMeetingField('form_code', e.target.value)} placeholder="Ex.: FOR-HGNI-001" />
                </div>
              </div>

              {editingMeeting.location === ONLINE_LOCATION && (
                <div style={{ marginTop: 14, padding: 12, border: '1px solid #1a73e8', borderRadius: 'var(--r)', background: 'rgba(26,115,232,.08)' }}>
                  <div className="rm-flex" style={{ marginBottom: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Video size={14} color="#1a73e8" />Sala online (Google Meet)</span>
                    <a className="rm-link-btn rm-link-rec" href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={12} />Criar sala no Google Meet
                    </a>
                  </div>
                  <label className="rm-label">Link da sala *</label>
                  <input
                    className="rm-input"
                    value={editingMeeting.online_link || ''}
                    onChange={e => setMeetingField('online_link', e.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij"
                  />
                  {editingMeeting.online_link && !isMeetLink(editingMeeting.online_link) ? (
                    <div className="rm-hint err">Use um link do Google Meet (meet.google.com/...).</div>
                  ) : (
                    <div className="rm-hint">Crie a sala no Google Meet, copie o link e cole aqui. Todos verão o botão "Entrar na sala".</div>
                  )}
                </div>
              )}
            </div>
            {/* Quadro de ações — O Quê | Quem | Quando | Situação | Local de Arquivamento da Evidência */}
            <div className="rm-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div className="rm-section" style={{ marginBottom: 0 }}>Quadro de Ações (acompanhamento)</div>
                <div className="rm-flex">
                  <button className="rm-btn rm-btn-outline" onClick={importPreviousPending}><ClipboardList size={12} />Importar pendências da reunião anterior</button>
                  <button className="rm-btn rm-btn-outline" onClick={addFollowup}><Plus size={12} />Adicionar linha</button>
                </div>
              </div>
              {followups.length === 0 ? (
                <div className="rm-empty" style={{ padding: '16px 0' }}><p>Nenhuma ação em acompanhamento. Importe as pendências da reunião anterior ou adicione uma linha.</p></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="rm-table rm-form-table">
                    <thead>
                      <tr><th style={{ width: '38%' }}>O Quê</th><th style={{ width: '13%' }}>Quem</th><th style={{ width: '13%' }}>Quando</th><th style={{ width: '14%' }}>Situação</th><th style={{ width: '18%' }}>Local de Arquivamento da Evidência</th><th /></tr>
                    </thead>
                    <tbody>
                      {followups.map((f, i) => (
                        <tr key={i}>
                          <td><textarea className="rm-textarea" rows={2} style={{ minHeight: 48 }} value={f.what} onChange={e => updateFollowup(i, 'what', e.target.value)} /></td>
                          <td><textarea className="rm-textarea" rows={2} style={{ minHeight: 48 }} value={f.who} onChange={e => updateFollowup(i, 'who', e.target.value)} /></td>
                          <td><textarea className="rm-textarea" rows={2} style={{ minHeight: 48 }} value={f.when} onChange={e => updateFollowup(i, 'when', e.target.value)} placeholder="Ex.: Mês julho a outubro" /></td>
                          <td>
                            <textarea className="rm-textarea" rows={2} style={{ minHeight: 48 }} value={f.status} onChange={e => updateFollowup(i, 'status', e.target.value)} placeholder="Ex.: Em andamento" />
                          </td>
                          <td><textarea className="rm-textarea" rows={2} style={{ minHeight: 48 }} value={f.evidence_location} onChange={e => updateFollowup(i, 'evidence_location', e.target.value)} placeholder="Ex.: Indicadores mensais" /></td>
                          <td><button className="rm-btn rm-btn-red" style={{ padding: '4px 8px' }} onClick={() => removeFollowup(i)}><Trash2 size={11} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="rm-field rm-mt">
                <label className="rm-label">Observações sobre as pendências anteriores (texto livre, usado também pela IA)</label>
                <textarea className="rm-textarea" rows={3} value={editingMeeting.previous_pending_items || ''} onChange={e => setMeetingField('previous_pending_items', e.target.value)} placeholder="Descreva pendências anteriores..." />
              </div>
            </div>

            {/* Relato da Reunião */}
            <div className="rm-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div className="rm-section" style={{ marginBottom: 0 }}>Relato da Reunião</div>
                {editingMeeting.generated_minutes_md && (
                  <button className="rm-btn rm-btn-outline" onClick={() => setMeetingField('minutes_report', markdownToPlain(editingMeeting.generated_minutes_md || ''))}>
                    <Sparkles size={12} />Usar o texto da ata gerada pela IA
                  </button>
                )}
              </div>
              <textarea
                className="rm-textarea"
                style={{ minHeight: 260, fontFamily: "'Times New Roman', Times, serif", fontSize: 13, lineHeight: 1.5, textAlign: 'justify' }}
                value={editingMeeting.minutes_report || ''}
                onChange={e => setMeetingField('minutes_report', e.target.value)}
                placeholder="Às __:__ horas do dia __ de ______ de dois mil e vinte e seis, no ..., reuniram-se ..."
              />
              <div className="rm-hint">Texto corrido, em parágrafos. É impresso no quadro "Relato da Reunião" do PDF, justificado. Se ficar vazio, o PDF usa a ata gerada pela IA.</div>
            </div>
            {/* Pendências — O Quê | Quem | Quando (plano de ação da reunião) */}
            {editingMeeting.id && (
              <div className="rm-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="rm-section" style={{ marginBottom: 0 }}>Pendências – (Resoluções / Comunicação de alterações e etc.)</div>
                  <button className="rm-btn rm-btn-outline" onClick={addActionItem}><Plus size={12} />Adicionar pendência</button>
                </div>
                {actionItems.length === 0 ? (
                  <div className="rm-empty" style={{ padding: '16px 0' }}><p>Nenhuma pendência cadastrada. Gere a ata com IA ou adicione manualmente.</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {actionItems.map((item, i) => (
                      <div key={i} className="rm-card-sm">
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.2fr', gap: 8, marginBottom: 8 }}>
                          <div className="rm-field">
                            <label className="rm-label">O Quê *</label>
                            <textarea className="rm-textarea" rows={2} style={{ minHeight: 48 }} value={item.title} onChange={e => updateActionItem(i, 'title', e.target.value)} placeholder="O que deve ser feito?" />
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Quem *</label>
                            <input className="rm-input" value={item.responsible_name} onChange={e => updateActionItem(i, 'responsible_name', e.target.value)} placeholder="Ex.: Enfermeiros SCIH" />
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Quando</label>
                            <input className="rm-input" value={item.when_text || ''} onChange={e => updateActionItem(i, 'when_text', e.target.value)} placeholder="Ex.: Mês julho a novembro" />
                          </div>
                        </div>
                        <div className="rm-grid4" style={{ gap: 8, marginBottom: 8 }}>
                          <div className="rm-field">
                            <label className="rm-label">Prazo final (data)</label>
                            <input className="rm-input" type="date" value={item.due_date || ''} onChange={e => updateActionItem(i, 'due_date', e.target.value || null)} />
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Prioridade</label>
                            <select className="rm-select" value={item.priority} onChange={e => updateActionItem(i, 'priority', e.target.value as ActionPriority)}>
                              {Object.entries(ACTION_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Situação</label>
                            <select className="rm-select" value={item.status} onChange={e => updateActionItem(i, 'status', e.target.value as ActionStatus)}>
                              {Object.entries(ACTION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Setor envolvido</label>
                            <input className="rm-input" value={item.department || ''} onChange={e => updateActionItem(i, 'department', e.target.value)} />
                          </div>
                        </div>
                        <div className="rm-grid2" style={{ gap: 8, marginBottom: 8 }}>
                          <div className="rm-field">
                            <label className="rm-label">Por quê</label>
                            <input className="rm-input" value={item.why || ''} onChange={e => updateActionItem(i, 'why', e.target.value)} />
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Local de arquivamento da evidência</label>
                            <input className="rm-input" value={item.evidence_required || ''} onChange={e => updateActionItem(i, 'evidence_required', e.target.value)} placeholder="Ex.: Lista de treinamento; pré e pós-teste" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button className="rm-btn rm-btn-red" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => removeActionItem(i)}><Trash2 size={11} />Remover</button>
                          <button className="rm-btn rm-btn-teal" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => saveActionItem(i)}><Save size={11} />Salvar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Próxima reunião */}
            <div className="rm-card">
              <div className="rm-section">Próxima Reunião</div>
              <div className="rm-grid3" style={{ gap: 10 }}>
                <div className="rm-field">
                  <label className="rm-label">Data</label>
                  <input className="rm-input" type="date" value={editingMeeting.next_meeting_date || ''} onChange={e => setMeetingField('next_meeting_date', e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Horário</label>
                  <input className="rm-input" type="time" value={editingMeeting.next_meeting_time || ''} onChange={e => setMeetingField('next_meeting_time', e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Local</label>
                  <input className="rm-input" value={editingMeeting.next_meeting_location || ''} onChange={e => setMeetingField('next_meeting_location', e.target.value)} />
                </div>
                <div className="rm-field" style={{ gridColumn: 'span 3' }}>
                  <label className="rm-label">Pauta prevista</label>
                  <input className="rm-input" value={editingMeeting.next_meeting_agenda || ''} onChange={e => setMeetingField('next_meeting_agenda', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Participantes */}
            <div className="rm-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="rm-section" style={{ marginBottom: 0 }}>Participantes</div>
                <button className="rm-btn rm-btn-outline" onClick={addParticipant}><Plus size={12} />Adicionar</button>
              </div>
              {participants.length === 0 ? (
                <div className="rm-empty" style={{ padding: '20px 0' }}><Users size={20} style={{ opacity: .3, marginBottom: 6 }} /><p>Nenhum participante adicionado.</p></div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 8, paddingBottom: 6, borderBottom: '1px solid var(--bd)', marginBottom: 6 }}>
                    {['Nome', 'Cargo/Função', 'Instituição/Setor', 'Presente', ''].map(h => (
                      <span key={h} style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>{h}</span>
                    ))}
                  </div>
                  {participants.map((p, i) => (
                    <div key={i} className="rm-participant-row">
                      <input className="rm-input" value={p.name} onChange={e => updateParticipant(i, 'name', e.target.value)} placeholder="Nome completo" />
                      <input className="rm-input" value={p.role || ''} onChange={e => updateParticipant(i, 'role', e.target.value)} placeholder="Cargo" />
                      <input className="rm-input" value={p.institution || ''} onChange={e => updateParticipant(i, 'institution', e.target.value)} placeholder="Setor" />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx2)', cursor: 'pointer' }}>
                        <input type="checkbox" className="rm-checkbox" checked={p.present} onChange={e => updateParticipant(i, 'present', e.target.checked)} />
                        Presente
                      </label>
                      <button className="rm-btn rm-btn-red" style={{ padding: '4px 8px' }} onClick={() => removeParticipant(i)}><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pauta */}
            <div className="rm-card">
              <div className="rm-section">Pauta</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="rm-field">
                  <label className="rm-label">Pauta da Reunião</label>
                  <textarea className="rm-textarea" rows={4} value={editingMeeting.agenda || ''} onChange={e => setMeetingField('agenda', e.target.value)} placeholder="Liste os itens da pauta..." />
                </div>
              </div>
            </div>
            {/* Gravação */}
            <div className="rm-card">
              <div className="rm-section">Gravação da Reunião</div>
              <div className="rm-field">
                <label className="rm-label">Link da gravação no Google Drive</label>
                <input
                  className="rm-input"
                  value={editingMeeting.recording_url || ''}
                  onChange={e => setMeetingField('recording_url', e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                />
                {editingMeeting.recording_url && !isDriveLink(editingMeeting.recording_url) ? (
                  <div className="rm-hint err">Use um link do Google Drive (drive.google.com/...).</div>
                ) : (
                  <div className="rm-hint">Depois da reunião, cole o link da gravação (compartilhada com a equipe). Fica disponível no botão "Ver gravação".</div>
                )}
              </div>
            </div>

            {/* Texto livre e transcrição */}
            <div className="rm-card">
              <div className="rm-section">Conteúdo da Reunião</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="rm-field">
                  <label className="rm-label">Texto livre / Anotações (cole texto, WhatsApp, etc.)</label>
                  <textarea className="rm-textarea" rows={7} value={editingMeeting.raw_text_input || ''} onChange={e => setMeetingField('raw_text_input', e.target.value)} placeholder="Cole aqui o texto da reunião, anotações, relato ou mensagens do WhatsApp..." />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Transcrição do Áudio (cole a transcrição gerada por IA externa)</label>
                  <textarea className="rm-textarea" rows={7} value={editingMeeting.transcript_text || ''} onChange={e => setMeetingField('transcript_text', e.target.value)} placeholder="Cole aqui a transcrição do áudio..." />
                </div>
              </div>
            </div>

            {/* Ata gerada */}
            {editingMeeting.generated_minutes_md && (
              <div className="rm-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="rm-section" style={{ marginBottom: 0 }}>Ata Gerada pela IA (rascunho em Markdown)</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="rm-btn rm-btn-outline" onClick={handleExportPdf}><Download size={12} />Exportar PDF</button>
                    {editingMeeting.status !== 'approved' && (
                      <button className="rm-btn rm-btn-teal" onClick={handleApproveMeeting}><CheckCircle2 size={12} />Aprovar Ata</button>
                    )}
                  </div>
                </div>
                {editingMeeting.ai_summary && (
                  <div style={{ background: 'var(--teal-g)', border: '1px solid var(--teal)', borderRadius: 'var(--r)', padding: 10, marginBottom: 10, fontSize: 12 }}>
                    <strong style={{ color: 'var(--teal)', fontSize: 11 }}>RESUMO EXECUTIVO</strong>
                    <p style={{ marginTop: 4, color: 'var(--tx)' }}>{editingMeeting.ai_summary}</p>
                  </div>
                )}
                <textarea
                  className="rm-textarea"
                  style={{ minHeight: 350, fontFamily: 'monospace', fontSize: 11 }}
                  value={editingMeeting.generated_minutes_md}
                  onChange={e => setMeetingField('generated_minutes_md', e.target.value)}
                />
              </div>
            )}

            {/* Deliberações */}
            {decisions.length > 0 && (
              <div className="rm-card">
                <div className="rm-section">Deliberações</div>
                <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {decisions.map((d, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--tx)' }}>
                      {d.decision}
                      {(d.responsible_name || d.due_date) && (
                        <span style={{ color: 'var(--tx2)', fontSize: 11, marginLeft: 8 }}>
                          {d.responsible_name ? `— ${d.responsible_name}` : ''}{d.due_date ? ` | ${fmt(d.due_date)}` : ''}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 }}>
              <div>
                {editingMeeting.id && (
                  <button className="rm-btn rm-btn-outline" onClick={handleExportPdf}><Download size={13} />Exportar PDF</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="rm-btn rm-btn-outline" disabled={saving} onClick={handleSaveMeeting}>
                  {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}Salvar
                </button>
                <button className="rm-btn rm-btn-teal" disabled={generating} onClick={handleGenerateMinutes}>
                  {generating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
                  {generating ? 'Gerando ata...' : 'Gerar Ata com IA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── ATAS GERADAS ──────────────────────────────────── */}
        {tab === 'atas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Atas Geradas</h2>
            {meetingsWithMinutes.length === 0 ? (
              <div className="rm-empty" style={{ paddingTop: 60 }}>
                <FileText size={40} style={{ opacity: .2, marginBottom: 10 }} />
                <p>Nenhuma ata gerada ainda.</p>
                <p style={{ fontSize: 11, marginTop: 6 }}>Crie uma reunião, adicione conteúdo e clique em "Gerar Ata com IA".</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {meetingsWithMinutes.map(m => (
                  <div key={m.id} className="rm-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <span className={`rm-badge ${STATUS_CLASS[m.status]}`}>{STATUS_LABELS[m.status]}</span>
                          {m.meeting_character === 'extraordinary' && <span className="rm-badge rm-badge-amber">Extraordinária</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--tx2)', display: 'flex', gap: 10 }}>
                          <span><Calendar size={10} style={{ marginRight: 2 }} />{fmt(m.scheduled_date)}</span>
                          {(m.committee || m.department) && <span>{m.committee || m.department}</span>}
                          {m.reporter_name && <span>Relator: {m.reporter_name}</span>}
                        </div>
                        {m.ai_summary && (
                          <p style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6, fontStyle: 'italic' }}>{m.ai_summary}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          className="rm-btn rm-btn-outline"
                          style={{ padding: '5px 10px', fontSize: 11 }}
                          onClick={async () => {
                            const parts = await listParticipants(m.id!).catch(() => []);
                            const acts = await listAllActionItems(hospitalId!).then(a => a.filter(x => x.meeting_id === m.id)).catch(() => []);
                            await generateMeetingMinutesPdf({ meeting: m, participants: parts, actionItems: acts, hospitalName: hospitalName || 'Hospital', hospitalId: hospitalId || undefined });
                            toast.success('PDF gerado!');
                          }}
                        >
                          <Download size={11} />PDF
                        </button>
                        <button className="rm-btn rm-btn-teal" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => openEditor(m)}>
                          <Edit3 size={11} />Abrir
                        </button>
                      </div>
                    </div>
                    <div className="rm-minutes-preview" style={{ marginTop: 12, maxHeight: 120 }}>
                      {m.generated_minutes_md?.slice(0, 400)}…
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── PLANOS DE AÇÃO ────────────────────────────────── */}
        {tab === 'planos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Planos de Ação — Todas as Reuniões</h2>

            {loading ? (
              <div className="rm-empty"><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', opacity: .5 }} /></div>
            ) : allActions.length === 0 ? (
              <div className="rm-empty" style={{ paddingTop: 60 }}>
                <CheckCircle2 size={40} style={{ opacity: .2, marginBottom: 10 }} />
                <p>Nenhuma ação cadastrada ainda.</p>
              </div>
            ) : (
              <>
                <div className="rm-grid4">
                  {[
                    { label: 'Em aberto', val: openActions, cls: '' },
                    { label: 'Vencidas', val: overdueActions, cls: overdueActions > 0 ? 'danger' : '' },
                    { label: 'Concluídas', val: doneActions, cls: '' },
                    { label: 'Taxa de conclusão', val: completionRate !== null ? `${completionRate}%` : '—', cls: '' },
                  ].map(k => (
                    <div key={k.label} className="rm-kpi">
                      <div className={`rm-kpi-val ${k.cls}`}>{k.val}</div>
                      <div className="rm-kpi-lbl">{k.label}</div>
                    </div>
                  ))}
                </div>

                <div className="rm-card" style={{ overflowX: 'auto' }}>
                  <table className="rm-table" style={{ minWidth: 700 }}>
                    <thead><tr>
                      <th>Ação</th><th>Responsável</th><th>Prazo</th>
                      <th>Prioridade</th><th>Status</th><th>Alterar Status</th>
                    </tr></thead>
                    <tbody>
                      {allActions.map(item => {
                        const overdue = item.due_date && new Date(item.due_date) < now && item.status !== 'done';
                        const priorityClass = item.priority === 'critical' ? 'rm-badge-red' : item.priority === 'high' ? 'rm-badge-amber' : 'rm-badge-gray';
                        const statusClass = item.status === 'done' ? 'rm-badge-teal' : item.status === 'overdue' || overdue ? 'rm-badge-red' : item.status === 'in_progress' ? 'rm-badge-amber' : 'rm-badge-gray';
                        return (
                          <tr key={item.id} style={{ background: overdue ? 'rgba(218,54,51,.05)' : undefined }}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{item.title}</div>
                              {item.description && <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>{item.description}</div>}
                            </td>
                            <td>{item.responsible_name}</td>
                            <td>
                              <span style={{ color: overdue ? 'var(--red)' : undefined, fontWeight: overdue ? 600 : undefined }}>
                                {fmt(item.due_date)}
                                {overdue && <span style={{ fontSize: 10, display: 'block' }}>VENCIDA</span>}
                              </span>
                            </td>
                            <td><span className={`rm-badge ${priorityClass}`}>{ACTION_PRIORITY_LABELS[item.priority]}</span></td>
                            <td><span className={`rm-badge ${statusClass}`}>{ACTION_STATUS_LABELS[item.status]}</span></td>
                            <td>
                              <select
                                className="rm-select"
                                style={{ fontSize: 11, padding: '4px 8px' }}
                                value={item.status}
                                onChange={e => item.id && updateActionStatus(item.id, e.target.value as ActionStatus)}
                              >
                                {Object.entries(ACTION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
