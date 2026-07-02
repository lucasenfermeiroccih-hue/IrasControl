import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import type { Json } from "@/integrations/supabase/types";
import { CHECKLISTS_DATA } from "@/data/scih-checklists";
import { compressImage } from "@/lib/compressImage";

// ─── CSS ────────────────────────────────────────────────────────────────────
const SCIH_CSS = `
.scih-wrap { --bg2:#161b22; --bg3:#1c2128; --bg4:#21262d; --border:#30363d; --text:#e6edf3; --text2:#8b949e; --text3:#6e7681; --teal:#1a9e75; --teal-glow:rgba(26,158,117,.25); --amber:#d4a017; --red:#da3633; --blue:#388bfd; --r:8px; font-family:'Segoe UI',system-ui,sans-serif; background:#0d1117; color:var(--text); min-height:calc(100vh - 60px); }
.scih-wrap *{box-sizing:border-box;margin:0;padding:0;}
.scih-tabs{display:flex;gap:2px;background:var(--bg2);border-bottom:1px solid var(--border);padding:0 20px;overflow-x:auto;scrollbar-width:none;}
.scih-tabs::-webkit-scrollbar{display:none;}
.scih-tab-btn{display:flex;align-items:center;gap:7px;padding:11px 14px;background:none;border:none;border-bottom:2px solid transparent;color:var(--text2);cursor:pointer;font-size:12px;font-weight:500;white-space:nowrap;font-family:inherit;transition:all .15s;}
.scih-tab-btn:hover{color:var(--text);}
.scih-tab-btn.active{color:var(--teal);border-bottom-color:var(--teal);}
.scih-tab-icon{font-size:14px;}
.scih-main{padding:24px;min-width:0;}
.scih-page-title{font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;}
.scih-page-sub{font-size:13px;color:var(--text2);margin-bottom:24px;}
.scih-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:20px;}
.scih-card-sm{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:16px;}
.scih-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.scih-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
.scih-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
.scih-kpi-val{font-size:32px;font-weight:700;color:var(--teal);}
.scih-kpi-lbl{font-size:12px;color:var(--text2);margin-top:4px;}
.scih-section-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border);}
.scih-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;}
.sp-high{background:rgba(26,158,117,.2);color:#1a9e75;}
.sp-mid{background:rgba(212,160,23,.2);color:#d4a017;}
.sp-low{background:rgba(218,54,51,.2);color:#da3633;}
.scih-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--r);border:none;cursor:pointer;font-size:13px;font-weight:500;transition:opacity .15s;}
.scih-btn:hover{opacity:.85;}
.scih-btn-teal{background:var(--teal);color:#fff;}
.scih-btn-outline{background:transparent;border:1px solid var(--border);color:var(--text2);}
.scih-btn-outline:hover{color:var(--text);border-color:var(--text3);}
.scih-btn-red{background:var(--red);color:#fff;}
.scih-btn-amber{background:var(--amber);color:#000;}
.scih-input{background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);color:var(--text);padding:8px 12px;font-size:13px;width:100%;outline:none;}
.scih-input:focus{border-color:var(--teal);}
.scih-select{background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);color:var(--text);padding:8px 12px;font-size:13px;outline:none;}
.scih-select:focus{border-color:var(--teal);}
.scih-label{font-size:12px;color:var(--text2);margin-bottom:4px;display:block;}
.scih-table{width:100%;border-collapse:collapse;font-size:13px;}
.scih-table th{padding:10px 12px;background:var(--bg3);color:var(--text2);font-weight:600;text-align:left;border-bottom:1px solid var(--border);}
.scih-table td{padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text);}
.scih-table tr:hover td{background:var(--bg3);}
.scih-progress-bar{height:6px;border-radius:3px;background:var(--bg4);overflow:hidden;}
.scih-progress-fill{height:100%;border-radius:3px;transition:width .3s;}
.scih-sector-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:16px;cursor:pointer;transition:border-color .15s,transform .1s;}
.scih-sector-card:hover{border-color:var(--teal);transform:translateY(-2px);}
.scih-sector-icon{font-size:28px;margin-bottom:8px;}
.scih-sector-name{font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;}
.scih-tab{padding:8px 16px;border:none;background:none;color:var(--text2);cursor:pointer;font-size:13px;border-bottom:2px solid transparent;transition:color .15s,border-color .15s;}
.scih-tab.active{color:var(--teal);border-bottom-color:var(--teal);}
.scih-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px;}
.scih-kanban-col{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px;min-height:300px;display:flex;flex-direction:column;gap:10px;}
.scih-kanban-col-title{font-size:13px;font-weight:600;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
.scih-kanban-card{background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:12px;}
.scih-swot-quad{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:16px;}
.scih-swot-title{font-size:13px;font-weight:700;margin-bottom:10px;}
.scih-swot-item{font-size:12px;color:var(--text2);padding:6px 8px;border-radius:4px;background:var(--bg3);margin-bottom:6px;}
.scih-risk-cell{width:40px;height:40px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;}
.scih-ck-row{padding:10px 12px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:8px;}
.scih-ck-row:hover{background:var(--bg3);}
.scih-ck-q{font-size:13px;color:var(--text);line-height:1.4;}
.scih-ck-opts{display:flex;gap:8px;flex-wrap:wrap;}
.scih-ck-opt{padding:4px 12px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:12px;cursor:pointer;transition:all .15s;}
.scih-ck-opt:hover{border-color:var(--teal);color:var(--teal);}
.scih-ck-opt.sel-conf{background:rgba(26,158,117,.2);border-color:#1a9e75;color:#1a9e75;}
.scih-ck-opt.sel-parc{background:rgba(56,139,253,.2);border-color:#388bfd;color:#388bfd;}
.scih-ck-opt.sel-nc{background:rgba(218,54,51,.2);border-color:#da3633;color:#da3633;}
.scih-ck-opt.sel-na{background:rgba(139,148,158,.2);border-color:#8b949e;color:#8b949e;}
.scih-ck-obs{background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:12px;width:100%;outline:none;resize:vertical;min-height:40px;}
.scih-ck-obs:focus{border-color:var(--teal);}
.scih-gauge{position:relative;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;}
.scih-flex{display:flex;align-items:center;gap:12px;}
.scih-flex-wrap{display:flex;flex-wrap:wrap;gap:12px;}
.scih-gap{gap:16px;}
.scih-mt{margin-top:16px;}
.scih-mt-sm{margin-top:8px;}
.scih-mb{margin-bottom:16px;}
.scih-row{display:flex;align-items:center;justify-content:space-between;}
.scih-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.scih-boletim-card{background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px;}
.scih-boletim-val{font-size:26px;font-weight:700;}
.scih-crono-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px;display:flex;align-items:center;justify-content:space-between;}
.scih-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:1000;}
.scih-modal{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:24px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;}
.scih-modal-title{font-size:16px;font-weight:700;margin-bottom:16px;color:var(--text);}
.scih-sector-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;}
.scih-wrap table{width:100%;}
@media (max-width: 1024px){
  .scih-main{padding:16px;}
  .scih-grid4{grid-template-columns:repeat(2,1fr);}
  .scih-grid3{grid-template-columns:repeat(2,1fr);}
  .scih-page-title{font-size:19px;}
  .scih-kpi-val{font-size:26px;}
  .scih-tabs{padding:0 12px;}
  .scih-tab-btn{padding:10px 10px;font-size:11.5px;}
}
@media (max-width: 768px){
  .scih-main{padding:12px;}
  .scih-card{padding:14px;}
  .scih-card-sm{padding:12px;}
  .scih-grid2,.scih-grid3,.scih-grid4{grid-template-columns:1fr;gap:12px;}
  .scih-form-grid{grid-template-columns:1fr;}
  .scih-sector-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;}
  .scih-page-title{font-size:17px;}
  .scih-page-sub{font-size:12px;margin-bottom:16px;}
  .scih-kpi-val{font-size:22px;}
  .scih-section-title{font-size:14px;}
  .scih-row{flex-direction:column;align-items:stretch;gap:10px;}
  .scih-flex-wrap{gap:8px;}
  .scih-tabs{padding:0 8px;}
  .scih-tab-btn{padding:9px 8px;font-size:11px;gap:5px;}
  .scih-tab-icon{font-size:13px;}
  .scih-btn{padding:8px 12px;font-size:12px;width:100%;justify-content:center;}
  .scih-flex .scih-btn,.scih-flex-wrap .scih-btn{width:auto;}
  .scih-modal{width:95vw;padding:16px;}
  .scih-table{font-size:12px;display:block;overflow-x:auto;white-space:nowrap;}
  .scih-crono-card{flex-direction:column;align-items:stretch;gap:8px;}
  .scih-kanban-col{min-height:auto;}
  .scih-boletim-val{font-size:22px;}
}
@media (max-width: 480px){
  .scih-main{padding:10px;}
  .scih-sector-grid{grid-template-columns:repeat(2,1fr);}
  .scih-tab-btn span:not(.scih-tab-icon){display:none;}
}
`;

// ─── SECTOR ICON MAP ─────────────────────────────────────────────────────────

const SECTOR_ICONS: Record<string, string> = {
  ambulatorio: "🩺", banco_sangue: "🩸", cc: "✂️", cme: "♻️",
  enfermaria: "🛏️", enfermaria_cirurgica: "🔪", sala_verde: "🟢",
  laboratorio: "🔬", ps: "🚨", nutricao: "🥗",
  diagnostico: "📡", uti: "💗", cti_2: "💗", cti_3: "💗", upo: "🏥",
  higiene: "✨", roupas: "👕",
  residuos: "🗑️", scih: "🦠", nsp: "🛡️", equipamentos: "🔧",
  incendio: "🔥", ped_int: "👶", ped_em: "🏃", uti_neo: "🍼",
  banco_leite: "🥛", farmacia_hospitalar: "💊", aloj_conjunto: "👨‍👩‍👧",
  "necrotério": "🏢", pre_parto: "💞", lactario: "🍶",
  almoxarifado_anvisa: "📦", manutencao_anvisa: "🔨",
  neonatologia_bercario: "🐣", centro_obstetrico: "💝",
  maternidade_visa: "🏥",
};

const SWOT_DATA: Record<string, { f: string[]; o: string[]; w: string[]; a: string[] }> = {
  scih: {
    f: ["Equipe especializada com experiência em acreditação ONA","Protocolos IRAS atualizados conforme ANVISA e OMS","Vigilância ativa com busca ativa de infecções implantada","Plano anual de controle de infecção formalizado"],
    o: ["Processo de acreditação ONA em andamento","Novas tecnologias de desinfecção de alto nível","Ampliação do programa de antibioticoterapia orientada"],
    w: ["Infraestrutura de CME abaixo do padrão recomendado","Taxa de HM inferior à meta em setores críticos","Sistema de notificação ainda parcialmente manual"],
    a: ["Resistência bacteriana crescente (KPC, MRSA, CRE)","Rotatividade elevada de profissionais contratados","Restrição orçamentária para EPI e insumos"],
  },
  uti: {
    f: ["Bundles de CVC e IOT implantados","Equipe treinada em manejo de paciente crítico","Monitoramento de IRAS com indicadores específicos"],
    o: ["Implantação de checklist eletrônico de dispositivos","Capacitação em prevenção de PAVM"],
    w: ["Taxa de HM abaixo da meta nas auditorias","Superlotação frequente compromete precauções"],
    a: ["Colonização por GMR importados de outras UTIs","Pressão por leitos compromete limpeza terminal"],
  },
};

// ─── INTERFACES ─────────────────────────────────────────────────────────────

interface CkState { v: "" | "conf" | "parc" | "nc" | "na"; obs: string; }
interface AuditRecord { id?: string; setorKey: string; setorNome: string; pct: number; ncCount: number; data: string; tipo: string; auditor: string; respSetor: string; total: number; relatorioIA?: string; aiGerado?: boolean; photoUrls?: string[]; photoCaptions?: string[]; }
interface NC { id?: string; setorKey: string; setor: string; pergunta: string; obs: string; sev: "Crítica" | "Maior" | "Menor"; status: string; data: string; historico?: {status:string;obs:string;data:string}[]; }
interface Plan5W2H { id?: string; what: string; why: string; where: string; when: string; who: string; how: string; howmuch: string; status: string; auditId?: string; fonte?: "ia" | "manual"; }
interface KanbanCard { id?: string; title: string; setor: string; prio: string; prazo: string; col: string; auditId?: string; fonte?: "ia" | "manual"; }
interface RiskItem { id?: string; desc: string; prob: number; imp: number; setor: string; plano: string; auditId?: string; fonte?: "ia" | "manual"; }
interface CronoItem { id?: string; setor: string; data: string; tipo: string; resp: string; realizado: boolean; }
interface IrasRecord { id?: string; tipo: string; setor: string; casos: number; denom: number; mes: string; obs: string; }
interface AppData {
  historico: AuditRecord[];
  ncs: NC[];
  planos: Plan5W2H[];
  kanban: KanbanCard[];
  riscos: RiskItem[];
  cronograma: CronoItem[];
  iras: IrasRecord[];
}

