import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import type { Json } from "@/integrations/supabase/types";

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
`;

// ─── STATIC DATA ────────────────────────────────────────────────────────────

const CHECKLISTS_DATA: Record<string, { nome: string; icon: string; grupos: { grupo: string; itens: string[] }[] }> = {
  ambulatorio: { nome: "Ambulatório", icon: "🩺", grupos: [
    { grupo: "Itens Avaliados", itens: [
      "O Ambulatório possui infraestrutura adequada para sua operacionalização?",
      "O Ambulatório possui sala para pequenos procedimentos?",
      "O Ambulatório possui expurgo?",
      "O Ambulatório possui depósito de material de limpeza (DML)?",
      "Os profissionais e acompanhantes estão identificados?",
      "O Ambulatório possui um sistema de agendamento de consultas e exames?",
      "O Ambulatório mantém os prontuários de todos pacientes disponíveis no momento da consulta?",
      "O Ambulatório possui equipamentos, acessórios, materiais e medicamentos necessários para o atendimento de emergência?",
      "O Ambulatório possui local adequado para a guarda de medicamentos controlados?",
      "O Ambulatório possui instrumento de transferência padronizado?",
      "Os equipamentos do Ambulatório possuem manutenção preventiva?",
      "O ambulatório possui insumos necessários para a higienização das mãos?",
      "O Ambulatório possui lixeiras adequadas para o descarte de resíduos?",
      "É realizado o controle de pragas no Ambulatório?",
      "O ambulatório possui um responsável técnico (RT) qualificado?",
      "O Ambulatório possui as escalas de trabalho dos profissionais atualizadas?",
      "O Ambulatório possui documentos normativos e manuais disponíveis para consulta dos profissionais?",
      "O Ambulatório divulga um canal de comunicação para reclamações, sugestões e/ou elogios?",
      "O Ambulatório possui indicadores definidos, específicos para o setor?",
    ]},
    { grupo: "Processos", itens: [
      "O Ambulatório possui um processo de confirmação de consultas ambulatoriais?",
      "No Ambulatório, os registros da equipe médica são realizados adequadamente?",
      "O processo de identificação do paciente com a pulseira de identificação está implantado?",
      "O processo de checagem da identificação antes de qualquer procedimento está implantado?",
      "A avaliação de risco de queda é realizada?",
      "Os profissionais cumprem as condutas sobre o uso de adornos, conforme NR 32?",
      "Os profissionais utilizam os equipamentos de proteção individual (EPI) de forma correta?",
      "Os profissionais têm conhecimento sobre os riscos nos locais de trabalho?",
      "O profissional tem conhecimento dos seis protocolos de segurança do paciente? (Entrevista 1)",
      "O profissional tem conhecimento dos seis protocolos de segurança do paciente? (Entrevista 2)",
      "O profissional tem conhecimento dos seis protocolos de segurança do paciente? (Entrevista 3)",
      "Os profissionais do Ambulatório notificam eventos adversos ou incidentes assistenciais?",
      "Os profissionais de enfermagem possuem conhecimento dos passos para administração de medicamentos?",
      "Os profissionais sabem identificar os medicamentos de alta vigilância?",
      "Os medicamentos multidoses em uso são identificados de acordo com a sua estabilidade?",
      "A manutenção preventiva é realizada no Ambulatório?",
      "É realizado processo de reposição e conferência diária do carro de emergência do Ambulatório?",
      "O Ambulatório possui registros de limpeza terminal e concorrente?",
      "Os profissionais do Ambulatório descartam os resíduos de forma adequada?",
      "No Ambulatório é realizada a segregação adequada dos resíduos químicos (Grupo B)?",
      "No Ambulatório é realizada a segregação adequada dos Rejeitos Perfurocortantes (Grupo E)?",
      "Os resultados dos indicadores são utilizados para estabelecer ações de melhorias?",
      "O setor apresentou o plano de ação?",
    ]},
  ]},
  uti: { nome: "UTI Adulto", icon: "🫀", grupos: [
    { grupo: "Estrutura", itens: [
      "A UTI Adulto possui infraestrutura adequada para sua operacionalização?",
      "A UTI possui expurgo?",
      "A UTI possui depósito de material de limpeza (DML)?",
      "A UTI possui equipamentos necessários para o atendimento de emergência?",
      "A UTI possui refrigerador exclusivo para armazenamento de medicamentos?",
      "A UTI possui local adequado para guarda de medicamentos controlados?",
      "Os equipamentos da UTI possuem manutenção preventiva?",
      "A UTI possui local exclusivo para a guarda de roupas limpas?",
      "A UTI possui insumos necessários para a higienização das mãos?",
      "A UTI possui lixeiras adequadas para o descarte de resíduos?",
      "É realizado o controle de pragas na UTI?",
      "A UTI possui um responsável técnico (RT) qualificado?",
      "A UTI possui um coordenador médico, de enfermagem e de fisioterapia?",
      "O dimensionamento das equipes que atuam na UTI está adequado?",
      "A UTI possui escalas de trabalho dos profissionais atualizadas?",
      "A UTI possui documentos normativos e manuais disponíveis?",
      "A UTI possui protocolos clínicos e multidisciplinares?",
      "A UTI possui manual de diluição e estabilidade de medicamentos?",
      "A UTI tem indicadores de prevenção de IRAS específicos para o setor?",
    ]},
    { grupo: "Processos", itens: [
      "A passagem de plantão está implantada na UTI?",
      "O transporte do paciente crítico é realizado com profissional de nível superior?",
      "A UTI possui a visita multidisciplinar (round) implantada?",
      "A UTI possui o plano terapêutico implantado?",
      "A UTI possui escala padronizada de gravidade/prognóstico?",
      "A UTI possui bundles implantados?",
      "A UTI identifica os pacientes em precaução específica e/ou isolamento?",
      "Na UTI os registros da equipe médica são realizados adequadamente?",
      "Na UTI os registros da equipe de enfermagem são realizados adequadamente?",
      "Na admissão os pacientes são avaliados pelo nutricionista?",
      "O processo de identificação do paciente com pulseira está implantado?",
      "O processo de checagem da identificação antes de procedimentos está implantado?",
      "A avaliação de risco de queda é realizada?",
      "A avaliação de risco de lesão por pressão é realizada?",
      "O processo de prevenção de lesão por pressão é realizado à beira leito?",
      "Os profissionais cumprem as condutas sobre uso de adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais têm conhecimento dos seis protocolos de segurança do paciente? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos de segurança do paciente? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos de segurança do paciente? (Entrevista 3)",
      "Os profissionais notificam eventos adversos ou incidentes assistenciais?",
      "Os profissionais de enfermagem conhecem os passos para administração de medicamentos?",
      "Os profissionais sabem identificar os medicamentos de alta vigilância?",
      "A manutenção preventiva é realizada na UTI?",
      "É realizado processo de reposição e conferência do carro de emergência?",
      "A UTI possui registros de limpeza terminal e concorrente?",
      "Os profissionais descartam os resíduos de forma adequada?",
      "Os resultados dos indicadores são utilizados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  cc: { nome: "Centro Cirúrgico", icon: "✂️", grupos: [
    { grupo: "Estrutura", itens: [
      "O Centro Cirúrgico possui infraestrutura adequada para sua operacionalização?",
      "O CC possui todas as salas cirúrgicas em funcionamento?",
      "O CC possui expurgo?",
      "O CC possui depósito de material de limpeza (DML)?",
      "O CC possui equipamentos necessários para o atendimento de emergência?",
      "O CC possui refrigerador exclusivo para armazenamento de medicamentos?",
      "O CC possui local adequado para guarda de medicamentos controlados?",
      "Os equipamentos do CC possuem manutenção preventiva?",
      "O CC possui insumos necessários para higienização das mãos?",
      "O CC possui lixeiras adequadas para descarte de resíduos?",
      "É realizado o controle de pragas no CC?",
      "O CC possui um responsável técnico (RT) qualificado?",
      "O CC possui escalas de trabalho dos profissionais atualizadas?",
      "O CC possui documentos normativos e manuais disponíveis?",
      "O CC possui protocolos clínicos validados pela CCIH?",
      "O CC tem indicadores específicos?",
    ]},
    { grupo: "Processos", itens: [
      "No CC os registros da equipe médica são realizados adequadamente?",
      "O processo de identificação do paciente está implantado no CC?",
      "O processo de checagem da identificação antes de procedimentos está implantado?",
      "A avaliação de risco de queda é realizada?",
      "O checklist de cirurgia segura é realizado no CC?",
      "O termo de consentimento cirúrgico é aplicado?",
      "A visita pré anestésica é realizada para cirurgias eletivas?",
      "A antibioticoprofilaxia é realizada nos pacientes cirúrgicos?",
      "O processo de demarcação de lateralidade é realizado?",
      "Os profissionais cumprem as condutas sobre uso de adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais têm conhecimento dos seis protocolos de segurança? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos de segurança? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos de segurança? (Entrevista 3)",
      "Os profissionais notificam eventos adversos ou incidentes?",
      "É realizado processo de reposição do carro de emergência?",
      "O CC possui registros de limpeza terminal e concorrente?",
      "Os profissionais descartam resíduos adequadamente?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  enfermaria: { nome: "Enfermaria", icon: "🛏️", grupos: [
    { grupo: "Estrutura", itens: [
      "A Enfermaria possui infraestrutura adequada para sua operacionalização?",
      "A Enfermaria possui expurgo?",
      "A Enfermaria possui depósito de material de limpeza (DML)?",
      "A Enfermaria possui equipamentos necessários para atendimento de emergência?",
      "A Enfermaria possui refrigerador exclusivo para armazenamento de medicamentos?",
      "A Enfermaria possui local adequado para guarda de medicamentos controlados?",
      "Os equipamentos da Enfermaria possuem manutenção preventiva?",
      "A Enfermaria possui insumos necessários para higienização das mãos?",
      "A Enfermaria possui lixeiras adequadas para descarte de resíduos?",
      "É realizado o controle de pragas na Enfermaria?",
      "A Enfermaria possui coordenador médico e/ou de enfermagem?",
      "O dimensionamento das equipes está adequado?",
      "A Enfermaria possui escalas de trabalho dos profissionais atualizadas?",
      "A Enfermaria possui documentos normativos e manuais disponíveis?",
      "A Enfermaria tem indicadores definidos?",
    ]},
    { grupo: "Processos", itens: [
      "A passagem de plantão está implantada na Enfermaria?",
      "A Enfermaria identifica pacientes com precaução específica e/ou em isolamento?",
      "Os registros da equipe médica são realizados adequadamente?",
      "Os registros da equipe de enfermagem são realizados adequadamente?",
      "O processo de identificação do paciente com pulseira está implantado?",
      "A avaliação de risco de queda é realizada?",
      "A avaliação de risco de lesão por pressão é realizada?",
      "O processo de prevenção de lesão por pressão é realizado à beira leito?",
      "Os profissionais cumprem condutas sobre adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais têm conhecimento dos seis protocolos de segurança? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos de segurança? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos de segurança? (Entrevista 3)",
      "Os profissionais notificam eventos adversos?",
      "Os profissionais conhecem os passos para administração de medicamentos?",
      "Os profissionais sabem identificar medicamentos de alta vigilância?",
      "É realizado processo de reposição do carro de emergência?",
      "A Enfermaria possui registros de limpeza terminal e concorrente?",
      "Os profissionais descartam resíduos adequadamente?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "Apresentou plano de ação?",
    ]},
  ]},
  ps: { nome: "Pronto-Socorro", icon: "🚨", grupos: [
    { grupo: "Estrutura", itens: [
      "O Pronto Socorro possui infraestrutura adequada para sua operacionalização?",
      "O PS possui protocolo de classificação de risco?",
      "O PS possui expurgo?",
      "O PS possui depósito de material de limpeza (DML)?",
      "O PS possui equipamentos necessários para atendimento de emergência?",
      "O PS possui refrigerador exclusivo para armazenamento de medicamentos?",
      "O PS possui local adequado para guarda de medicamentos controlados?",
      "Os equipamentos do PS possuem manutenção preventiva?",
      "O PS possui insumos necessários para higienização das mãos?",
      "O PS possui lixeiras adequadas para descarte de resíduos?",
      "É realizado o controle de pragas no PS?",
      "O PS possui responsável técnico (RT) qualificado?",
      "O PS possui escalas de trabalho dos profissionais atualizadas?",
      "O PS possui documentos normativos e manuais disponíveis?",
      "O PS tem indicadores definidos?",
    ]},
    { grupo: "Processos", itens: [
      "A passagem de plantão está implantada no PS?",
      "O PS identifica pacientes com precaução específica e/ou em isolamento?",
      "Os registros da equipe médica são realizados adequadamente?",
      "Os registros da equipe de enfermagem são realizados adequadamente?",
      "O processo de identificação do paciente está implantado?",
      "A avaliação de risco de queda é realizada?",
      "A avaliação de risco de lesão por pressão é realizada?",
      "Os profissionais cumprem condutas sobre adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 3)",
      "Os profissionais notificam eventos adversos?",
      "Os profissionais conhecem os passos para administração de medicamentos?",
      "É realizado processo de reposição do carro de emergência?",
      "O PS possui registros de limpeza terminal e concorrente?",
      "Os profissionais descartam resíduos adequadamente?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  cme: { nome: "CME", icon: "♨️", grupos: [
    { grupo: "Estrutura", itens: [
      "A CME possui infraestrutura adequada para sua operacionalização?",
      "A CME possui salas necessárias para sua operacionalização?",
      "A CME possui sala de desinfecção química de acordo com a legislação?",
      "O armazenamento de produtos já esterilizados é realizado de maneira adequada?",
      "Os equipamentos da CME possuem manutenção preventiva?",
      "O CME possui insumos necessários para higienização das mãos?",
      "O CME possui lixeiras adequadas para descarte de resíduos?",
      "É realizado o controle de pragas na CME?",
      "A CME possui responsável técnico (RT) qualificado?",
      "O dimensionamento das equipes está adequado?",
      "Os serviços possuem escalas de trabalho atualizadas?",
      "A CME possui documentos normativos e manuais disponíveis?",
      "O CME possui rotina de esterilização validada pela CCIH?",
      "O CME tem indicadores de controle de qualidade?",
    ]},
    { grupo: "Processos", itens: [
      "A CME monitora os processos de esterilização?",
      "A CME possui controle de dispensação e recebimento dos materiais?",
      "A CME monitora o armazenamento de instrumental processado?",
      "É realizada qualificação dos equipamentos da CME?",
      "As embalagens são identificadas de forma adequada?",
      "É realizada inspeção dos instrumentais após processo de limpeza?",
      "Os profissionais cumprem condutas sobre adornos conforme NR 32?",
      "Os profissionais da Sala de Limpeza utilizam EPI adequado?",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 3)",
      "Os profissionais notificam eventos adversos?",
      "A CME possui registros de limpeza terminal e concorrente?",
      "A CME descarta os resíduos de forma adequada?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  laboratorio: { nome: "Laboratório", icon: "🔬", grupos: [
    { grupo: "Estrutura", itens: [
      "O Laboratório possui infraestrutura adequada para sua operacionalização?",
      "O laboratório possui salas específicas conforme legislação?",
      "O Laboratório possui refrigerador exclusivo?",
      "Os equipamentos do Laboratório possuem manutenção preventiva?",
      "O Laboratório possui insumos necessários para higienização das mãos?",
      "O Laboratório possui lixeiras adequadas?",
      "É realizado o controle de pragas no laboratório?",
      "O Laboratório possui responsável técnico (RT) qualificado?",
      "O Laboratório possui documentos normativos e manuais disponíveis?",
      "O Laboratório possui Programa de Garantia da Qualidade (PGQ)?",
      "O Laboratório tem indicadores definidos?",
    ]},
    { grupo: "Processos", itens: [
      "O Laboratório gerencia as análises do Programa de Garantia da Qualidade?",
      "O Laboratório possui processo de comunicação de resultados/valores críticos?",
      "O transporte interno das amostras é realizado de forma adequada?",
      "O Laboratório possui processo de identificação do paciente conforme legislação?",
      "Os profissionais cumprem condutas sobre adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 3)",
      "Os profissionais notificam eventos adversos?",
      "O processo do controle de temperatura do refrigerador é realizado?",
      "O laboratório possui registros de limpeza terminal e concorrente?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  scih: { nome: "SCIH/CCIH", icon: "🦠", grupos: [
    { grupo: "Estrutura", itens: [
      "A CCIH possui infraestrutura necessária para sua operacionalização?",
      "A instituição possui a CCIH constituída por membros consultores e executores?",
      "A CCIH possui documentos normativos disponíveis?",
      "A CCIH possui plano anual das ações de controle de infecção?",
      "A CCIH possui diretrizes para promover a prevenção de IRAS?",
      "A CCIH possui diretrizes para o uso de antimicrobianos?",
      "A CCIH possui diretrizes relacionadas às precauções e isolamento?",
      "A CCIH possui indicadores específicos?",
    ]},
    { grupo: "Processos", itens: [
      "O SCIH realiza visita técnica nos setores seguindo cronograma formalizado?",
      "O SCIH implementa e monitora as diretrizes para prevenção de IRAS?",
      "O SCIH implementa e monitora o uso racional de antimicrobianos?",
      "O SCIH monitora os insumos para higienização das mãos?",
      "O SCIH monitora o perfil de sensibilidade e resistência dos microrganismos?",
      "O SCIH realiza busca ativa das infecções relacionadas a dispositivos invasivos?",
      "O SCIH realiza investigação epidemiológica de casos e surtos?",
      "A CCIH elabora e divulga periodicamente relatórios à direção?",
      "Os indicadores de IRAS são monitorados e divulgados para órgãos sanitários?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  nsp: { nome: "NSP", icon: "🛡️", grupos: [
    { grupo: "Estrutura e Protocolos", itens: [
      "O Núcleo de Segurança do Paciente (NSP) possui infraestrutura necessária?",
      "A instituição possui NSP constituído formalmente?",
      "O NSP possui Programa/Plano de Segurança do Paciente (PSP)?",
      "Existe fluxo de notificação de incidentes e não conformidades?",
      "A instituição possui Protocolo de Identificação do Paciente (Meta 1)?",
      "A instituição possui Protocolo de Comunicação Efetiva (Meta 2)?",
      "A instituição possui Protocolo de Segurança na Prescrição de Medicamentos (Meta 3)?",
      "A instituição possui Protocolo para Cirurgia Segura (Meta 4)?",
      "A instituição possui Protocolo de Higienização das Mãos (Meta 5)?",
      "A instituição possui Protocolo de Prevenção de Quedas (Meta 6)?",
      "A instituição possui Protocolo de Prevenção de Lesão por Pressão?",
    ]},
    { grupo: "Processos e Monitoramento", itens: [
      "O NSP gerencia o Protocolo de Identificação do Paciente?",
      "O NSP gerencia o Protocolo de Comunicação Efetiva?",
      "O NSP gerencia o Protocolo de Segurança na Prescrição e Administração?",
      "O NSP gerencia o Protocolo de Cirurgia Segura?",
      "O NSP gerencia o Protocolo de Higienização das Mãos?",
      "O NSP gerencia o Protocolo de Prevenção de Quedas?",
      "O NSP gerencia o Protocolo de Prevenção de Lesão por Pressão?",
      "O NSP realiza classificação e investigação dos incidentes?",
      "O NSP aplica pesquisa de cultura de segurança do paciente?",
      "O NSP realiza auditorias internas com instrumento padronizado?",
      "Os indicadores de eventos adversos são monitorados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  higiene: { nome: "Higiene Hospitalar", icon: "✨", grupos: [
    { grupo: "Estrutura", itens: [
      "O Serviço de Higienização hospitalar é terceirizado?",
      "O Serviço possui um profissional coordenador?",
      "Possui cronograma de limpeza conforme a legislação?",
      "Possui documentos normativos e manuais disponíveis?",
      "Os produtos saneantes estão regularizados junto à ANVISA e validados pela CCIH?",
      "O Serviço tem indicadores definidos?",
    ]},
    { grupo: "Processos", itens: [
      "Os saneantes utilizados são identificados conforme legislação?",
      "Os profissionais utilizam EPI corretamente?",
      "O Serviço disponibiliza suprimento adequado para higienização das mãos?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  nutricao: { nome: "Nutrição e Dietética", icon: "🥗", grupos: [
    { grupo: "Estrutura", itens: [
      "O Serviço de Nutrição e Dietética possui infraestrutura adequada?",
      "A UAN possui fluxo de produção unidirecional?",
      "A UAN possui equipamentos em bom estado de conservação?",
      "Os equipamentos possuem manutenção preventiva?",
      "A UAN possui insumos necessários para higienização das mãos?",
      "É realizado o controle de pragas e vetores na UAN?",
      "O Serviço possui responsável técnico (RT) qualificado?",
      "O Serviço possui documentos normativos e manuais disponíveis?",
      "O Serviço tem indicadores definidos?",
    ]},
    { grupo: "Processos", itens: [
      "O Serviço possui processo implantado para recebimento e verificação das mercadorias?",
      "Os alimentos refrigerados são acondicionados adequadamente?",
      "Na UAN o descongelamento dos alimentos é realizado sob refrigeração?",
      "Os alimentos crus são higienizados adequadamente?",
      "A UAN realiza a coleta e armazenamento de amostras das preparações?",
      "Os profissionais estão asseados e com vestimenta adequada?",
      "Os profissionais cumprem condutas sobre adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 3)",
      "Os profissionais notificam eventos adversos?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "Apresentou plano de ação?",
    ]},
  ]},
  residuos: { nome: "Programa de Resíduos", icon: "♻️", grupos: [
    { grupo: "Estrutura e Organização", itens: [
      "A instituição possui o PGRSS disponível para consulta?",
      "A instituição possui contrato para coleta e destinação dos RSS?",
      "A empresa contratada comprova licença ambiental?",
      "A instituição possui fluxos para coleta e armazenamento dos resíduos?",
      "A instituição possui responsável técnico qualificado para gestão dos RSS?",
      "O abrigo de armazenamento externo possui infraestrutura adequada?",
      "A instituição realiza coleta seletiva de materiais recicláveis?",
      "A instituição tem indicadores específicos para monitoramento do PGRSS?",
    ]},
    { grupo: "Processos", itens: [
      "O transporte interno dos RSS é realizado em coletores adequados?",
      "Os resíduos são coletados conforme legislação vigente?",
      "Na instituição é realizada a segregação adequada dos Rejeitos Radioativos (Grupo C)?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  banco_sangue: { nome: "Banco de Sangue", icon: "🩸", grupos: [
    { grupo: "Estrutura", itens: [
      "A Agência Transfusional possui infraestrutura adequada?",
      "Possui licença sanitária para funcionamento?",
      "Possui refrigerador exclusivo para armazenamento de sangue e hemoderivados?",
      "Os equipamentos possuem manutenção preventiva?",
      "Possui insumos necessários para higienização das mãos?",
      "Possui lixeiras adequadas para descarte de resíduos?",
      "Possui um médico responsável técnico (RT) qualificado?",
      "Possui supervisão técnica?",
      "Possui documentos normativos e manuais disponíveis?",
      "Possui indicadores definidos?",
    ]},
    { grupo: "Processos", itens: [
      "As informações da requisição para transfusão estão adequadas?",
      "Há identificação correta das bolsas de hemoderivados?",
      "A Agência realiza os exames de compatibilidade sanguínea?",
      "O transporte de hemoderivados é realizado de acordo com a legislação?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 3)",
      "Os profissionais notificam eventos adversos?",
      "A Agência possui registros de limpeza terminal e concorrente?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  roupas: { nome: "Proc. de Roupas", icon: "👕", grupos: [
    { grupo: "Estrutura", itens: [
      "O Setor de Processamento de Roupas possui um profissional responsável?",
      "Os equipamentos possuem manutenção preventiva?",
      "Disponibiliza insumos para higienização das mãos?",
      "Processa exclusivamente roupas hospitalares?",
      "Possui enxoval suficiente e controle de reposição?",
      "Possui documentos normativos e manuais disponíveis?",
      "Tem indicadores definidos?",
    ]},
    { grupo: "Processos", itens: [
      "Os profissionais utilizam EPI e EPC adequados?",
      "O transporte da roupa suja é realizado de forma adequada?",
      "O Setor realiza controle de qualidade dos enxovais?",
      "Possui controle de entrada e saída do enxoval?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  diagnostico: { nome: "Serv. de Diagnóstico", icon: "🩻", grupos: [
    { grupo: "Estrutura", itens: [
      "O Serviço de Diagnóstico por Imagem possui infraestrutura adequada?",
      "O Serviço possui expurgo?",
      "Os equipamentos para investigação diagnóstica estão disponíveis?",
      "Os equipamentos possuem manutenção preventiva?",
      "Possui insumos necessários para higienização das mãos?",
      "Possui Supervisor de Proteção Radiológica (SPR)?",
      "Possui escalas de trabalho dos profissionais atualizadas?",
      "Possui programa de proteção radiológica?",
      "São fornecidos dosímetros individuais para profissionais?",
      "O Serviço tem indicadores definidos?",
    ]},
    { grupo: "Processos", itens: [
      "Os exames realizados são fornecidos com laudo?",
      "O Serviço possui controle radiométrico das áreas?",
      "O processo de identificação do paciente está implantado?",
      "Os profissionais cumprem condutas sobre adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 1)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 2)",
      "Os profissionais têm conhecimento dos seis protocolos? (Entrevista 3)",
      "Os profissionais notificam eventos adversos?",
      "O Serviço possui registros de limpeza terminal e concorrente?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  necrotério: { nome: "Necrotério", icon: "🏛️", grupos: [
    { grupo: "Estrutura e Processos", itens: [
      "O Necrotério possui infraestrutura adequada?",
      "Os equipamentos possuem manutenção preventiva?",
      "Possui insumos necessários para higienização das mãos?",
      "Possui sala de preparo adequada conforme legislação?",
      "Possui câmara fria ligada ao gerador de energia?",
      "Possui documentos normativos e manuais disponíveis?",
      "O processo de identificação do cadáver está implantado?",
      "Os profissionais utilizam EPI corretamente?",
      "O descarte de resíduos é realizado de forma adequada?",
      "O Necrotério possui controle de entrada e saída de cadáver?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  equipamentos: { nome: "Equipamentos Médicos", icon: "⚕️", grupos: [
    { grupo: "Estrutura e Processos", itens: [
      "A instituição possui inventário atualizado de todos os EMH?",
      "Os EMH possuem registro junto à ANVISA?",
      "O serviço possui processo de registro com etiquetas de manutenção preventiva?",
      "Os equipamentos possuem cronograma de manutenção preventiva?",
      "Os cilindros da central de gases estão armazenados corretamente?",
      "O serviço possui documentos normativos e manuais disponíveis?",
      "O serviço tem indicadores de controle da qualidade dos equipamentos?",
      "Todos os EMH estão com manutenção preventiva vigente?",
      "Os equipamentos fora de uso estão segregados em local adequado?",
      "Os profissionais recebem treinamento para operar os equipamentos?",
      "É realizado processo de reposição dos materiais dos carros de emergência?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  incendio: { nome: "Seg. Contra Incêndios", icon: "🔥", grupos: [
    { grupo: "Estrutura e Processos", itens: [
      "A instituição possui rede de hidrantes?",
      "Possui extintores de incêndio classe A, B e C?",
      "Os extintores são inspecionados regularmente?",
      "Possui detectores de fumaça?",
      "Possui mapas de rotas de fuga para evacuação?",
      "Possui portas corta-fogo para saída de emergência?",
      "Possui sinalização e luminárias de emergência?",
      "Possui alvará do Corpo de Bombeiros (AVCB)?",
      "Possui Programa de Prevenção e Controle de Incêndio (PPCI)?",
      "A instituição realiza simulação de abandono em caso de incêndio?",
      "Os profissionais recebem treinamento sobre combate a incêndio?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  ped_int: { nome: "Pediatria Internação", icon: "👶", grupos: [
    { grupo: "Estrutura e Processos", itens: [
      "A Unidade de Pediatria possui infraestrutura adequada?",
      "A unidade possui expurgo?",
      "A unidade possui equipamentos para atendimento de emergência pediátrica?",
      "A unidade possui insumos necessários para higienização das mãos?",
      "A unidade possui responsável técnico (RT) qualificado?",
      "A unidade possui escalas de trabalho atualizadas?",
      "A unidade possui protocolos clínicos pediátricos?",
      "A unidade tem indicadores definidos?",
      "A passagem de plantão está implantada?",
      "O processo de identificação do paciente com pulseira está implantado?",
      "A avaliação de risco de queda para pacientes pediátricos é realizada?",
      "Os profissionais cumprem condutas sobre adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais notificam eventos adversos?",
      "Os profissionais têm conhecimento dos seis protocolos de segurança?",
      "A unidade possui registros de limpeza terminal e concorrente?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
  ped_em: { nome: "Pediatria Emergência", icon: "🏃", grupos: [
    { grupo: "Estrutura e Processos", itens: [
      "A Pediatria de Emergência possui infraestrutura adequada?",
      "A unidade possui protocolo de classificação de risco pediátrico?",
      "A unidade possui equipamentos para atendimento de emergência pediátrica?",
      "A unidade possui insumos necessários para higienização das mãos?",
      "A unidade possui responsável técnico (RT) qualificado?",
      "A unidade possui escalas de trabalho atualizadas?",
      "A unidade tem indicadores definidos?",
      "O processo de identificação do paciente com pulseira está implantado?",
      "A avaliação de risco de queda pediátrico é realizada?",
      "Os profissionais cumprem condutas sobre adornos conforme NR 32?",
      "Os profissionais utilizam EPI corretamente?",
      "Os profissionais notificam eventos adversos?",
      "Os profissionais têm conhecimento dos seis protocolos de segurança?",
      "A unidade possui registros de limpeza terminal e concorrente?",
      "Os resultados dos indicadores são usados para ações de melhoria?",
      "O setor apresentou plano de ação?",
    ]},
  ]},
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
interface AuditRecord { id?: string; setorKey: string; setorNome: string; pct: number; ncCount: number; data: string; tipo: string; auditor: string; respSetor: string; total: number; }
interface NC { id?: string; setorKey: string; setor: string; pergunta: string; obs: string; sev: "Crítica" | "Maior" | "Menor"; status: string; data: string; historico?: {status:string;obs:string;data:string}[]; }
interface Plan5W2H { id?: string; what: string; why: string; where: string; when: string; who: string; how: string; howmuch: string; status: string; }
interface KanbanCard { id?: string; title: string; setor: string; prio: string; prazo: string; col: string; }
interface RiskItem { id?: string; desc: string; prob: number; imp: number; setor: string; plano: string; }
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
        { hospital_id: hospitalId, data: newData as unknown as Json, updated_at: new Date().toISOString() },
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

  // ── checklist state ──
  const [ckSetor, setCkSetor] = useState<string>("scih");
  const [ckStates, setCkStates] = useState<Record<string,CkState>>({});
  const [ckAuditor, setCkAuditor] = useState("");
  const [ckResp, setCkResp] = useState("");
  const [ckTipo, setCkTipo] = useState("Programada");

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

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  function finalizeAudit() {
    const { total, conf, nc, pct } = computeChecklist();
    if (total === 0) { alert("Responda ao menos um item antes de finalizar."); return; }
    const setor = CHECKLISTS_DATA[ckSetor];
    const record: AuditRecord = {
      id: uid(), setorKey: ckSetor, setorNome: setor.nome, pct, ncCount: nc,
      data: today(), tipo: ckTipo, auditor: ckAuditor || "—", respSetor: ckResp || "—", total: conf,
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
    alert(`Auditoria finalizada! Conformidade: ${pct}% | NCs geradas: ${newNCs.length}`);
    setActivePage("auditorias");
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
                    <span style={{ fontSize: 12, color:"var(--text2)" }}>{v.icon} {v.nome}</span>
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
                <div className="scih-sector-icon">{v.icon}</div>
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
          <button className="scih-btn scih-btn-teal" onClick={finalizeAudit}>Finalizar Auditoria</button>
        </div>

        <div className="scih-card scih-mb">
          <div className="scih-form-grid" style={{ marginBottom:12 }}>
            <div>
              <label className="scih-label">Setor</label>
              <select className="scih-select" style={{ width:"100%" }} value={ckSetor} onChange={e => { setCkSetor(e.target.value); setCkStates({}); }}>
                {Object.entries(CHECKLISTS_DATA).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.nome}</option>)}
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
            <table className="scih-table">
              <thead>
                <tr><th>Setor</th><th>Data</th><th>Tipo</th><th>Auditor</th><th>Conformidade</th><th>NCs</th></tr>
              </thead>
              <tbody>
                {appData.historico.length === 0 && <tr><td colSpan={6} style={{ textAlign:"center", color:"var(--text2)", padding:24 }}>Nenhuma auditoria registrada.</td></tr>}
                {appData.historico.map(h => (
                  <tr key={h.id}>
                    <td>{h.setorNome}</td>
                    <td style={{ fontSize:12, color:"var(--text2)" }}>{h.data}</td>
                    <td style={{ fontSize:12 }}>{h.tipo}</td>
                    <td style={{ fontSize:12, color:"var(--text2)" }}>{h.auditor}</td>
                    <td>
                      <span style={{ color: barColor(h.pct), fontWeight:600 }}>{h.pct}%</span>
                    </td>
                    <td><span className="scih-badge sp-low">{h.ncCount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderCronograma() {
    return (
      <div>
        <div className="scih-row scih-mb">
          <div>
            <div className="scih-page-title">Cronograma de Auditorias</div>
            <div className="scih-page-sub">Gerencie os agendamentos de visitas e auditorias</div>
          </div>
          <button className="scih-btn scih-btn-teal" onClick={() => setShowCronoModal(true)}>+ Agendar</button>
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
                <div style={{ fontWeight:600, fontSize:14 }}>{p.what || "(Sem título)"}</div>
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
                    value={(planForm as Record<string,string>)[fld as string]}
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
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:6 }}>{card.title}</div>
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
              <tr><th>Setor</th><th>Última Auditoria</th><th>Conformidade</th><th>NCs</th><th>Status</th></tr>
            </thead>
            <tbody>
              {Object.entries(CHECKLISTS_DATA).map(([k,v]) => {
                const lastAudit = appData.historico.find(h => h.setorKey === k);
                const pct = lastAudit?.pct ?? 0;
                return (
                  <tr key={k}>
                    <td>{v.icon} {v.nome}</td>
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
