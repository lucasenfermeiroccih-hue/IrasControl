import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, Plus, Loader2, Trash2, CheckCircle2, Clock,
  FileText, Download, Users, Calendar, BarChart3, AlertTriangle,
  ChevronLeft, Save, Sparkles, User, MapPin, Hash, Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import {
  createMeeting, updateMeeting, listMeetings, deleteMeeting,
  saveParticipants, listParticipants,
  upsertActionItem, deleteActionItem, listActionItems, listAllActionItems,
  saveDecisions, listDecisions,
} from "@/modules/meeting-minutes/meetingService";
import { generateMeetingMinutesPdf } from "@/modules/meeting-minutes/generateMeetingMinutesPdf";
import type {
  Meeting, MeetingParticipant, MeetingActionItem, MeetingDecision,
  ActionStatus, ActionPriority, MeetingStatus,
} from "@/modules/meeting-minutes/types";

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
  };
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

  async function handleSaveMeeting() {
    if (!editingMeeting) return;
    if (!editingMeeting.title.trim()) { toast.error('Informe o título da reunião.'); return; }
    setSaving(true);
    try {
      const saved = editingMeeting.id
        ? await updateMeeting(editingMeeting.id, editingMeeting)
        : await createMeeting(editingMeeting);
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
    setGenerating(true);
    try {
      let saved = editingMeeting;
      if (!saved.id) {
        saved = await createMeeting(editingMeeting);
        setEditingMeeting(saved);
      } else {
        saved = await updateMeeting(saved.id, editingMeeting);
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

  function handleExportPdf() {
    if (!editingMeeting) return;
    generateMeetingMinutesPdf({
      meeting: editingMeeting,
      participants,
      actionItems,
      hospitalName: hospitalName || 'Hospital',
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
      await upsertActionItem({ id, hospital_id: hospitalId!, responsible_name: '', title: '', priority: 'medium', status });
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

  const meetingsWithMinutes = meetings.filter(m => m.generated_minutes_md);

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
                setEditingMeeting(emptyMeeting(hospitalId));
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
              <button className="rm-btn rm-btn-teal" onClick={() => { if (hospitalId) { setEditingMeeting(emptyMeeting(hospitalId)); setParticipants([]); setActionItems([]); setDecisions([]); } setTab('editor'); }}>
                <Plus size={13} />Nova Reunião
              </button>
            </div>

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
                          <button className="rm-btn rm-btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => openEditor(m)}>
                            <Edit3 size={11} />Abrir
                          </button>
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
              <button className="rm-btn rm-btn-teal" onClick={() => { if (hospitalId) { setEditingMeeting(emptyMeeting(hospitalId)); setParticipants([]); setActionItems([]); setDecisions([]); } setTab('editor'); }}>
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

            {/* Dados gerais */}
            <div className="rm-card">
              <div className="rm-section">Dados da Reunião</div>
              <div className="rm-grid3" style={{ gap: 12 }}>
                <div className="rm-field" style={{ gridColumn: 'span 3' }}>
                  <label className="rm-label">Título *</label>
                  <input className="rm-input" value={editingMeeting.title} onChange={e => setMeetingField('title', e.target.value)} placeholder="Ex.: Reunião mensal CCIH — Junho/2026" />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Tema</label>
                  <input className="rm-input" value={editingMeeting.theme || ''} onChange={e => setMeetingField('theme', e.target.value)} placeholder="Assunto principal" />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Comissão / Setor</label>
                  <input className="rm-input" value={editingMeeting.committee || ''} onChange={e => setMeetingField('committee', e.target.value)} placeholder="Ex.: CCIH, Qualidade" />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Caráter</label>
                  <select className="rm-select" value={editingMeeting.meeting_character} onChange={e => setMeetingField('meeting_character', e.target.value)}>
                    <option value="ordinary">Ordinária</option>
                    <option value="extraordinary">Extraordinária</option>
                  </select>
                </div>
                <div className="rm-field">
                  <label className="rm-label">Data</label>
                  <input className="rm-input" type="date" value={editingMeeting.scheduled_date || ''} onChange={e => setMeetingField('scheduled_date', e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Início</label>
                  <input className="rm-input" type="time" value={editingMeeting.start_time || ''} onChange={e => setMeetingField('start_time', e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Término</label>
                  <input className="rm-input" type="time" value={editingMeeting.end_time || ''} onChange={e => setMeetingField('end_time', e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Local</label>
                  <input className="rm-input" value={editingMeeting.location || ''} onChange={e => setMeetingField('location', e.target.value)} placeholder="Sala, endereço ou link" />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Relator da Ata</label>
                  <input className="rm-input" value={editingMeeting.reporter_name || ''} onChange={e => setMeetingField('reporter_name', e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Presidente / Condutor</label>
                  <input className="rm-input" value={editingMeeting.president_name || ''} onChange={e => setMeetingField('president_name', e.target.value)} />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Status</label>
                  <select className="rm-select" value={editingMeeting.status} onChange={e => setMeetingField('status', e.target.value as MeetingStatus)}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Pauta e pendências */}
            <div className="rm-card">
              <div className="rm-section">Pauta e Pendências</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="rm-field">
                  <label className="rm-label">Pauta da Reunião</label>
                  <textarea className="rm-textarea" rows={4} value={editingMeeting.agenda || ''} onChange={e => setMeetingField('agenda', e.target.value)} placeholder="Liste os itens da pauta..." />
                </div>
                <div className="rm-field">
                  <label className="rm-label">Pendências da Reunião Anterior</label>
                  <textarea className="rm-textarea" rows={3} value={editingMeeting.previous_pending_items || ''} onChange={e => setMeetingField('previous_pending_items', e.target.value)} placeholder="Descreva pendências anteriores..." />
                </div>
              </div>
            </div>

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
                  <div className="rm-section" style={{ marginBottom: 0 }}>Ata Gerada pela IA</div>
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

            {/* Plano de ação da reunião */}
            {editingMeeting.id && (
              <div className="rm-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="rm-section" style={{ marginBottom: 0 }}>Plano de Ação desta Reunião</div>
                  <button className="rm-btn rm-btn-outline" onClick={addActionItem}><Plus size={12} />Adicionar Ação</button>
                </div>
                {actionItems.length === 0 ? (
                  <div className="rm-empty" style={{ padding: '16px 0' }}><p>Nenhuma ação cadastrada. Gere a ata com IA ou adicione manualmente.</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {actionItems.map((item, i) => (
                      <div key={i} className="rm-card-sm">
                        <div className="rm-grid3" style={{ gap: 8, marginBottom: 8 }}>
                          <div className="rm-field" style={{ gridColumn: 'span 2' }}>
                            <label className="rm-label">Ação *</label>
                            <input className="rm-input" value={item.title} onChange={e => updateActionItem(i, 'title', e.target.value)} placeholder="O que fazer?" />
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Responsável *</label>
                            <input className="rm-input" value={item.responsible_name} onChange={e => updateActionItem(i, 'responsible_name', e.target.value)} placeholder="Nome" />
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Prazo</label>
                            <input className="rm-input" type="date" value={item.due_date || ''} onChange={e => updateActionItem(i, 'due_date', e.target.value)} />
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Prioridade</label>
                            <select className="rm-select" value={item.priority} onChange={e => updateActionItem(i, 'priority', e.target.value as ActionPriority)}>
                              {Object.entries(ACTION_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div className="rm-field">
                            <label className="rm-label">Status</label>
                            <select className="rm-select" value={item.status} onChange={e => updateActionItem(i, 'status', e.target.value as ActionStatus)}>
                              {Object.entries(ACTION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
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
                {editingMeeting.id && editingMeeting.generated_minutes_md && (
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
                            generateMeetingMinutesPdf({ meeting: m, participants: parts, actionItems: acts, hospitalName: hospitalName || 'Hospital' });
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