const EMPTY_DATA: AppData = { historico: [], ncs: [], planos: [], kanban: [], riscos: [], cronograma: [], iras: [] };

// ─── HELPERS ────────────────────────────────────────────────────────────────

function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function todayISO(): string {
  return new Date().toISOString().slice(0,10);
}
function barColor(p: number): string {
  return p >= 70 ? "#1a9e75" : p >= 50 ? "#d4a017" : "#da3633";
}
function confClass(p: number): string {
  return p >= 70 ? "sp-high" : p >= 50 ? "sp-mid" : "sp-low";
}
function inferSeverity(q: string): "Crítica" | "Maior" | "Menor" {
  const l = q.toLowerCase();
  if (/higieniz|esteriliz|precaução|precaucao|epi|equipamento de proteção|invasiv/.test(l)) return "Crítica";
  if (/limpeza|resíduo|residuo|equipamento|registro/.test(l)) return "Maior";
  return "Menor";
}
function uid(): string {
  return Math.random().toString(36).slice(2,10);
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

type Page = "dashboard"|"setores"|"checklist"|"auditorias"|"cronograma"|"plano"|"kanban"|"swot"|"risco"|"relatorio"|"boletim";

const NAV: { key: Page; label: string; icon: string }[] = [
  { key:"dashboard",  label:"Dashboard",        icon:"📊" },
  { key:"setores",    label:"Setores",           icon:"🏥" },
  { key:"checklist",  label:"Auditoria",         icon:"✅" },
  { key:"auditorias", label:"NCs & Histórico",   icon:"📋" },
  { key:"cronograma", label:"Cronograma",        icon:"📅" },
  { key:"plano",      label:"Plano 5W2H",        icon:"📝" },
  { key:"kanban",     label:"Kanban",            icon:"🗂️" },
  { key:"swot",       label:"SWOT",              icon:"🔄" },
  { key:"risco",      label:"Matriz de Risco",   icon:"⚠️" },
  { key:"relatorio",  label:"Relatório",         icon:"📈" },
  { key:"boletim",    label:"Boletim IRAS",      icon:"🦠" },
];

export default function SCIHAuditModule() {
  const { hospitalId } = useHospitalContext();

  // ── persistence ──
  const [appData, setAppDataRaw] = useState<AppData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    supabase
      .from("scih_module_data" as never)
      .select("data")
      .eq("hospital_id", hospitalId)
      .single()
      .then(({ data: row }: { data: { data: Json } | null }) => {
        if (row?.data) setAppDataRaw(row.data as unknown as AppData);
        setLoaded(true);
      });
  }, [hospitalId]);


  const saveData = useCallback(async (newData: AppData) => {
    if (!hospitalId) return;
    await supabase
      .from("scih_module_data" as never)
      .upsert(
        { hospital_id: hospitalId, data: newData as unknown as Json, updated_at: new Date().toISOString() } as never,
        { onConflict: "hospital_id" }
      );
  }, [hospitalId]);

  const setAppData = useCallback((updater: AppData | ((prev: AppData) => AppData)) => {
    setAppDataRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveData(next);
      return next;
    });
  }, [saveData]);

  // ── navigation ──
  const [activePage, setActivePage] = useState<Page>("dashboard");

  // ── AI state ──
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlanModal, setAiPlanModal] = useState<{ auditId: string; relatorio: string } | null>(null);

  // ── checklist state ──
  const [ckSetor, setCkSetor] = useState<string>("scih");
  const [ckStates, setCkStates] = useState<Record<string,CkState>>({});
  const [ckAuditor, setCkAuditor] = useState("");
  const [ckResp, setCkResp] = useState("");
  const [ckTipo, setCkTipo] = useState("Programada");
  const [ckPhotos, setCkPhotos] = useState<{ file: File; caption: string }[]>([]);
  const [ckPhotosProcessing, setCkPhotosProcessing] = useState(false);
  const [ckPhotosUploading, setCkPhotosUploading] = useState(false);
  const ckCameraRef = useRef<HTMLInputElement>(null);
  const ckGalleryRef = useRef<HTMLInputElement>(null);

  // ── audit tabs ──
  const [auditTab, setAuditTab] = useState<"ncs"|"historico">("ncs");
  const [ncFilter, setNcFilter] = useState("");

  // ── modal state ──
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState<Plan5W2H>({ what:"",why:"",where:"",when:"",who:"",how:"",howmuch:"",status:"Aberto" });

  const [showKanbanModal, setShowKanbanModal] = useState(false);
  const [kanbanForm, setKanbanForm] = useState<KanbanCard>({ title:"",setor:"",prio:"Média",prazo:"",col:"todo" });

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskForm, setRiskForm] = useState<RiskItem>({ desc:"",prob:1,imp:1,setor:"",plano:"" });

  const [showCronoModal, setShowCronoModal] = useState(false);
  const [cronoForm, setCronoForm] = useState<CronoItem>({ setor:"",data:todayISO(),tipo:"Programada",resp:"",realizado:false });

  const [showIrasModal, setShowIrasModal] = useState(false);
  const [irasForm, setIrasForm] = useState<IrasRecord>({ tipo:"IPCS",setor:"",casos:0,denom:1,mes:todayISO().slice(0,7),obs:"" });

  const [swotSetor, setSwotSetor] = useState("scih");

  // ── email / pdf / crud state ──
  const [postAuditRecord, setPostAuditRecord] = useState<AuditRecord | null>(null);
  const [viewAuditRecord, setViewAuditRecord] = useState<AuditRecord | null>(null);
  const [viewAuditPhotoUrls, setViewAuditPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!viewAuditRecord?.photoUrls?.length) { setViewAuditPhotoUrls([]); return; }
    Promise.all(
      viewAuditRecord.photoUrls.map(path =>
        supabase.storage.from("audit-photos").createSignedUrl(path, 300).then(r => r.data?.signedUrl || "")
      )
    ).then(urls => setViewAuditPhotoUrls(urls.filter(Boolean)));
  }, [viewAuditRecord]);
  const [deleteAuditId, setDeleteAuditId] = useState<string | null>(null);
  const [pdfExportingId, setPdfExportingId] = useState<string | null>(null);
  const [selectedHistIds, setSelectedHistIds] = useState<Set<string>>(new Set());
  const [scihBulkEmailOpen, setScihBulkEmailOpen] = useState(false);
  const [scihBulkProgress, setScihBulkProgress] = useState("");
  const [editAuditRecord, setEditAuditRecord] = useState<AuditRecord | null>(null);
  const [editAuditForm, setEditAuditForm] = useState<{ auditor: string; respSetor: string; tipo: string }>({ auditor: "", respSetor: "", tipo: "" });
  const [scihEmailRecord, setScihEmailRecord] = useState<AuditRecord | null>(null);
  const [scihEmailTo, setScihEmailTo] = useState("");
  const [scihEmailCc, setScihEmailCc] = useState("");
  const [scihEmailName, setScihEmailName] = useState("");
  const [scihEmailSending, setScihEmailSending] = useState(false);

  // ─── COMPUTED ─────────────────────────────────────────────────────────────

  function computeChecklist() {
    const setor = CHECKLISTS_DATA[ckSetor];
    if (!setor) return { total: 0, conf: 0, nc: 0, pct: 0 };
    let total = 0, conf = 0, nc = 0;
    setor.grupos.forEach(g => g.itens.forEach((_item, i) => {
      const key = `${ckSetor}-${g.grupo}-${i}`;
      const st = ckStates[key];
      if (!st || st.v === "") return;
      if (st.v === "na") return;
      total++;
      if (st.v === "conf") conf++;
      if (st.v === "nc" || st.v === "parc") nc++;
    }));
    return { total, conf, nc, pct: total > 0 ? Math.round((conf / total) * 100) : 0 };
  }

  function sectorStats(): Record<string, { pct: number; ncCount: number }> {
    const result: Record<string, { pct: number; ncCount: number }> = {};
    // Use last audit record per sector from historico
    const bySetor: Record<string, AuditRecord> = {};
    appData.historico.forEach(h => { bySetor[h.setorKey] = h; });
    Object.keys(CHECKLISTS_DATA).forEach(k => {
      if (bySetor[k]) {
        result[k] = { pct: bySetor[k].pct, ncCount: bySetor[k].ncCount };
      } else {
        result[k] = { pct: 0, ncCount: 0 };
      }
    });
    return result;
  }

  const stats = sectorStats();
  const allPcts = Object.values(stats).map(s => s.pct).filter(p => p > 0);
  const avgConf = allPcts.length ? Math.round(allPcts.reduce((a,b)=>a+b,0)/allPcts.length) : 0;
  const criticalNCs = appData.ncs.filter(n => n.sev === "Crítica" && n.status !== "Encerrado");

  // ─── AI GENERATION ────────────────────────────────────────────────────────

  function generateFallback(auditId: string, ncs: NC[], setorNome: string, pct: number): {
    planos: Plan5W2H[]; kanban: KanbanCard[]; riscos: RiskItem[]; relatorio: string;
  } {
    const prazoBase = new Date(); prazoBase.setDate(prazoBase.getDate() + 30);
    const prazoISO = prazoBase.toISOString().slice(0, 10);

    const criticas = ncs.filter(n => n.sev === "Crítica");
    const maiores = ncs.filter(n => n.sev === "Maior");

    const planos: Plan5W2H[] = ncs.filter(n => n.sev !== "Menor").slice(0, 5).map(nc => ({
      id: uid(), auditId, fonte: "ia" as const,
      what: `Correção: ${nc.pergunta.slice(0, 60)}`,
      why: `NC ${nc.sev} identificada na auditoria de ${setorNome}. ${nc.obs || "Conformidade abaixo do esperado."}`,
      where: setorNome,
      when: prazoISO,
      who: "Responsável do Setor",
      how: nc.sev === "Crítica"
        ? "Ação imediata: treinamento, adequação de processo e supervisão diária."
        : "Implementar procedimento padrão e monitorar conformidade semanal.",
      howmuch: nc.sev === "Crítica" ? "Prioritário — sem limite de custo" : "Baixo custo operacional",
      status: "Aberto",
    }));

    const kanban: KanbanCard[] = ncs.slice(0, 8).map(nc => ({
      id: uid(), auditId, fonte: "ia" as const,
      title: nc.pergunta.slice(0, 60),
      setor: setorNome,
      prio: nc.sev === "Crítica" ? "Alta" : nc.sev === "Maior" ? "Média" : "Baixa",
      prazo: prazoISO,
      col: "todo",
    }));

    const riscos: RiskItem[] = ncs.filter(n => n.sev !== "Menor").slice(0, 4).map(nc => ({
      id: uid(), auditId, fonte: "ia" as const,
      desc: nc.pergunta.slice(0, 80),
      prob: nc.sev === "Crítica" ? 4 : 3,
      imp: nc.sev === "Crítica" ? 5 : 3,
      setor: setorNome,
      plano: `Plano de ação imediato para ${nc.sev === "Crítica" ? "risco crítico" : "risco moderado"}`,
    }));

    const relatorio = `RELATÓRIO DE AUDITORIA — ${setorNome.toUpperCase()}
Data: ${today()} | Conformidade: ${pct}% | NCs: ${ncs.length}

RESUMO EXECUTIVO
A auditoria do setor ${setorNome} identificou conformidade de ${pct}%, com ${ncs.length} não conformidades, sendo ${criticas.length} crítica(s) e ${maiores.length} maior(es).

${pct < 50 ? "⚠️ RESULTADO CRÍTICO: O setor requer intervenção imediata e plano de ação urgente." : pct < 70 ? "⚠️ RESULTADO ABAIXO DA META: Ações corretivas necessárias em prazo máximo de 30 dias." : "✅ RESULTADO ADEQUADO: Manter monitoramento e implementar melhorias contínuas."}

NÃO CONFORMIDADES CRÍTICAS (${criticas.length}):
${criticas.map((nc, i) => `${i + 1}. ${nc.pergunta}\n   Obs: ${nc.obs || "Sem observação"}`).join("\n") || "Nenhuma."}

NÃO CONFORMIDADES MAIORES (${maiores.length}):
${maiores.map((nc, i) => `${i + 1}. ${nc.pergunta}`).join("\n") || "Nenhuma."}

PLANO DE AÇÃO GERADO: ${planos.length} plano(s) 5W2H | ${kanban.length} card(s) Kanban | ${riscos.length} risco(s) na matriz

RECOMENDAÇÕES
1. Priorizar resolução das NCs críticas em até 72 horas.
2. Agendar re-auditoria em 30 dias para verificação das ações.
3. Treinar equipe nos pontos de maior não conformidade.
4. Monitorar indicadores semanalmente até próxima auditoria.`;

    return { planos, kanban, riscos, relatorio };
  }

  async function generateAuditPlanWithAI(
    auditId: string, ncs: NC[], setorNome: string, pct: number, tipo: string, auditor: string
  ) {
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("não autenticado");

      const prazoBase = new Date(); prazoBase.setDate(prazoBase.getDate() + 30);
      const prazoISO = prazoBase.toISOString().slice(0, 10);

      const prompt = `Você é especialista em CCIH. Analise esta auditoria e gere um JSON VÁLIDO (sem markdown, sem texto extra):

SETOR: ${setorNome}
CONFORMIDADE: ${pct}%
TIPO: ${tipo}
AUDITOR: ${auditor || "—"}
DATA: ${today()}
NÃO CONFORMIDADES (${ncs.length}):
${ncs.map((nc, i) => `${i + 1}. [${nc.sev}] ${nc.pergunta}${nc.obs ? " | Obs: " + nc.obs : ""}`).join("\n")}

Gere o JSON no seguinte formato exato:
{"planos":[{"what":"","why":"","where":"${setorNome}","when":"${prazoISO}","who":"","how":"","howmuch":"","status":"Aberto"}],"kanban":[{"title":"","setor":"${setorNome}","prio":"Alta","prazo":"${prazoISO}","col":"todo"}],"riscos":[{"desc":"","prob":3,"imp":3,"setor":"${setorNome}","plano":""}],"relatorio":""}

Regras:
- Máximo 5 planos 5W2H (para NCs críticas/maiores)
- Máximo 8 cards Kanban (um por NC)
- Máximo 4 riscos (NCs críticas/maiores)
- relatorio: resumo executivo de 3-5 parágrafos em português
- prio: "Alta", "Média" ou "Baixa"
- prob e imp: de 1 a 5`;

      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: { agent_id: "scih-audit-planner", input: prompt },
      });

      if (error || !data?.output) throw new Error("sem resposta da IA");

      const raw = (data.output as string).replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);

      const planos: Plan5W2H[] = (parsed.planos || []).map((p: Plan5W2H) => ({ ...p, id: uid(), auditId, fonte: "ia" as const }));
      const kanban: KanbanCard[] = (parsed.kanban || []).map((c: KanbanCard) => ({ ...c, id: uid(), auditId, fonte: "ia" as const }));
      const riscos: RiskItem[] = (parsed.riscos || []).map((r: RiskItem) => ({ ...r, id: uid(), auditId, fonte: "ia" as const }));
      const relatorio: string = parsed.relatorio || "";

      setAppData(prev => ({
        ...prev,
        planos: [...planos, ...prev.planos],
        kanban: [...kanban, ...prev.kanban],
        riscos: [...riscos, ...prev.riscos],
        historico: prev.historico.map(h => h.id === auditId ? { ...h, relatorioIA: relatorio, aiGerado: true } : h),
      }));
      setAiPlanModal({ auditId, relatorio });
    } catch {
      const fb = generateFallback(auditId, ncs, setorNome, pct);
      setAppData(prev => ({
        ...prev,
        planos: [...fb.planos, ...prev.planos],
        kanban: [...fb.kanban, ...prev.kanban],
        riscos: [...fb.riscos, ...prev.riscos],
        historico: prev.historico.map(h => h.id === auditId ? { ...h, relatorioIA: fb.relatorio, aiGerado: true } : h),
      }));
      setAiPlanModal({ auditId, relatorio: fb.relatorio });
    } finally {
      setAiLoading(false);
    }
  }

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  async function addCkPhotos(files: File[]) {
    const images = files.filter(f => f.type.startsWith("image/"));
    const slots = 10 - ckPhotos.length;
    const toAdd = images.slice(0, Math.max(0, slots));
    if (!toAdd.length) return;
    setCkPhotosProcessing(true);
    try {
      const compressed = await Promise.all(toAdd.map(f => compressImage(f)));
      setCkPhotos(prev => [...prev, ...compressed.map(file => ({ file, caption: "" }))].slice(0, 10));
    } finally {
      setCkPhotosProcessing(false);
    }
  }
  function removeCkPhoto(i: number) { setCkPhotos(prev => prev.filter((_, idx) => idx !== i)); }
  function setCkPhotoCaption(i: number, caption: string) {
    setCkPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, caption } : p));
  }

  async function finalizeAudit() {
    const { total, conf, nc, pct } = computeChecklist();
    if (total === 0) { alert("Responda ao menos um item antes de finalizar."); return; }
    const setor = CHECKLISTS_DATA[ckSetor];
    const auditId = uid();

    // Upload photos
    const photoUrls: string[] = [];
    const photoCaptions: string[] = [];
    if (ckPhotos.length > 0 && hospitalId) {
      setCkPhotosUploading(true);
      for (const photo of ckPhotos) {
        const safeName = photo.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${hospitalId}/${auditId}/${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from("audit-photos").upload(path, photo.file, { contentType: photo.file.type, upsert: false });
        if (!error) { photoUrls.push(path); photoCaptions.push(photo.caption); }
      }
      setCkPhotosUploading(false);
    }

    const record: AuditRecord = {
      id: auditId, setorKey: ckSetor, setorNome: setor.nome, pct, ncCount: nc,
      data: today(), tipo: ckTipo, auditor: ckAuditor || "—", respSetor: ckResp || "—", total: conf,
      photoUrls, photoCaptions,
    };
    // collect NCs
    const newNCs: NC[] = [];
    setor.grupos.forEach(g => g.itens.forEach((item, i) => {
      const key = `${ckSetor}-${g.grupo}-${i}`;
      const st = ckStates[key];
      if (st && (st.v === "nc" || st.v === "parc")) {
        newNCs.push({
          id: uid(), setorKey: ckSetor, setor: setor.nome, pergunta: item,
          obs: st.obs, sev: inferSeverity(item), status: "Aberto", data: today(), historico: [],
        });
      }
    }));
    setAppData(prev => ({
      ...prev,
      historico: [record, ...prev.historico],
      ncs: [...newNCs, ...prev.ncs],
    }));
    setCkStates({});
    setCkPhotos([]);
    setActivePage("auditorias");
    setPostAuditRecord(record);
    // Gerar plano IA automaticamente
    generateAuditPlanWithAI(record.id!, newNCs, setor.nome, pct, ckTipo, ckAuditor);
  }

  function setCkValue(key: string, v: CkState["v"]) {
    setCkStates(prev => ({ ...prev, [key]: { v, obs: prev[key]?.obs || "" } }));
  }
  function setCkObs(key: string, obs: string) {
    setCkStates(prev => ({ ...prev, [key]: { v: prev[key]?.v || "", obs } }));
  }

  function addPlan() {
    const p: Plan5W2H = { ...planForm, id: uid() };
    setAppData(prev => ({ ...prev, planos: [p, ...prev.planos] }));
    setShowPlanModal(false);
    setPlanForm({ what:"",why:"",where:"",when:"",who:"",how:"",howmuch:"",status:"Aberto" });
  }
  function addKanban() {
    const c: KanbanCard = { ...kanbanForm, id: uid() };
    setAppData(prev => ({ ...prev, kanban: [c, ...prev.kanban] }));
    setShowKanbanModal(false);
    setKanbanForm({ title:"",setor:"",prio:"Média",prazo:"",col:"todo" });
  }
  function moveKanban(id: string, col: string) {
    setAppData(prev => ({ ...prev, kanban: prev.kanban.map(c => c.id === id ? { ...c, col } : c) }));
  }
  function addRisk() {
    const r: RiskItem = { ...riskForm, id: uid() };
    setAppData(prev => ({ ...prev, riscos: [r, ...prev.riscos] }));
    setShowRiskModal(false);
    setRiskForm({ desc:"",prob:1,imp:1,setor:"",plano:"" });
  }
  function addCrono() {
    const c: CronoItem = { ...cronoForm, id: uid() };
    setAppData(prev => ({ ...prev, cronograma: [c, ...prev.cronograma] }));
    setShowCronoModal(false);
    setCronoForm({ setor:"",data:todayISO(),tipo:"Programada",resp:"",realizado:false });
  }
  function toggleCrono(id: string) {
    setAppData(prev => ({ ...prev, cronograma: prev.cronograma.map(c => c.id === id ? { ...c, realizado: !c.realizado } : c) }));
  }
  function addIras() {
    const r: IrasRecord = { ...irasForm, id: uid() };
    setAppData(prev => ({ ...prev, iras: [r, ...prev.iras] }));
    setShowIrasModal(false);
    setIrasForm({ tipo:"IPCS",setor:"",casos:0,denom:1,mes:todayISO().slice(0,7),obs:"" });
  }
  function closeNc(id: string) {
    setAppData(prev => ({ ...prev, ncs: prev.ncs.map(n => n.id === id ? { ...n, status: "Encerrado" } : n) }));
  }

  async function fetchLogosForPdf(): Promise<{ hospitalLogo: { dataUrl: string; w: number; h: number } | null; scihLogos: Array<{ dataUrl: string; w: number; h: number }> }> {
    if (!hospitalId) return { hospitalLogo: null, scihLogos: [] };
    try {
      const { data: logos } = await supabase.from("hospital_logos" as never).select("logo_type, storage_path, display_order").eq("hospital_id", hospitalId).order("display_order");
      if (!(logos as any[])?.length) return { hospitalLogo: null, scihLogos: [] };
      const getUrl = (path: string) => supabase.storage.from("hospital-logos").getPublicUrl(path).data.publicUrl;
      const loadLogo = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          const dataUrl: string = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result as string); fr.onerror = reject; fr.readAsDataURL(blob); });
          const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => { const img = new Image(); img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = reject; img.src = dataUrl; });
          return { dataUrl, w: dims.w, h: dims.h };
        } catch { return null; }
      };
      const ls = logos as any[];
      const hospitalRec = ls.find(l => l.logo_type === "hospital");
      const scihRecs = ls.filter(l => l.logo_type === "scih");
      const [hospitalLogo, ...scihResults] = await Promise.all([
        hospitalRec ? loadLogo(getUrl(hospitalRec.storage_path)) : Promise.resolve(null),
        ...scihRecs.map((r: any) => loadLogo(getUrl(r.storage_path))),
      ]);
      return { hospitalLogo, scihLogos: (scihResults as any[]).filter((l): l is { dataUrl: string; w: number; h: number } => l !== null) };
    } catch { return { hospitalLogo: null, scihLogos: [] }; }
  }

  async function exportAuditPdf(record: AuditRecord) {
    setPdfExportingId(record.id!);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { hospitalLogo, scihLogos } = await fetchLogosForPdf();
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const MG = 14;

      // Header bar
      doc.setFillColor(15, 76, 117);
      doc.rect(0, 0, PW, 42, "F");
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, PW, 2.5, "F");
      doc.rect(0, 42, PW, 2.5, "F");

      // Logos
      let logoX = MG;
      if (hospitalLogo) {
        const lh = 14, lw = (hospitalLogo.w / hospitalLogo.h) * lh;
        doc.addImage(hospitalLogo.dataUrl, "PNG", logoX, 7, lw, lh);
        logoX += lw + 6;
      }
      scihLogos.slice(0, 2).forEach(logo => {
        const lh = 14, lw = (logo.w / logo.h) * lh;
        doc.addImage(logo.dataUrl, "PNG", logoX, 7, lw, lh);
        logoX += lw + 4;
      });

      // Title
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
      doc.text("Relatório de Auditoria SCIH/CCIH", PW - MG, 14, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(160, 205, 235);
      doc.text(`${record.setorNome} · ${record.data}`, PW - MG, 21, { align: "right" });
      doc.text(`Auditoria ${record.tipo}`, PW - MG, 28, { align: "right" });

      let y = 54;
      const pct = record.pct;
      const col: [number,number,number] = pct >= 70 ? [26,158,117] : pct >= 50 ? [212,160,23] : [218,54,51];
      doc.setFillColor(245,245,245); doc.rect(MG, y, PW - MG * 2, 26, "F");
      doc.setFillColor(...col); doc.rect(MG, y, 3, 26, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(...col);
      doc.text(`${pct}%`, MG + 10, y + 17);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(100,100,100);
      doc.text("Conformidade", MG + 10, y + 23);
      doc.setFontSize(10); doc.setTextColor(50,50,50);
      doc.text(`Auditor: ${record.auditor}`, MG + 50, y + 10);
      doc.text(`Resp. Setor: ${record.respSetor}`, MG + 50, y + 17);
      doc.text(`Tipo: ${record.tipo}   NCs: ${record.ncCount}`, MG + 50, y + 23);
      y += 34;

      // NCs
      const ncsAudit = appData.ncs.filter(n => n.data === record.data && n.setor === record.setorNome);
      if (ncsAudit.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15,76,117);
        doc.text("Não Conformidades", MG, y);
        doc.setDrawColor(15,76,117); doc.setLineWidth(0.4); doc.line(MG, y+2, PW-MG, y+2);
        y += 8;
        ncsAudit.forEach((nc, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFillColor(i%2===0?250:244, i%2===0?250:244, i%2===0?250:244);
          doc.rect(MG, y-4, PW-MG*2, 8, "F");
          const sevCol: [number,number,number] = nc.sev === "Crítica" ? [218,54,51] : nc.sev === "Alta" ? [212,160,23] : [26,158,117];
          doc.setFillColor(...sevCol); doc.rect(MG, y-4, 3, 8, "F");
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(40,40,40);
          const perg = nc.pergunta.length > 72 ? nc.pergunta.slice(0, 72) + "…" : nc.pergunta;
          doc.text(`${i+1}. ${perg}`, MG+5, y);
          doc.setTextColor(...sevCol);
          doc.text(nc.sev, PW-MG, y, { align:"right" });
          y += 9;
        });
      }

      // Relatorio IA
      if (record.relatorioIA) {
        if (y > 240) { doc.addPage(); y = 20; }
        y += 4;
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15,76,117);
        doc.text("Análise & Plano de Ação (IA)", MG, y);
        doc.setDrawColor(15,76,117); doc.setLineWidth(0.4); doc.line(MG, y+2, PW-MG, y+2);
        y += 8;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(50,50,50);
        const lines = doc.splitTextToSize(record.relatorioIA, PW - MG * 2);
        lines.forEach((line: string) => {
          if (y > 278) { doc.addPage(); y = 20; }
          doc.text(line, MG, y); y += 5;
        });
      }

      // Footer
      doc.setFillColor(245,245,245); doc.rect(0, PH-8, PW, 8, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(130,130,130);
      doc.text("IRAS Control · SCIH/CCIH · " + new Date().toLocaleString("pt-BR"), MG, PH-2);

      doc.save(`auditoria-scih-${record.setorKey}-${record.data}.pdf`);
    } finally {
      setPdfExportingId(null);
    }
  }

  function openEmailDialog(record: AuditRecord) {
    setScihEmailTo(""); setScihEmailCc(""); setScihEmailName("");
    setScihEmailRecord(record);
  }

  async function handleSendAuditEmail() {
    if (!scihEmailRecord) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = scihEmailTo.trim();
    if (!emailRegex.test(email)) { alert("Informe um e-mail válido."); return; }
    const ccEmails = scihEmailCc.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    setScihEmailSending(true);
    try {
      const ncsAudit = appData.ncs.filter(n => n.data === scihEmailRecord.data && n.setor === scihEmailRecord.setorNome);
      const { error } = await supabase.functions.invoke("send-audit-email", {
        body: {
          to: email, cc: ccEmails, managerName: scihEmailName.trim(),
          audit: {
            typeLabel: "SCIH/CCIH — " + scihEmailRecord.setorNome,
            date: scihEmailRecord.data,
            sector: scihEmailRecord.setorNome,
            complianceRate: scihEmailRecord.pct,
            compliantItems: scihEmailRecord.total,
            totalItems: scihEmailRecord.total + scihEmailRecord.ncCount,
            observations: scihEmailRecord.relatorioIA || "",
            items: ncsAudit.map(nc => ({ question: nc.pergunta, status: "non_compliant", observation: nc.obs || "" })),
          },
          photoPaths: scihEmailRecord.photoUrls || [], photoCaptions: scihEmailRecord.photoCaptions || [],
        },
      });
      if (error) throw error;
      alert(`Auditoria enviada para ${email}.`);
      setScihEmailRecord(null);
    } catch (e: any) {
      alert("Erro ao enviar: " + (e?.message || "erro desconhecido"));
    } finally {
      setScihEmailSending(false);
    }
  }

  function toggleHistSelect(id: string) {
    setSelectedHistIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleHistSelectAll() {
    if (selectedHistIds.size === appData.historico.length) setSelectedHistIds(new Set());
    else setSelectedHistIds(new Set(appData.historico.map(h => h.id!)));
  }
  async function handleBulkSendScihEmail() {
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const to = scihEmailTo.trim();
    if (!emailRx.test(to)) { alert("Informe um e-mail válido."); return; }
    const cc = scihEmailCc.split(/[,;\s]+/).map((s: string) => s.trim()).filter(Boolean);
    if (cc.some((e: string) => !emailRx.test(e))) { alert("E-mail de cópia inválido."); return; }
    const selected = appData.historico.filter(h => selectedHistIds.has(h.id!));
    setScihEmailSending(true);
    let ok = 0;
    for (let i = 0; i < selected.length; i++) {
      const h = selected[i];
      setScihBulkProgress(`Enviando ${i + 1} de ${selected.length}…`);
      const ncsAudit = appData.ncs.filter(n => n.data === h.data && n.setor === h.setorNome);
      const parts = h.data.split("/");
      const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : h.data;
      try {
        const { error } = await supabase.functions.invoke("send-audit-email", {
          body: {
            to, cc, managerName: scihEmailName.trim(),
            audit: {
              typeLabel: "SCIH/CCIH — " + h.setorNome,
              date: isoDate, sector: h.setorNome,
              complianceRate: h.pct, compliantItems: h.total,
              totalItems: h.total + h.ncCount,
              observations: h.relatorioIA || "",
              items: ncsAudit.map(nc => ({ question: nc.pergunta, status: "non_compliant", observation: nc.obs || "" })),
            },
            photoPaths: h.photoUrls || [], photoCaptions: h.photoCaptions || [],
          },
        });
        if (!error) ok++;
      } catch {}
    }
    setScihEmailSending(false);
    setScihBulkProgress("");
    setScihBulkEmailOpen(false);
    setSelectedHistIds(new Set());
    alert(`${ok} de ${selected.length} auditoria(s) enviada(s) com sucesso!`);
  }

  function handleDeleteAudit(id: string) {
    setAppData(prev => ({ ...prev, historico: prev.historico.filter(h => h.id !== id) }));
    setDeleteAuditId(null);
  }

  function openEditAudit(record: AuditRecord) {
    setEditAuditForm({ auditor: record.auditor, respSetor: record.respSetor, tipo: record.tipo });
    setEditAuditRecord(record);
  }

  function saveEditAudit() {
    if (!editAuditRecord) return;
    setAppData(prev => ({
      ...prev,
      historico: prev.historico.map(h => h.id === editAuditRecord.id ? { ...h, ...editAuditForm } : h),
    }));
    setEditAuditRecord(null);
  }

  // ─── RENDER PAGES ─────────────────────────────────────────────────────────

  function renderDashboard() {
    const openNCs = appData.ncs.filter(n => n.status !== "Encerrado").length;
    const critCount = criticalNCs.length;
    const audited = Object.values(stats).filter(s => s.pct > 0).length;

    return (
      <div>
        <div className="scih-page-title">Dashboard SCIH/CCIH</div>
        <div className="scih-page-sub">Visão geral do programa de controle de infecção hospitalar</div>

        <div className="scih-grid4 scih-mb">
          {[
            { label:"Conformidade Média", val:`${avgConf}%`, color: barColor(avgConf) },
            { label:"Setores Auditados", val:`${audited}`, color:"#388bfd" },
            { label:"NCs Abertas", val:`${openNCs}`, color:"#d4a017" },
            { label:"NCs Críticas", val:`${critCount}`, color:"#da3633" },
          ].map(k => (
            <div key={k.label} className="scih-card">
              <div className="scih-kpi-val" style={{ color: k.color }}>{k.val}</div>
              <div className="scih-kpi-lbl">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="scih-grid2">
          <div className="scih-card">
            <div className="scih-section-title">Conformidade por Setor</div>
            {Object.entries(CHECKLISTS_DATA).slice(0,10).map(([k,v]) => {
              const pct = stats[k]?.pct ?? 0;
              return (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div className="scih-row" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color:"var(--text2)" }}>{SECTOR_ICONS[k] ?? '🏥'} {v.nome}</span>
                    <span style={{ fontSize: 12, color: barColor(pct), fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div className="scih-progress-bar">
                    <div className="scih-progress-fill" style={{ width:`${pct}%`, background: barColor(pct) }}/>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="scih-card">
            <div className="scih-section-title">NCs Críticas Abertas</div>
            {criticalNCs.length === 0 && <p style={{ color:"var(--text2)", fontSize:13 }}>Nenhuma NC crítica aberta.</p>}
            {criticalNCs.slice(0,8).map(nc => (
              <div key={nc.id} style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--red)", marginBottom:2 }}>{nc.setor}</div>
                <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.4 }}>{nc.pergunta.slice(0,90)}...</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderSetores() {
    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Setores Hospitalares</div>
            <div className="scih-page-sub">Clique num setor para iniciar auditoria</div>
          </div>
          <button className="scih-btn scih-btn-teal" onClick={() => setActivePage("checklist")}>+ Nova Auditoria</button>
        </div>
        <div className="scih-sector-grid">
          {Object.entries(CHECKLISTS_DATA).map(([k,v]) => {
            const pct = stats[k]?.pct ?? 0;
            return (
              <div key={k} className="scih-sector-card" onClick={() => { setCkSetor(k); setActivePage("checklist"); }}>
                <div className="scih-sector-icon">{SECTOR_ICONS[k] ?? "🏥"}</div>
                <div className="scih-sector-name">{v.nome}</div>
                <div className="scih-progress-bar" style={{ marginBottom:6 }}>
                  <div className="scih-progress-fill" style={{ width:`${pct}%`, background: barColor(pct) }}/>
                </div>
                <span className={`scih-badge ${confClass(pct)}`}>{pct > 0 ? `${pct}%` : "Não auditado"}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderChecklist() {
    const setor = CHECKLISTS_DATA[ckSetor];
    const { total, conf, nc, pct } = computeChecklist();

    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Auditoria: {setor?.nome}</div>
            <div className="scih-page-sub">Preencha cada item e finalize para gerar NCs automaticamente</div>
          </div>
          <button className="scih-btn scih-btn-teal" onClick={finalizeAudit} disabled={ckPhotosUploading}>
            {ckPhotosUploading ? "Salvando fotos…" : "Finalizar Auditoria"}
          </button>
        </div>

        <div className="scih-card scih-mb">
          <div className="scih-form-grid" style={{ marginBottom:12 }}>
            <div>
              <label className="scih-label">Setor</label>
              <select className="scih-select" style={{ width:"100%" }} value={ckSetor} onChange={e => { setCkSetor(e.target.value); setCkStates({}); }}>
                {Object.entries(CHECKLISTS_DATA).map(([k,v]) => <option key={k} value={k}>{SECTOR_ICONS[k] ?? '🏥'} {v.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="scih-label">Tipo</label>
              <select className="scih-select" style={{ width:"100%" }} value={ckTipo} onChange={e => setCkTipo(e.target.value)}>
                {["Programada","Não Programada","Interna","Externa"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="scih-label">Auditor</label>
              <input className="scih-input" value={ckAuditor} onChange={e => setCkAuditor(e.target.value)} placeholder="Nome do auditor" />
            </div>
            <div>
              <label className="scih-label">Resp. do Setor</label>
              <input className="scih-input" value={ckResp} onChange={e => setCkResp(e.target.value)} placeholder="Responsável" />
            </div>
          </div>
          <div className="scih-flex" style={{ gap:20 }}>
            <span style={{ fontSize:13, color:"var(--text2)" }}>Respondidos: <b style={{ color:"var(--text)" }}>{total}</b></span>
            <span style={{ fontSize:13, color:"var(--text2)" }}>Conformes: <b style={{ color:"var(--teal)" }}>{conf}</b></span>
            <span style={{ fontSize:13, color:"var(--text2)" }}>NCs: <b style={{ color:"var(--red)" }}>{nc}</b></span>
            <span style={{ fontSize:13, color:"var(--text2)" }}>Conformidade: <b style={{ color: barColor(pct) }}>{pct}%</b></span>
          </div>
        </div>

        {setor?.grupos.map(g => (
          <div key={g.grupo} className="scih-card scih-mb">
            <div className="scih-section-title">{g.grupo}</div>
            {g.itens.map((item, i) => {
              const key = `${ckSetor}-${g.grupo}-${i}`;
              const st = ckStates[key] || { v: "", obs: "" };
              return (
                <div key={key} className="scih-ck-row">
                  <div className="scih-ck-q">{i+1}. {item}</div>
                  <div className="scih-ck-opts">
                    {([["conf","Conforme"],["parc","Parcial"],["nc","Não Conforme"],["na","N/A"]] as [CkState["v"],string][]).map(([val,lbl]) => (
                      <button key={val}
                        className={`scih-ck-opt${st.v === val ? ` sel-${val}` : ""}`}
                        onClick={() => setCkValue(key, st.v === val ? "" : val)}
                      >{lbl}</button>
                    ))}
                  </div>
                  {(st.v === "nc" || st.v === "parc") && (
                    <textarea className="scih-ck-obs" placeholder="Observações sobre a não conformidade..."
                      value={st.obs} onChange={e => setCkObs(key, e.target.value)} />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* ── Fotos da Auditoria ── */}
        <div className="scih-card scih-mb">
          <div className="scih-section-title">
            📸 Fotos da Auditoria
            <span style={{ fontSize:11, color:"var(--text3)", fontWeight:400, marginLeft:8 }}>opcional — máx. 10 fotos</span>
          </div>
          <p style={{ fontSize:12, color:"var(--text2)", marginBottom:14 }}>
            Anexe fotos como evidência diretamente da câmera do celular ou da galeria.
          </p>

          <input ref={ckCameraRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }}
            onChange={e => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; addCkPhotos(fs); }} />
          <input ref={ckGalleryRef} type="file" accept="image/*" multiple style={{ display:"none" }}
            onChange={e => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; addCkPhotos(fs); }} />

          <div className="scih-flex" style={{ gap:10, marginBottom:14, flexWrap:"wrap" }}>
            <button className="scih-btn scih-btn-outline"
              disabled={ckPhotos.length >= 10 || ckPhotosProcessing}
              onClick={() => ckCameraRef.current?.click()}>
              📷 Câmera
            </button>
            <button className="scih-btn scih-btn-outline"
              disabled={ckPhotos.length >= 10 || ckPhotosProcessing}
              onClick={() => ckGalleryRef.current?.click()}>
              🖼️ Galeria / Arquivo
            </button>
            {ckPhotosProcessing && (
              <span style={{ fontSize:12, color:"var(--text2)" }}>⏳ Otimizando imagens…</span>
            )}
          </div>

          {ckPhotos.length > 0 && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10 }}>
                {ckPhotos.map((p, i) => (
                  <div key={i} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:6, overflow:"hidden" }}>
                    <div style={{ position:"relative", aspectRatio:"1", background:"var(--bg4)" }}>
                      <img src={URL.createObjectURL(p.file)} alt={p.caption || `Foto ${i+1}`}
                        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      <span style={{ position:"absolute", top:4, left:4, background:"rgba(0,0,0,.65)", color:"#fff", fontSize:10, borderRadius:3, padding:"2px 6px" }}>
                        {i+1}
                      </span>
                      <button onClick={() => removeCkPhoto(i)}
                        style={{ position:"absolute", top:4, right:4, background:"rgba(218,54,51,.85)", border:"none", borderRadius:"50%", color:"#fff", cursor:"pointer", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, lineHeight:1 }}>
                        ✕
                      </button>
                    </div>
                    <div style={{ padding:"6px 8px" }}>
                      <input className="scih-input" style={{ fontSize:11, padding:"4px 8px" }}
                        placeholder="Legenda (opcional)"
                        value={p.caption}
                        onChange={e => setCkPhotoCaption(i, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:11, color:"var(--text3)", marginTop:10 }}>
                {ckPhotos.length} foto(s) adicionada(s) — serão salvas ao finalizar a auditoria.
              </p>
            </>
          )}

          {ckPhotos.length === 0 && (
            <div style={{ border:"2px dashed var(--border)", borderRadius:8, padding:"24px 16px", textAlign:"center", color:"var(--text3)", fontSize:13 }}>
              📷 Nenhuma foto adicionada ainda
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderAuditorias() {
    const filtered = appData.ncs.filter(n =>
      !ncFilter || n.setor.toLowerCase().includes(ncFilter.toLowerCase()) ||
      n.pergunta.toLowerCase().includes(ncFilter.toLowerCase())
    );

    return (
      <div>
        <div className="scih-page-title">NCs & Histórico de Auditorias</div>
        <div className="scih-tabs">
          <button className={`scih-tab ${auditTab==="ncs" ? "active":""}`} onClick={() => setAuditTab("ncs")}>Não Conformidades ({appData.ncs.length})</button>
          <button className={`scih-tab ${auditTab==="historico" ? "active":""}`} onClick={() => setAuditTab("historico")}>Histórico ({appData.historico.length})</button>
        </div>

        {auditTab === "ncs" && (
          <div>
            <div className="scih-flex scih-mb">
              <input className="scih-input" style={{ maxWidth:300 }} placeholder="Filtrar por setor ou descrição..." value={ncFilter} onChange={e => setNcFilter(e.target.value)} />
              <span style={{ fontSize:12, color:"var(--text2)", marginLeft:8 }}>{filtered.length} registros</span>
            </div>
            <div className="scih-card" style={{ padding:0 }}>
              <table className="scih-table">
                <thead>
                  <tr>
                    <th>Setor</th><th>Pergunta</th><th>Severidade</th><th>Status</th><th>Data</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign:"center", color:"var(--text2)", padding:24 }}>Nenhuma NC encontrada.</td></tr>}
                  {filtered.map(nc => (
                    <tr key={nc.id}>
                      <td><span style={{ fontSize:12 }}>{nc.setor}</span></td>
                      <td style={{ maxWidth:300 }}><span style={{ fontSize:12 }}>{nc.pergunta.slice(0,80)}{nc.pergunta.length>80?"...":""}</span></td>
                      <td>
                        <span className="scih-badge" style={{
                          background: nc.sev==="Crítica" ? "rgba(218,54,51,.2)" : nc.sev==="Maior" ? "rgba(212,160,23,.2)" : "rgba(56,139,253,.2)",
                          color: nc.sev==="Crítica" ? "#da3633" : nc.sev==="Maior" ? "#d4a017" : "#388bfd"
                        }}>{nc.sev}</span>
                      </td>
                      <td>
                        <span className="scih-badge" style={{
                          background: nc.status==="Encerrado" ? "rgba(26,158,117,.2)" : "rgba(212,160,23,.2)",
                          color: nc.status==="Encerrado" ? "#1a9e75" : "#d4a017"
                        }}>{nc.status}</span>
                      </td>
                      <td style={{ fontSize:12, color:"var(--text2)" }}>{nc.data}</td>
                      <td>
                        {nc.status !== "Encerrado" &&
                          <button className="scih-btn scih-btn-outline" style={{ fontSize:11, padding:"3px 8px" }} onClick={() => closeNc(nc.id!)}>Encerrar</button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {auditTab === "historico" && (
          <div className="scih-card" style={{ padding:0 }}>
            {selectedHistIds.size > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"rgba(13,148,136,.1)", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:13, color:"var(--text)", fontWeight:500 }}>{selectedHistIds.size} auditoria(s) selecionada(s)</span>
                <button className="scih-btn scih-btn-teal" style={{ fontSize:12, padding:"4px 12px", marginLeft:"auto" }}
                  onClick={() => { setScihEmailTo(""); setScihEmailCc(""); setScihEmailName(""); setScihBulkEmailOpen(true); }}>
                  ✉️ Enviar selecionadas
                </button>
                <button className="scih-btn scih-btn-outline" style={{ fontSize:12, padding:"4px 10px" }} onClick={() => setSelectedHistIds(new Set())}>Limpar</button>
              </div>
            )}
            <table className="scih-table">
              <thead>
                <tr>
                  <th style={{ width:36 }}>
                    <input type="checkbox" style={{ cursor:"pointer", accentColor:"var(--teal)" }}
                      checked={appData.historico.length > 0 && selectedHistIds.size === appData.historico.length}
                      onChange={toggleHistSelectAll} />
                  </th>
                  <th>Setor</th><th>Data</th><th>Tipo</th><th>Auditor</th><th>Conformidade</th><th>NCs</th><th>Plano IA</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {appData.historico.length === 0 && <tr><td colSpan={9} style={{ textAlign:"center", color:"var(--text2)", padding:24 }}>Nenhuma auditoria registrada.</td></tr>}
                {appData.historico.map(h => (
                  <tr key={h.id}>
                    <td>
                      <input type="checkbox" style={{ cursor:"pointer", accentColor:"var(--teal)" }}
                        checked={selectedHistIds.has(h.id!)}
                        onChange={() => toggleHistSelect(h.id!)} />
                    </td>
                    <td>{h.setorNome}</td>
                    <td style={{ fontSize:12, color:"var(--text2)" }}>{h.data}</td>
                    <td style={{ fontSize:12 }}>{h.tipo}</td>
                    <td style={{ fontSize:12, color:"var(--text2)" }}>{h.auditor}</td>
                    <td><span style={{ color: barColor(h.pct), fontWeight:600 }}>{h.pct}%</span></td>
                    <td><span className="scih-badge sp-low">{h.ncCount}</span></td>
                    <td>
                      {h.aiGerado ? (
                        <button className="scih-btn scih-btn-teal" style={{ fontSize:11, padding:"3px 10px" }}
                          onClick={() => setAiPlanModal({ auditId: h.id!, relatorio: h.relatorioIA || "" })}>
                          🤖 Ver Plano
                        </button>
                      ) : (
                        <button className="scih-btn scih-btn-outline" style={{ fontSize:11, padding:"3px 10px" }}
                          onClick={() => {
                            const ncsAudit = appData.ncs.filter(n => n.data === h.data && n.setor === h.setorNome);
                            generateAuditPlanWithAI(h.id!, ncsAudit, h.setorNome, h.pct, h.tipo, h.auditor);
                          }}>
                          🤖 Gerar IA
                        </button>
                      )}
                    </td>
                    <td>
                      <div style={{ display:"flex", gap:4 }}>
                        <button title="Visualizar" className="scih-btn scih-btn-outline" style={{ fontSize:14, padding:"3px 7px" }} onClick={() => setViewAuditRecord(h)}>👁️</button>
                        <button title="Exportar PDF" className="scih-btn scih-btn-outline" style={{ fontSize:14, padding:"3px 7px" }} disabled={pdfExportingId === h.id} onClick={() => exportAuditPdf(h)}>{pdfExportingId === h.id ? "⏳" : "📄"}</button>
                        <button title="Enviar por e-mail" className="scih-btn scih-btn-outline" style={{ fontSize:14, padding:"3px 7px" }} onClick={() => openEmailDialog(h)}>✉️</button>
                        <button title="Editar" className="scih-btn scih-btn-outline" style={{ fontSize:14, padding:"3px 7px" }} onClick={() => openEditAudit(h)}>✏️</button>
                        <button title="Excluir" className="scih-btn scih-btn-outline" style={{ fontSize:14, padding:"3px 7px", color:"var(--red)" }} onClick={() => setDeleteAuditId(h.id!)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  async function printCronograma() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Cronograma de Auditorias", margin, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, 24);
    doc.setTextColor(0);

    let y = 34;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(26, 158, 117);
    doc.setTextColor(255);
    doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
    doc.text("Setor", margin + 2, y);
    doc.text("Tipo", margin + 80, y);
    doc.text("Responsável", margin + 115, y);
    doc.text("Data", margin + 150, y);
    doc.text("Status", margin + 172, y);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 8;

    if (appData.cronograma.length === 0) {
      doc.setTextColor(120);
      doc.text("Nenhum agendamento cadastrado.", margin, y);
    } else {
      appData.cronograma.forEach((c, i) => {
        if (y > 275) { doc.addPage(); y = 20; }
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
        }
        const setor = CHECKLISTS_DATA[c.setor]?.nome || c.setor || "-";
        doc.text(String(setor).slice(0, 45), margin + 2, y);
        doc.text(String(c.tipo || "-").slice(0, 20), margin + 80, y);
        doc.text(String(c.resp || "-").slice(0, 20), margin + 115, y);
        doc.text(String(c.data || "-"), margin + 150, y);
        doc.setTextColor(c.realizado ? 26 : 200, c.realizado ? 158 : 120, c.realizado ? 117 : 0);
        doc.text(c.realizado ? "Realizado" : "Pendente", margin + 172, y);
        doc.setTextColor(0);
        y += 8;
      });
    }

    doc.save(`cronograma-auditorias-${new Date().toISOString().split("T")[0]}.pdf`);
  }

  function renderCronograma() {
    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Cronograma de Auditorias</div>
            <div className="scih-page-sub">Gerencie os agendamentos de visitas e auditorias</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="scih-btn scih-btn-outline" onClick={printCronograma} title="Imprimir cronograma em PDF" aria-label="Imprimir cronograma em PDF">🖨️ Imprimir PDF</button>
            <button className="scih-btn scih-btn-teal" onClick={() => setShowCronoModal(true)}>+ Agendar</button>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {appData.cronograma.length === 0 && <div className="scih-card" style={{ color:"var(--text2)", fontSize:13 }}>Nenhum agendamento cadastrado.</div>}
          {appData.cronograma.map(c => (
            <div key={c.id} className="scih-crono-card">
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>{CHECKLISTS_DATA[c.setor]?.nome || c.setor}</div>
                <div style={{ fontSize:12, color:"var(--text2)", marginTop:3 }}>{c.tipo} · {c.resp} · {c.data}</div>
              </div>
              <button
                className={`scih-btn ${c.realizado ? "scih-btn-outline" : "scih-btn-teal"}`}
                style={{ fontSize:12 }}
                onClick={() => toggleCrono(c.id!)}
              >{c.realizado ? "✓ Realizado" : "Marcar como feito"}</button>
            </div>
          ))}
        </div>

        {showCronoModal && (
          <div className="scih-modal-overlay" onClick={() => setShowCronoModal(false)}>
            <div className="scih-modal" onClick={e => e.stopPropagation()}>
              <div className="scih-modal-title">Novo Agendamento</div>
              <div className="scih-form-grid">
                <div>
                  <label className="scih-label">Setor</label>
                  <select className="scih-select" style={{ width:"100%" }} value={cronoForm.setor} onChange={e => setCronoForm(f => ({ ...f, setor:e.target.value }))}>
                    <option value="">Selecione...</option>
                    {Object.entries(CHECKLISTS_DATA).map(([k,v]) => <option key={k} value={k}>{v.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="scih-label">Data</label>
                  <input type="date" className="scih-input" value={cronoForm.data} onChange={e => setCronoForm(f => ({ ...f, data:e.target.value }))} />
                </div>
                <div>
                  <label className="scih-label">Tipo</label>
                  <select className="scih-select" style={{ width:"100%" }} value={cronoForm.tipo} onChange={e => setCronoForm(f => ({ ...f, tipo:e.target.value }))}>
                    {["Programada","Não Programada","Retorno"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="scih-label">Responsável</label>
                  <input className="scih-input" value={cronoForm.resp} onChange={e => setCronoForm(f => ({ ...f, resp:e.target.value }))} placeholder="Nome" />
                </div>
              </div>
              <div className="scih-flex scih-mt">
                <button className="scih-btn scih-btn-teal" onClick={addCrono}>Salvar</button>
                <button className="scih-btn scih-btn-outline" onClick={() => setShowCronoModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPlano() {
    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Planos de Ação 5W2H</div>
            <div className="scih-page-sub">Gerencie as ações corretivas e preventivas</div>
          </div>
          <button className="scih-btn scih-btn-teal" onClick={() => setShowPlanModal(true)}>+ Novo Plano</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {appData.planos.length === 0 && <div className="scih-card" style={{ color:"var(--text2)", fontSize:13 }}>Nenhum plano cadastrado.</div>}
          {appData.planos.map(p => (
            <div key={p.id} className="scih-card">
              <div className="scih-row scih-mb">
                <div style={{ fontWeight:600, fontSize:14 }}>
                  {p.fonte === "ia" && <span style={{ fontSize:11, background:"rgba(56,139,253,.2)", color:"#388bfd", padding:"1px 6px", borderRadius:8, marginRight:6 }}>🤖 IA</span>}
                  {p.what || "(Sem título)"}
                </div>
                <span className="scih-badge" style={{
                  background: p.status==="Concluído" ? "rgba(26,158,117,.2)" : p.status==="Em andamento" ? "rgba(56,139,253,.2)" : "rgba(212,160,23,.2)",
                  color: p.status==="Concluído" ? "#1a9e75" : p.status==="Em andamento" ? "#388bfd" : "#d4a017"
                }}>{p.status}</span>
              </div>
              <div className="scih-grid4" style={{ gap:10 }}>
                {[["Por quê?",p.why],["Onde?",p.where],["Quando?",p.when],["Quem?",p.who],["Como?",p.how],["Quanto?",p.howmuch]].map(([l,v]) => (
                  <div key={l as string}>
                    <div style={{ fontSize:11, color:"var(--text3)", marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:12, color:"var(--text2)" }}>{(v as string) || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {showPlanModal && (
          <div className="scih-modal-overlay" onClick={() => setShowPlanModal(false)}>
            <div className="scih-modal" onClick={e => e.stopPropagation()}>
              <div className="scih-modal-title">Novo Plano 5W2H</div>
              {[
                ["O quê? (What)", "what", "Ação a ser tomada"],
                ["Por quê? (Why)", "why", "Justificativa"],
                ["Onde? (Where)", "where", "Local"],
                ["Quando? (When)", "when", "Prazo"],
                ["Quem? (Who)", "who", "Responsável"],
                ["Como? (How)", "how", "Método"],
                ["Quanto? (How much)", "howmuch", "Custo estimado"],
              ].map(([lbl, fld, ph]) => (
                <div key={fld as string} style={{ marginBottom:10 }}>
                  <label className="scih-label">{lbl}</label>
                  <input className="scih-input" placeholder={ph as string}
                    value={(planForm as unknown as Record<string,string>)[fld as string]}
                    onChange={e => setPlanForm(f => ({ ...f, [fld as string]: e.target.value }))} />
                </div>
              ))}
              <div style={{ marginBottom:10 }}>
                <label className="scih-label">Status</label>
                <select className="scih-select" style={{ width:"100%" }} value={planForm.status} onChange={e => setPlanForm(f => ({ ...f, status:e.target.value }))}>
                  {["Aberto","Em andamento","Concluído"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="scih-flex scih-mt">
                <button className="scih-btn scih-btn-teal" onClick={addPlan}>Salvar</button>
                <button className="scih-btn scih-btn-outline" onClick={() => setShowPlanModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderKanban() {
    const cols = [
      { key:"todo", label:"A Fazer", color:"#8b949e" },
      { key:"doing", label:"Em Andamento", color:"#388bfd" },
      { key:"review", label:"Em Revisão", color:"#d4a017" },
      { key:"done", label:"Concluído", color:"#1a9e75" },
    ];

    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Kanban de Ações</div>
            <div className="scih-page-sub">Acompanhe o status das ações em andamento</div>
          </div>
          <button className="scih-btn scih-btn-teal" onClick={() => setShowKanbanModal(true)}>+ Novo Card</button>
        </div>

        <div className="scih-grid4">
          {cols.map(col => (
            <div key={col.key} className="scih-kanban-col">
              <div className="scih-kanban-col-title" style={{ color: col.color }}>{col.label}</div>
              {appData.kanban.filter(c => c.col === col.key).map(card => (
                <div key={card.id} className="scih-kanban-card">
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:4 }}>
                    {card.fonte === "ia" && <span style={{ fontSize:10, background:"rgba(56,139,253,.2)", color:"#388bfd", padding:"1px 5px", borderRadius:6, marginRight:4 }}>🤖</span>}
                    {card.title}
                  </div>
                  <div style={{ fontSize:11, color:"var(--text2)", marginBottom:8 }}>{card.setor} · {card.prazo}</div>
                  <div className="scih-flex" style={{ flexWrap:"wrap", gap:4 }}>
                    {cols.filter(c => c.key !== col.key).map(c => (
                      <button key={c.key} className="scih-btn scih-btn-outline" style={{ fontSize:10, padding:"2px 6px" }}
                        onClick={() => moveKanban(card.id!, c.key)}>→ {c.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {showKanbanModal && (
          <div className="scih-modal-overlay" onClick={() => setShowKanbanModal(false)}>
            <div className="scih-modal" onClick={e => e.stopPropagation()}>
              <div className="scih-modal-title">Novo Card Kanban</div>
              <div style={{ marginBottom:10 }}>
                <label className="scih-label">Título</label>
                <input className="scih-input" value={kanbanForm.title} onChange={e => setKanbanForm(f => ({ ...f, title:e.target.value }))} placeholder="Descrição da ação" />
              </div>
              <div className="scih-form-grid">
                <div>
                  <label className="scih-label">Setor</label>
                  <select className="scih-select" style={{ width:"100%" }} value={kanbanForm.setor} onChange={e => setKanbanForm(f => ({ ...f, setor:e.target.value }))}>
                    <option value="">Selecione...</option>
                    {Object.entries(CHECKLISTS_DATA).map(([k,v]) => <option key={k} value={v.nome}>{v.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="scih-label">Prioridade</label>
                  <select className="scih-select" style={{ width:"100%" }} value={kanbanForm.prio} onChange={e => setKanbanForm(f => ({ ...f, prio:e.target.value }))}>
                    {["Alta","Média","Baixa"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="scih-label">Prazo</label>
                  <input type="date" className="scih-input" value={kanbanForm.prazo} onChange={e => setKanbanForm(f => ({ ...f, prazo:e.target.value }))} />
                </div>
                <div>
                  <label className="scih-label">Coluna</label>
                  <select className="scih-select" style={{ width:"100%" }} value={kanbanForm.col} onChange={e => setKanbanForm(f => ({ ...f, col:e.target.value }))}>
                    {cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="scih-flex scih-mt">
                <button className="scih-btn scih-btn-teal" onClick={addKanban}>Salvar</button>
                <button className="scih-btn scih-btn-outline" onClick={() => setShowKanbanModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSwot() {
    const sw = SWOT_DATA[swotSetor];
    const quads = [
      { key:"f", label:"Forças", color:"#1a9e75", bg:"rgba(26,158,117,.1)", items: sw?.f || [] },
      { key:"o", label:"Oportunidades", color:"#388bfd", bg:"rgba(56,139,253,.1)", items: sw?.o || [] },
      { key:"w", label:"Fraquezas", color:"#d4a017", bg:"rgba(212,160,23,.1)", items: sw?.w || [] },
      { key:"a", label:"Ameaças", color:"#da3633", bg:"rgba(218,54,51,.1)", items: sw?.a || [] },
    ];

    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Análise SWOT</div>
            <div className="scih-page-sub">Forças, fraquezas, oportunidades e ameaças por setor</div>
          </div>
          <select className="scih-select" value={swotSetor} onChange={e => setSwotSetor(e.target.value)}>
            {Object.keys(SWOT_DATA).map(k => <option key={k} value={k}>{CHECKLISTS_DATA[k]?.nome || k}</option>)}
          </select>
        </div>
        <div className="scih-grid2">
          {quads.map(q => (
            <div key={q.key} className="scih-swot-quad" style={{ borderColor: q.color + "55", background: q.bg }}>
              <div className="scih-swot-title" style={{ color: q.color }}>{q.label}</div>
              {q.items.length === 0 && <div style={{ fontSize:12, color:"var(--text3)" }}>Nenhum item cadastrado.</div>}
              {q.items.map((item, i) => (
                <div key={i} className="scih-swot-item">{item}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderRisco() {
    const levels = [1,2,3,4,5];
    const riskColor = (p: number, i: number) => {
      const score = p * i;
      if (score >= 15) return "#da3633";
      if (score >= 8) return "#d4a017";
      if (score >= 4) return "#388bfd";
      return "#1a9e75";
    };

    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Matriz de Risco</div>
            <div className="scih-page-sub">Probabilidade × Impacto dos riscos identificados</div>
          </div>
          <button className="scih-btn scih-btn-teal" onClick={() => setShowRiskModal(true)}>+ Novo Risco</button>
        </div>

        <div className="scih-grid2">
          <div className="scih-card">
            <div className="scih-section-title">Matriz 5×5</div>
            <div style={{ display:"grid", gridTemplateColumns:"auto repeat(5,40px)", gap:4 }}>
              <div style={{ fontSize:11, color:"var(--text3)" }}>P\I</div>
              {levels.map(l => <div key={l} style={{ fontSize:11, color:"var(--text3)", textAlign:"center" }}>{l}</div>)}
              {levels.slice().reverse().map(p => (
                <>
                  <div key={`l${p}`} style={{ fontSize:11, color:"var(--text3)", display:"flex", alignItems:"center" }}>{p}</div>
                  {levels.map(i => {
                    const score = p * i;
                    const hasRisk = appData.riscos.some(r => r.prob === p && r.imp === i);
                    return (
                      <div key={`${p}-${i}`} className="scih-risk-cell"
                        style={{ background: riskColor(p,i) + "44", border: `1px solid ${riskColor(p,i)}66`, color: riskColor(p,i) }}>
                        {hasRisk ? "●" : score}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          <div className="scih-card">
            <div className="scih-section-title">Riscos Cadastrados</div>
            {appData.riscos.length === 0 && <p style={{ fontSize:13, color:"var(--text2)" }}>Nenhum risco cadastrado.</p>}
            {appData.riscos.map(r => (
              <div key={r.id} style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                <div className="scih-row">
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{r.desc.slice(0,50)}</span>
                  <span className="scih-badge" style={{
                    background: riskColor(r.prob, r.imp) + "33",
                    color: riskColor(r.prob, r.imp)
                  }}>P{r.prob}×I{r.imp}={r.prob*r.imp}</span>
                </div>
                <div style={{ fontSize:12, color:"var(--text2)", marginTop:2 }}>{r.setor}</div>
                {r.plano && <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>Plano: {r.plano}</div>}
              </div>
            ))}
          </div>
        </div>

        {showRiskModal && (
          <div className="scih-modal-overlay" onClick={() => setShowRiskModal(false)}>
            <div className="scih-modal" onClick={e => e.stopPropagation()}>
              <div className="scih-modal-title">Novo Risco</div>
              <div style={{ marginBottom:10 }}>
                <label className="scih-label">Descrição do Risco</label>
                <input className="scih-input" value={riskForm.desc} onChange={e => setRiskForm(f => ({ ...f, desc:e.target.value }))} placeholder="Descreva o risco..." />
              </div>
              <div className="scih-form-grid">
                <div>
                  <label className="scih-label">Probabilidade (1-5)</label>
                  <input type="number" min={1} max={5} className="scih-input" value={riskForm.prob} onChange={e => setRiskForm(f => ({ ...f, prob: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="scih-label">Impacto (1-5)</label>
                  <input type="number" min={1} max={5} className="scih-input" value={riskForm.imp} onChange={e => setRiskForm(f => ({ ...f, imp: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="scih-label">Setor</label>
                  <select className="scih-select" style={{ width:"100%" }} value={riskForm.setor} onChange={e => setRiskForm(f => ({ ...f, setor:e.target.value }))}>
                    <option value="">Selecione...</option>
                    {Object.entries(CHECKLISTS_DATA).map(([k,v]) => <option key={k} value={v.nome}>{v.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="scih-label">Plano de Controle</label>
                  <input className="scih-input" value={riskForm.plano} onChange={e => setRiskForm(f => ({ ...f, plano:e.target.value }))} placeholder="Ação de controle" />
                </div>
              </div>
              <div className="scih-flex scih-mt">
                <button className="scih-btn scih-btn-teal" onClick={addRisk}>Salvar</button>
                <button className="scih-btn scih-btn-outline" onClick={() => setShowRiskModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderRelatorio() {
    return (
      <div>
        <div className="scih-page-title">Relatório Geral</div>
        <div className="scih-page-sub">Panorama consolidado de todas as auditorias realizadas</div>

        <div className="scih-grid3 scih-mb">
          <div className="scih-card">
            <div className="scih-kpi-val">{appData.historico.length}</div>
            <div className="scih-kpi-lbl">Auditorias Realizadas</div>
          </div>
          <div className="scih-card">
            <div className="scih-kpi-val" style={{ color:"var(--red)" }}>{appData.ncs.filter(n=>n.sev==="Crítica").length}</div>
            <div className="scih-kpi-lbl">NCs Críticas</div>
          </div>
          <div className="scih-card">
            <div className="scih-kpi-val" style={{ color:"var(--teal)" }}>{avgConf}%</div>
            <div className="scih-kpi-lbl">Conformidade Média</div>
          </div>
        </div>

        <div className="scih-card" style={{ padding:0 }}>
          <table className="scih-table">
            <thead>
              <tr><th>Setor</th><th>Última Auditoria</th><th>Conformidade</th><th>NCs</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {Object.entries(CHECKLISTS_DATA).map(([k,v]) => {
                const lastAudit = appData.historico.find(h => h.setorKey === k);
                const pct = lastAudit?.pct ?? 0;
                return (
                  <tr key={k}>
                    <td>{SECTOR_ICONS[k] ?? '🏥'} {v.nome}</td>
                    <td style={{ fontSize:12, color:"var(--text2)" }}>{lastAudit?.data || "—"}</td>
                    <td>
                      <div className="scih-flex" style={{ gap:8 }}>
                        <div className="scih-progress-bar" style={{ width:80 }}>
                          <div className="scih-progress-fill" style={{ width:`${pct}%`, background: barColor(pct) }}/>
                        </div>
                        <span style={{ fontSize:12, color: barColor(pct), fontWeight:600 }}>{pct}%</span>
                      </div>
                    </td>
                    <td><span className="scih-badge sp-low">{lastAudit?.ncCount ?? 0}</span></td>
                    <td><span className={`scih-badge ${confClass(pct)}`}>{pct>=70?"Adequado":pct>=50?"Atenção":pct>0?"Crítico":"—"}</span></td>
                    <td>
                      {lastAudit ? (
                        <div style={{ display:"flex", gap:4 }}>
                          <button title="Visualizar" className="scih-btn scih-btn-outline" style={{ fontSize:14, padding:"3px 7px" }} onClick={() => setViewAuditRecord(lastAudit)}>👁️</button>
                          <button title="Exportar PDF" className="scih-btn scih-btn-outline" style={{ fontSize:14, padding:"3px 7px" }} disabled={pdfExportingId === lastAudit.id} onClick={() => exportAuditPdf(lastAudit)}>{pdfExportingId === lastAudit.id ? "⏳" : "📄"}</button>
                          <button title="Enviar por e-mail" className="scih-btn scih-btn-outline" style={{ fontSize:14, padding:"3px 7px" }} onClick={() => openEmailDialog(lastAudit)}>✉️</button>
                        </div>
                      ) : <span style={{ color:"var(--text3)", fontSize:11 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderBoletim() {
    const tipos = ["IPCS","PAV","ITU","ISC","Outros"];
    const byTipo: Record<string,IrasRecord[]> = {};
    tipos.forEach(t => { byTipo[t] = appData.iras.filter(r => r.tipo === t); });

    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Boletim IRAS</div>
            <div className="scih-page-sub">Indicadores de infecções relacionadas à assistência à saúde</div>
          </div>
          <button className="scih-btn scih-btn-teal" onClick={() => setShowIrasModal(true)}>+ Registrar</button>
        </div>

        <div className="scih-grid4 scih-mb">
          {tipos.map(t => {
            const records = byTipo[t];
            const totalCasos = records.reduce((s,r) => s + r.casos, 0);
            const totalDenom = records.reduce((s,r) => s + r.denom, 0);
            const taxa = totalDenom > 0 ? ((totalCasos / totalDenom) * 1000).toFixed(1) : "0.0";
            return (
              <div key={t} className="scih-boletim-card">
                <div style={{ fontSize:12, color:"var(--text2)", marginBottom:4 }}>{t}</div>
                <div className="scih-boletim-val" style={{ color: Number(taxa) > 5 ? "#da3633" : Number(taxa) > 2 ? "#d4a017" : "#1a9e75" }}>{taxa}</div>
                <div style={{ fontSize:11, color:"var(--text3)" }}>por mil dias/procedimentos</div>
                <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>{totalCasos} casos · {records.length} registros</div>
              </div>
            );
          })}
        </div>

        <div className="scih-card" style={{ padding:0 }}>
          <table className="scih-table">
            <thead>
              <tr><th>Tipo</th><th>Setor</th><th>Mês</th><th>Casos</th><th>Denominador</th><th>Taxa</th><th>Obs</th></tr>
            </thead>
            <tbody>
              {appData.iras.length === 0 && <tr><td colSpan={7} style={{ textAlign:"center", color:"var(--text2)", padding:24 }}>Nenhum registro IRAS.</td></tr>}
              {appData.iras.map(r => (
                <tr key={r.id}>
                  <td><span className="scih-badge sp-low">{r.tipo}</span></td>
                  <td style={{ fontSize:12 }}>{r.setor}</td>
                  <td style={{ fontSize:12, color:"var(--text2)" }}>{r.mes}</td>
                  <td style={{ fontWeight:600, color:"var(--red)" }}>{r.casos}</td>
                  <td style={{ fontSize:12, color:"var(--text2)" }}>{r.denom}</td>
                  <td style={{ fontWeight:600, color: (r.casos/r.denom*1000) > 5 ? "#da3633" : "#1a9e75" }}>
                    {(r.casos/r.denom*1000).toFixed(1)}‰
                  </td>
                  <td style={{ fontSize:12, color:"var(--text2)" }}>{r.obs || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showIrasModal && (
          <div className="scih-modal-overlay" onClick={() => setShowIrasModal(false)}>
            <div className="scih-modal" onClick={e => e.stopPropagation()}>
              <div className="scih-modal-title">Registrar Indicador IRAS</div>
              <div className="scih-form-grid">
                <div>
                  <label className="scih-label">Tipo de IRAS</label>
                  <select className="scih-select" style={{ width:"100%" }} value={irasForm.tipo} onChange={e => setIrasForm(f => ({ ...f, tipo:e.target.value }))}>
                    {tipos.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="scih-label">Setor</label>
                  <select className="scih-select" style={{ width:"100%" }} value={irasForm.setor} onChange={e => setIrasForm(f => ({ ...f, setor:e.target.value }))}>
                    <option value="">Selecione...</option>
                    {Object.entries(CHECKLISTS_DATA).map(([k,v]) => <option key={k} value={v.nome}>{v.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="scih-label">Número de Casos</label>
                  <input type="number" min={0} className="scih-input" value={irasForm.casos} onChange={e => setIrasForm(f => ({ ...f, casos:Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="scih-label">Denominador (dias/procedimentos)</label>
                  <input type="number" min={1} className="scih-input" value={irasForm.denom} onChange={e => setIrasForm(f => ({ ...f, denom:Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="scih-label">Mês (AAAA-MM)</label>
                  <input type="month" className="scih-input" value={irasForm.mes} onChange={e => setIrasForm(f => ({ ...f, mes:e.target.value }))} />
                </div>
                <div>
                  <label className="scih-label">Observações</label>
                  <input className="scih-input" value={irasForm.obs} onChange={e => setIrasForm(f => ({ ...f, obs:e.target.value }))} placeholder="Opcional" />
                </div>
              </div>
              <div className="scih-flex scih-mt">
                <button className="scih-btn scih-btn-teal" onClick={addIras}>Salvar</button>
                <button className="scih-btn scih-btn-outline" onClick={() => setShowIrasModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const pageMap: Record<Page, () => JSX.Element> = {
    dashboard: renderDashboard,
    setores: renderSetores,
    checklist: renderChecklist,
    auditorias: renderAuditorias,
    cronograma: renderCronograma,
    plano: renderPlano,
    kanban: renderKanban,
    swot: renderSwot,
    risco: renderRisco,
    relatorio: renderRelatorio,
    boletim: renderBoletim,
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{SCIH_CSS}</style>
      <div className="scih-wrap">

      {/* Loading IA */}
      {aiLoading && (
        <div style={{ position:"fixed", bottom:24, right:24, background:"var(--bg2)", border:"1px solid var(--teal)", borderRadius:12, padding:"14px 20px", zIndex:2000, display:"flex", alignItems:"center", gap:10, boxShadow:"0 4px 20px rgba(0,0,0,.4)" }}>
          <span style={{ fontSize:20, animation:"spin 1s linear infinite" }}>🤖</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--teal)" }}>Gerando plano com IA...</div>
            <div style={{ fontSize:11, color:"var(--text2)" }}>5W2H · Kanban · Matriz de Risco · Relatório</div>
          </div>
        </div>
      )}

      {/* Modal pós-auditoria */}
      {postAuditRecord && (
        <div className="scih-modal-overlay" onClick={() => setPostAuditRecord(null)}>
          <div className="scih-modal" style={{ width:480, maxWidth:"95vw" }} onClick={e => e.stopPropagation()}>
            <div className="scih-modal-title">✅ Auditoria Finalizada</div>
            <div style={{ background:"rgba(26,158,117,.1)", border:"1px solid rgba(26,158,117,.3)", borderRadius:8, padding:"12px 16px", marginBottom:16 }}>
              <div style={{ fontSize:13, color:"var(--teal)", fontWeight:600 }}>{postAuditRecord.setorNome} — {postAuditRecord.data}</div>
              <div style={{ fontSize:12, color:"var(--text2)", marginTop:4 }}>Conformidade: <strong style={{ color: barColor(postAuditRecord.pct) }}>{postAuditRecord.pct}%</strong> · NCs: {postAuditRecord.ncCount}</div>
            </div>
            <div style={{ fontSize:13, color:"var(--text2)", marginBottom:16 }}>O que deseja fazer agora?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button className="scih-btn scih-btn-teal" style={{ justifyContent:"flex-start", gap:10 }}
                onClick={() => { openEmailDialog(postAuditRecord); setPostAuditRecord(null); }}>
                ✉️ Enviar por e-mail para o gestor
              </button>
              <button className="scih-btn scih-btn-outline" style={{ justifyContent:"flex-start", gap:10 }}
                onClick={() => { exportAuditPdf(postAuditRecord); setPostAuditRecord(null); }}>
                📄 Exportar em PDF
              </button>
              <button className="scih-btn scih-btn-outline" style={{ justifyContent:"flex-start", gap:10 }}
                onClick={() => setPostAuditRecord(null)}>
                📋 Ver histórico de auditorias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal visualizar auditoria */}
      {viewAuditRecord && (
        <div className="scih-modal-overlay" onClick={() => setViewAuditRecord(null)}>
          <div className="scih-modal" style={{ width:600, maxWidth:"95vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div className="scih-modal-title" style={{ margin:0 }}>👁️ Detalhes da Auditoria</div>
              <button className="scih-btn scih-btn-outline" style={{ fontSize:11 }} onClick={() => setViewAuditRecord(null)}>✕ Fechar</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {[
                { lbl:"Setor", val: viewAuditRecord.setorNome },
                { lbl:"Data", val: viewAuditRecord.data },
                { lbl:"Tipo", val: viewAuditRecord.tipo },
                { lbl:"Auditor", val: viewAuditRecord.auditor },
                { lbl:"Resp. Setor", val: viewAuditRecord.respSetor },
                { lbl:"NCs", val: String(viewAuditRecord.ncCount) },
              ].map(f => (
                <div key={f.lbl} style={{ background:"var(--bg3)", borderRadius:6, padding:"10px 14px" }}>
                  <div style={{ fontSize:11, color:"var(--text2)", marginBottom:3 }}>{f.lbl}</div>
                  <div style={{ fontSize:13, color:"var(--text)", fontWeight:600 }}>{f.val || "—"}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <span style={{ fontSize:36, fontWeight:700, color: barColor(viewAuditRecord.pct) }}>{viewAuditRecord.pct}%</span>
              <div style={{ fontSize:12, color:"var(--text2)" }}>Conformidade</div>
            </div>
            {viewAuditRecord.relatorioIA && (
              <div style={{ background:"var(--bg3)", borderRadius:8, padding:14 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", marginBottom:8 }}>🤖 Análise IA</div>
                <pre style={{ fontFamily:"inherit", fontSize:11.5, color:"var(--text2)", whiteSpace:"pre-wrap", lineHeight:1.6, margin:0 }}>{viewAuditRecord.relatorioIA}</pre>
              </div>
            )}
            {viewAuditPhotoUrls.length > 0 && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", marginBottom:10 }}>📸 Fotos ({viewAuditPhotoUrls.length})</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:8 }}>
                  {viewAuditPhotoUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display:"block", borderRadius:6, overflow:"hidden", border:"1px solid var(--border)", background:"var(--bg3)" }}>
                      <div style={{ aspectRatio:"1", overflow:"hidden" }}>
                        <img src={url} alt={viewAuditRecord.photoCaptions?.[i] || `Foto ${i+1}`}
                          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      </div>
                      {viewAuditRecord.photoCaptions?.[i] && (
                        <div style={{ fontSize:10, color:"var(--text2)", padding:"4px 6px", lineHeight:1.3 }}>
                          {viewAuditRecord.photoCaptions[i]}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop:14, display:"flex", gap:8 }}>
              <button className="scih-btn scih-btn-teal" onClick={() => { exportAuditPdf(viewAuditRecord); setViewAuditRecord(null); }}>📄 PDF</button>
              <button className="scih-btn scih-btn-outline" onClick={() => { openEmailDialog(viewAuditRecord); setViewAuditRecord(null); }}>✉️ E-mail</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal e-mail em massa */}
      {scihBulkEmailOpen && (
        <div className="scih-modal-overlay" onClick={() => { if (!scihEmailSending) setScihBulkEmailOpen(false); }}>
          <div className="scih-modal" style={{ width:480, maxWidth:"95vw" }} onClick={e => e.stopPropagation()}>
            <div className="scih-modal-title">✉️ Enviar {selectedHistIds.size} auditoria(s) por E-mail</div>
            <p style={{ fontSize:12, color:"var(--text2)", marginBottom:16 }}>
              Cada auditoria selecionada será enviada individualmente para o mesmo destinatário.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label className="scih-label">Nome do Gestor (opcional)</label>
                <input className="scih-input" placeholder="Ex: Dr. João Silva" value={scihEmailName} onChange={e => setScihEmailName(e.target.value)} />
              </div>
              <div>
                <label className="scih-label">E-mail do Gestor *</label>
                <input className="scih-input" type="email" placeholder="gestor@hospital.com.br" value={scihEmailTo} onChange={e => setScihEmailTo(e.target.value)} />
              </div>
              <div>
                <label className="scih-label">Cópia (CC) — separe por vírgula</label>
                <input className="scih-input" type="text" placeholder="outro@hospital.com.br" value={scihEmailCc} onChange={e => setScihEmailCc(e.target.value)} />
              </div>
              {scihEmailSending && scihBulkProgress && (
                <div style={{ fontSize:12, color:"var(--teal)" }}>⏳ {scihBulkProgress}</div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
              <button className="scih-btn scih-btn-outline" onClick={() => setScihBulkEmailOpen(false)} disabled={scihEmailSending}>Cancelar</button>
              <button className="scih-btn scih-btn-teal" onClick={handleBulkSendScihEmail} disabled={scihEmailSending}>
                {scihEmailSending ? `⏳ ${scihBulkProgress || "Enviando…"}` : `✉️ Enviar ${selectedHistIds.size} auditoria(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal e-mail auditoria */}
      {scihEmailRecord && (
        <div className="scih-modal-overlay" onClick={() => !scihEmailSending && setScihEmailRecord(null)}>
          <div className="scih-modal" style={{ width:480, maxWidth:"95vw" }} onClick={e => e.stopPropagation()}>
            <div className="scih-modal-title">✉️ Enviar Auditoria por E-mail</div>
            <p style={{ fontSize:12, color:"var(--text2)", marginBottom:16 }}>
              Auditoria: <strong>{scihEmailRecord.setorNome}</strong> — {scihEmailRecord.data} ({scihEmailRecord.pct}% conformidade)
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label className="scih-label">Nome do Gestor (opcional)</label>
                <input className="scih-input" placeholder="Ex: Dr. João Silva" value={scihEmailName} onChange={e => setScihEmailName(e.target.value)} />
              </div>
              <div>
                <label className="scih-label">E-mail do Gestor *</label>
                <input className="scih-input" type="email" placeholder="gestor@hospital.com.br" value={scihEmailTo} onChange={e => setScihEmailTo(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !scihEmailSending) handleSendAuditEmail(); }} />
              </div>
              <div>
                <label className="scih-label">Cópia (CC) — separe por vírgula</label>
                <input className="scih-input" type="text" placeholder="outro@hospital.com.br" value={scihEmailCc} onChange={e => setScihEmailCc(e.target.value)} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
              <button className="scih-btn scih-btn-outline" onClick={() => setScihEmailRecord(null)} disabled={scihEmailSending}>Cancelar</button>
              <button className="scih-btn scih-btn-teal" onClick={handleSendAuditEmail} disabled={scihEmailSending}>
                {scihEmailSending ? "Enviando…" : "✉️ Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar auditoria */}
      {editAuditRecord && (
        <div className="scih-modal-overlay" onClick={() => setEditAuditRecord(null)}>
          <div className="scih-modal" style={{ width:420, maxWidth:"95vw" }} onClick={e => e.stopPropagation()}>
            <div className="scih-modal-title">✏️ Editar Auditoria</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
              <div>
                <label className="scih-label">Auditor</label>
                <input className="scih-input" value={editAuditForm.auditor} onChange={e => setEditAuditForm(p => ({ ...p, auditor: e.target.value }))} />
              </div>
              <div>
                <label className="scih-label">Responsável do Setor</label>
                <input className="scih-input" value={editAuditForm.respSetor} onChange={e => setEditAuditForm(p => ({ ...p, respSetor: e.target.value }))} />
              </div>
              <div>
                <label className="scih-label">Tipo</label>
                <select className="scih-select" style={{ width:"100%" }} value={editAuditForm.tipo} onChange={e => setEditAuditForm(p => ({ ...p, tipo: e.target.value }))}>
                  {["Programada","Não Programada","Reinspeção"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="scih-btn scih-btn-outline" onClick={() => setEditAuditRecord(null)}>Cancelar</button>
              <button className="scih-btn scih-btn-teal" onClick={saveEditAudit}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {deleteAuditId && (
        <div className="scih-modal-overlay" onClick={() => setDeleteAuditId(null)}>
          <div className="scih-modal" style={{ width:380, maxWidth:"95vw" }} onClick={e => e.stopPropagation()}>
            <div className="scih-modal-title" style={{ color:"var(--red)" }}>🗑️ Excluir Auditoria</div>
            <p style={{ fontSize:13, color:"var(--text2)", marginBottom:20 }}>Tem certeza que deseja excluir esta auditoria? Esta ação não pode ser desfeita.</p>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="scih-btn scih-btn-outline" onClick={() => setDeleteAuditId(null)}>Cancelar</button>
              <button className="scih-btn scih-btn-red" onClick={() => handleDeleteAudit(deleteAuditId)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal plano IA */}
      {aiPlanModal && (
        <div className="scih-modal-overlay" onClick={() => setAiPlanModal(null)}>
          <div className="scih-modal" style={{ width:700, maxWidth:"95vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div className="scih-modal-title" style={{ margin:0 }}>🤖 Plano Gerado por IA</div>
              <button className="scih-btn scih-btn-outline" style={{ fontSize:11 }} onClick={() => setAiPlanModal(null)}>✕ Fechar</button>
            </div>
            <div style={{ background:"rgba(56,139,253,.08)", border:"1px solid rgba(56,139,253,.3)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#388bfd" }}>
              ✅ Planos 5W2H, Kanban e Matriz de Risco foram gerados automaticamente e adicionados às respectivas abas.
            </div>
            <div style={{ background:"var(--bg3)", borderRadius:8, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:10 }}>📈 Relatório Executivo</div>
              <pre style={{ fontFamily:"inherit", fontSize:12, color:"var(--text2)", whiteSpace:"pre-wrap", lineHeight:1.6, margin:0 }}>{aiPlanModal.relatorio}</pre>
            </div>
            <div style={{ marginTop:14, display:"flex", gap:8 }}>
              <button className="scih-btn scih-btn-teal" onClick={() => { setAiPlanModal(null); setActivePage("plano"); }}>Ver 5W2H</button>
              <button className="scih-btn scih-btn-outline" onClick={() => { setAiPlanModal(null); setActivePage("kanban"); }}>Ver Kanban</button>
              <button className="scih-btn scih-btn-outline" onClick={() => { setAiPlanModal(null); setActivePage("risco"); }}>Ver Riscos</button>
            </div>
          </div>
        </div>
      )}
        {/* Tabs horizontais */}
        <div className="scih-tabs">
          {NAV.map(n => (
            <button
              key={n.key}
              className={`scih-tab-btn${activePage === n.key ? " active" : ""}`}
              onClick={() => setActivePage(n.key)}
            >
              <span className="scih-tab-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", padding:"0 8px", fontSize:11, color: loaded ? "var(--teal)" : "var(--text3)", whiteSpace:"nowrap" }}>
            {loaded ? "✓ Sincronizado" : "Carregando…"}
          </div>
        </div>

        {/* Conteúdo da página */}
        <main className="scih-main">
          {pageMap[activePage]()}
        </main>
      </div>
    </>
  );
}
