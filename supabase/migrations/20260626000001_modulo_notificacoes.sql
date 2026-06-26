-- ─────────────────────────────────────────────────────────────────────────────
-- Módulo de Notificações ANVISA/PLACON
-- ─────────────────────────────────────────────────────────────────────────────

-- 0. CNPJ no cadastro de hospitais (caso ainda não exista)
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS cnpj text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. notification_types — catálogo de modelos de notificação
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_types (
  id            text PRIMARY KEY,
  hospital_id   uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  descricao     text,
  fonte         text NOT NULL DEFAULT 'ANVISA',
  anvisa_id     text,
  paradigma     text NOT NULL CHECK (paradigma IN ('agregado','caso')),
  prefixo       text NOT NULL,
  schema        jsonb NOT NULL DEFAULT '{}',
  visivel_para  jsonb NOT NULL DEFAULT '{"hospital_types":["all"]}',
  icon_name     text NOT NULL DEFAULT 'Bell',
  ordem         int NOT NULL DEFAULT 0,
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;

-- Tipos globais (hospital_id IS NULL) visíveis para todos; tipos de hospital só para membros
CREATE POLICY "notif_types_select"
ON public.notification_types FOR SELECT TO authenticated
USING (
  hospital_id IS NULL
  OR hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
);

CREATE POLICY "notif_types_all_admin"
ON public.notification_types FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_notif_types_hospital ON public.notification_types(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notif_types_ativo ON public.notification_types(ativo) WHERE ativo = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. notifications — registros de notificação
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  type_id          text NOT NULL REFERENCES public.notification_types(id),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero           text,
  setor            text,
  mes_vigilancia   text,
  ano_vigilancia   int NOT NULL DEFAULT extract(year from current_date)::int,
  data_evento      date NOT NULL DEFAULT current_date,
  paciente_nome    text,
  microrganismo    text,
  inputs           jsonb NOT NULL DEFAULT '{}',
  calculated       jsonb NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'rascunho'
                     CHECK (status IN ('rascunho','finalizada','retificada','cancelada')),
  pdf_path         text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  finalized_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notif_hospital    ON public.notifications(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notif_type        ON public.notifications(type_id);
CREATE INDEX IF NOT EXISTS idx_notif_periodo     ON public.notifications(ano_vigilancia, mes_vigilancia);
CREATE INDEX IF NOT EXISTS idx_notif_status      ON public.notifications(status);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select"
ON public.notifications FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "notifications_insert"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "notifications_update"
ON public.notifications FOR UPDATE TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "notifications_delete"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'rascunho');

CREATE POLICY "notifications_superadmin"
ON public.notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. notification_history — histórico de ações
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  action          text NOT NULL,
  changed_by      uuid REFERENCES auth.users(id),
  snapshot        jsonb,
  observacao      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_hist_notif ON public.notification_history(notification_id);

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_hist_select"
ON public.notification_history FOR SELECT TO authenticated
USING (
  notification_id IN (
    SELECT id FROM public.notifications
    WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
  )
);

CREATE POLICY "notif_hist_insert"
ON public.notification_history FOR INSERT TO authenticated
WITH CHECK (
  notification_id IN (
    SELECT id FROM public.notifications
    WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger de numeração e updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gen_notification_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prefixo text;
  v_ano     int;
  v_seq     int;
BEGIN
  NEW.updated_at := now();

  IF NEW.numero IS NOT NULL AND trim(NEW.numero) != '' THEN
    RETURN NEW;
  END IF;

  SELECT nt.prefixo INTO v_prefixo
  FROM public.notification_types nt
  WHERE nt.id = NEW.type_id;

  v_ano := COALESCE(NEW.ano_vigilancia, extract(year from current_date)::int);

  SELECT COALESCE(MAX(
    CASE
      WHEN numero ~ ('^' || COALESCE(v_prefixo, 'NOT') || '-[0-9]+-[0-9]+$')
      THEN (regexp_match(numero, '-([0-9]+)$'))[1]::int
      ELSE 0
    END
  ), 0) + 1 INTO v_seq
  FROM public.notifications
  WHERE hospital_id = NEW.hospital_id
    AND ano_vigilancia = v_ano;

  NEW.numero := COALESCE(v_prefixo, 'NOT') || '-' || v_ano || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_numero ON public.notifications;
CREATE TRIGGER trg_notification_numero
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.gen_notification_numero();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seeds — 6 modelos de notificação (tipos globais, hospital_id NULL)
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. ISC
INSERT INTO public.notification_types
  (id, nome, descricao, fonte, anvisa_id, paradigma, prefixo, icon_name, ordem, visivel_para, schema)
VALUES (
  'anvisa_cc_co',
  'Infecção de Sítio Cirúrgico (ISC) 2026',
  'Vigilância de ISC por procedimento cirúrgico - ANVISA #831482',
  'ANVISA', '831482', 'agregado', 'ISC', 'Scissors', 1,
  '{"hospital_types":["all"]}',
  '{
    "blocos": [
      {
        "id": "notificador",
        "titulo": "Dados do Notificador",
        "campos": [
          {"key":"email","label":"E-mail institucional","tipo":"email","obrigatorio":true},
          {"key":"notificante","label":"Nome completo do responsável pela notificação","tipo":"text","obrigatorio":true,"mapeia":"notificante"},
          {"key":"telefone","label":"Telefone do setor","tipo":"tel","mascara":"(00) 00000-0000","obrigatorio":true}
        ]
      },
      {
        "id": "institucional",
        "titulo": "Identificação do Serviço de Saúde",
        "auto_preenche_do_hospital": true,
        "campos": [
          {"key":"estado","label":"Estado","tipo":"select_uf","origem":"hospital.state","obrigatorio":true},
          {"key":"cnpj","label":"CNPJ","tipo":"text","mascara":"00.000.000/0000-00","origem":"hospital.cnpj","obrigatorio":true},
          {"key":"possui_uti","label":"O serviço possui leitos de UTI (adulto/ped/neo)?","tipo":"sim_nao","obrigatorio":true}
        ]
      },
      {
        "id": "vigilancia",
        "titulo": "Dados da Notificação",
        "campos": [
          {"key":"ano","label":"Ano","tipo":"select_ano","obrigatorio":true,"mapeia":"ano_vigilancia"},
          {"key":"mes","label":"Mês de referência","tipo":"select_mes","obrigatorio":true,"mapeia":"mes_vigilancia"},
          {"key":"procedimentos","label":"Tipos de procedimento que o serviço realiza","tipo":"multiselect","obrigatorio":true,
            "opcoes":["Cirurgia com implante mamário","Parto cirúrgico cesariana","Artroplastia total de quadril primária","Artroplastia de joelho primária","Cirurgia cardíaca","Cirurgia neurológica"]}
        ]
      },
      {
        "id": "procedimentos_isc",
        "titulo": "Vigilância por Procedimento",
        "repeat_por": "procedimentos",
        "bloco_repetivel": {
          "campos": [
            {"key":"realizado_no_mes","label":"Procedimento realizado no mês de vigilância?","tipo":"sim_nao","obrigatorio":true},
            {"key":"vigilancia_realizada","label":"Foi realizada vigilância desse procedimento no mês?","tipo":"sim_nao","obrigatorio":true},
            {"key":"isc_incisional","label":"ISC incisional (superficial/profunda) - numerador","tipo":"int","obrigatorio":true},
            {"key":"isc_orgao_cavidade","label":"ISC órgão/cavidade - numerador","tipo":"int","obrigatorio":true},
            {"key":"total_cirurgias","label":"Nº total de cirurgias do procedimento no período - denominador","tipo":"int","obrigatorio":true,"preencher_de":"surgeries.total_por_tipo"},
            {"key":"vig_pos_alta","label":"Fez vigilância pós-alta?","tipo":"sim_nao","obrigatorio":true},
            {"key":"tipo_vig_pos_alta","label":"Tipo de vigilância pós-alta","tipo":"multiselect","depende_de":"vig_pos_alta == Sim",
              "opcoes":["Ligação telefônica","Ambulatório de egressos","E-mail","WhatsApp","Revisão de prontuários","Outra"]},
            {"key":"qtd_vig_pos_alta","label":"Em quantas cirurgias foi feita vigilância pós-alta","tipo":"int","depende_de":"vig_pos_alta == Sim"}
          ],
          "validacoes": [
            {"regra":"total_cirurgias > (isc_incisional + isc_orgao_cavidade)","msg":"Nº de cirurgias não pode ser menor ou igual ao nº de infecções."}
          ]
        }
      }
    ],
    "indicadores": [
      {"key":"tx_isc","label":"Taxa de ISC por procedimento","formula":"(isc_incisional + isc_orgao_cavidade) / total_cirurgias * 100","unidade":"%","por_instancia":true}
    ]
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, schema = EXCLUDED.schema, ativo = true;

-- 5b. UTI Adulto
INSERT INTO public.notification_types
  (id, nome, descricao, fonte, anvisa_id, paradigma, prefixo, icon_name, ordem, visivel_para, schema)
VALUES (
  'anvisa_uti_adulto',
  'UTI Adulto (IRAS/RAM) 2026',
  'Vigilância de IRAS e resistência antimicrobiana em UTI Adulto - ANVISA #399223',
  'ANVISA', '399223', 'agregado', 'UTIA', 'Activity', 2,
  '{"hospital_types":["all"]}',
  '{
    "blocos": [
      {
        "id": "notificador",
        "titulo": "Dados do Notificador",
        "campos": [
          {"key":"email","label":"E-mail institucional","tipo":"email","obrigatorio":true},
          {"key":"telefone","label":"Telefone do setor","tipo":"tel","mascara":"(00) 00000-0000","obrigatorio":true},
          {"key":"notificante","label":"Nome completo do responsável","tipo":"text","obrigatorio":true,"mapeia":"notificante"}
        ]
      },
      {
        "id": "institucional",
        "titulo": "Dados Institucionais",
        "auto_preenche_do_hospital": true,
        "campos": [
          {"key":"estado","label":"Estado","tipo":"select_uf","origem":"hospital.state","obrigatorio":true},
          {"key":"cnpj","label":"CNPJ","tipo":"text","mascara":"00.000.000/0000-00","origem":"hospital.cnpj","obrigatorio":true}
        ]
      },
      {
        "id": "vigilancia",
        "titulo": "Dados da Notificação",
        "campos": [
          {"key":"ano","label":"Ano","tipo":"select_ano","obrigatorio":true,"mapeia":"ano_vigilancia"},
          {"key":"mes","label":"Mês de referência","tipo":"select_mes","obrigatorio":true,"mapeia":"mes_vigilancia"},
          {"key":"tipos_uti","label":"Tipos de UTI adulto monitoradas no mês","tipo":"multiselect","obrigatorio":true,
            "opcoes":["UTI Geral","UTI Cirúrgica","UTI Cardiológica"]}
        ]
      },
      {
        "id": "vigilancia_uti",
        "titulo": "Vigilância das IRAS por tipo de UTI",
        "repeat_por": "tipos_uti",
        "bloco_repetivel": {
          "campos": [
            {"key":"paciente_dia","label":"Paciente-dia no mês","tipo":"int","obrigatorio":true,"preencher_de":"patient_devices.paciente_dia"},
            {"key":"infeccoes_monitoradas","label":"Infecções monitoradas","tipo":"multiselect",
              "opcoes":["IPCSL-CC","ITU-AC","PAV"]},
            {"key":"ipcsl_casos","label":"Nº de IPCSL-CC","tipo":"int","depende_de":"infeccoes_monitoradas contém IPCSL-CC"},
            {"key":"cvc_dia","label":"Cateter central-dia","tipo":"int","preencher_de":"patient_devices.cvc_dia","depende_de":"infeccoes_monitoradas contém IPCSL-CC"},
            {"key":"itu_casos","label":"Nº de ITU-AC","tipo":"int","depende_de":"infeccoes_monitoradas contém ITU-AC"},
            {"key":"cvd_dia","label":"Cateter vesical de demora-dia","tipo":"int","preencher_de":"patient_devices.cvd_dia","depende_de":"infeccoes_monitoradas contém ITU-AC"},
            {"key":"pav_casos","label":"Nº de PAV","tipo":"int","depende_de":"infeccoes_monitoradas contém PAV"},
            {"key":"vm_dia","label":"Ventilação mecânica-dia","tipo":"int","preencher_de":"patient_devices.vm_dia","depende_de":"infeccoes_monitoradas contém PAV"}
          ],
          "validacoes": [
            {"regra":"cvc_dia >= ipcsl_casos","msg":"CVC-dia não pode ser menor que IPCSL-CC."},
            {"regra":"cvd_dia >= itu_casos","msg":"CVD-dia não pode ser menor que ITU-AC."},
            {"regra":"vm_dia >= pav_casos","msg":"VM-dia não pode ser menor que PAV."}
          ]
        }
      },
      {
        "id": "checklist_cvc",
        "titulo": "Checklist de Inserção de Cateter Central",
        "campos": [
          {"key":"cvc_inseridos","label":"Nº total de CVC inserido na UTI no período","tipo":"int","obrigatorio":true},
          {"key":"cvc_checklist_aplicado","label":"Nº de CVC com checklist no momento da inserção","tipo":"int","obrigatorio":true},
          {"key":"cvc_checklist_100","label":"Nº de CVC com checklist 100% conforme","tipo":"int","obrigatorio":true}
        ],
        "validacoes": [
          {"regra":"cvc_inseridos >= cvc_checklist_aplicado","msg":"CVC inserido deve ser >= checklists aplicados."},
          {"regra":"cvc_checklist_aplicado >= cvc_checklist_100","msg":"Checklists aplicados devem ser >= 100% conforme."}
        ]
      },
      {
        "id": "ram",
        "titulo": "Resistência aos Antimicrobianos",
        "campos": [
          {"key":"analise_micro_15dias","label":"Realizadas análises microbiológicas por mais de 15 dias no mês?","tipo":"sim_nao","obrigatorio":true},
          {"key":"micro_ipcsl","label":"Microrganismos identificados em IPCSL-CC","tipo":"matriz_ram","preencher_de":"antibiogram_results",
            "opcoes_microrganismo":["Candida spp.","Citrobacter spp.","Complexo Acinetobacter baumannii-calcoaceticus","Complexo Burkholderia cepacia","Enterobacter spp.","Enterococcus faecalis","Enterococcus faecium","Escherichia coli","Klebsiella pneumoniae complexo","Klebsiella aerogenes","Pseudomonas aeruginosa","Serratia spp.","Staphylococcus aureus","Staphylococcus coagulase negativo","Stenotrophomonas maltophilia","Microrganismo não listado","Não se aplica (IPCSL=0)"],
            "subcampos":["isolados","testados","resistentes"]},
          {"key":"micro_itu","label":"Microrganismos identificados em ITU-AC","tipo":"matriz_ram","preencher_de":"antibiogram_results",
            "opcoes_microrganismo":["Complexo Acinetobacter baumannii-calcoaceticus","Complexo Klebsiella pneumoniae","Enterobacter spp.","Enterococcus faecalis","Enterococcus faecium","Escherichia coli","Proteus spp.","Pseudomonas aeruginosa","Serratia spp.","Microrganismo não listado","Não se aplica (ITU-AC=0)"],
            "subcampos":["isolados","testados","resistentes"]}
        ]
      }
    ],
    "indicadores": [
      {"key":"di_ipcsl","label":"DI IPCSL-CC","formula":"sum(ipcsl_casos)/sum(cvc_dia)*1000","unidade":"por 1.000 CVC-dia"},
      {"key":"di_itu","label":"DI ITU-AC","formula":"sum(itu_casos)/sum(cvd_dia)*1000","unidade":"por 1.000 CVD-dia"},
      {"key":"di_pav","label":"DI PAV","formula":"sum(pav_casos)/sum(vm_dia)*1000","unidade":"por 1.000 VM-dia"},
      {"key":"tx_uso_cvc","label":"Taxa utilização CVC","formula":"sum(cvc_dia)/sum(paciente_dia)","unidade":"razão"},
      {"key":"tx_uso_cvd","label":"Taxa utilização CVD","formula":"sum(cvd_dia)/sum(paciente_dia)","unidade":"razão"},
      {"key":"tx_uso_vm","label":"Taxa utilização VM","formula":"sum(vm_dia)/sum(paciente_dia)","unidade":"razão"},
      {"key":"tx_adesao_checklist","label":"Adesão ao checklist CVC","formula":"cvc_checklist_aplicado/cvc_inseridos*100","unidade":"%"},
      {"key":"tx_conformidade_checklist","label":"Conformidade 100% checklist","formula":"cvc_checklist_100/cvc_checklist_aplicado*100","unidade":"%"}
    ]
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, schema = EXCLUDED.schema, ativo = true;

-- 5c. UTI Neonatal
INSERT INTO public.notification_types
  (id, nome, descricao, fonte, anvisa_id, paradigma, prefixo, icon_name, ordem, visivel_para, schema)
VALUES (
  'anvisa_uti_neo',
  'UTI Neonatal (IRAS/RAM) 2026',
  'Vigilância de IRAS e resistência em UTI Neonatal por faixa de peso - ANVISA #914149',
  'ANVISA', '914149', 'agregado', 'UTIN', 'Baby', 3,
  '{"hospital_types":["maternidade","materno_infantil"]}',
  '{
    "blocos": [
      {
        "id": "notificador",
        "titulo": "Dados do Notificador",
        "campos": [
          {"key":"notificante","label":"Nome completo do responsável","tipo":"text","obrigatorio":true,"mapeia":"notificante"},
          {"key":"email","label":"E-mail institucional","tipo":"email","obrigatorio":true},
          {"key":"telefone","label":"Telefone do setor","tipo":"tel","mascara":"(00) 00000-0000","obrigatorio":true}
        ]
      },
      {
        "id": "institucional",
        "titulo": "Dados Institucionais",
        "auto_preenche_do_hospital": true,
        "campos": [
          {"key":"estado","label":"Estado","tipo":"select_uf","origem":"hospital.state","obrigatorio":true},
          {"key":"cnpj","label":"CNPJ","tipo":"text","mascara":"00.000.000/0000-00","origem":"hospital.cnpj","obrigatorio":true}
        ]
      },
      {
        "id": "vigilancia",
        "titulo": "Dados da Notificação",
        "campos": [
          {"key":"ano","label":"Ano","tipo":"select_ano","obrigatorio":true,"mapeia":"ano_vigilancia"},
          {"key":"mes","label":"Mês de referência","tipo":"select_mes","obrigatorio":true,"mapeia":"mes_vigilancia"}
        ]
      },
      {
        "id": "checklist_cvc",
        "titulo": "Checklist de Inserção de Cateter Central",
        "campos": [
          {"key":"cvc_inseridos","label":"Nº total de cateter central inserido na UTI no período","tipo":"int","obrigatorio":true},
          {"key":"cvc_checklist_aplicado","label":"Nº de CVC inserido com checklist no momento da inserção","tipo":"int","obrigatorio":true},
          {"key":"cvc_checklist_100","label":"Nº de CVC inserido com checklist 100% conforme","tipo":"int","obrigatorio":true}
        ],
        "validacoes": [
          {"regra":"cvc_inseridos >= cvc_checklist_aplicado","msg":"Nº de CVC inserido não pode ser menor que o nº de checklists aplicados."},
          {"regra":"cvc_checklist_aplicado >= cvc_checklist_100","msg":"Nº de checklists aplicados não pode ser menor que o de 100% conforme."}
        ]
      },
      {
        "id": "faixas_peso",
        "titulo": "Vigilância UTI Neonatal por Faixa de Peso ao Nascer",
        "seletor": {
          "key": "faixas_monitoradas",
          "label": "Selecione as faixas de peso ao nascer presentes na UTI Neonatal no período",
          "tipo": "multiselect",
          "opcoes": ["Menor que 750g","750g a 999g","1000g a 1499g","1500g a 2499g","Maior ou igual a 2500g"]
        },
        "repeat_por": "faixas_monitoradas",
        "bloco_repetivel": {
          "campos": [
            {"key":"tipos_infeccao","label":"Tipos de infecção monitoradas","tipo":"multiselect","opcoes":["IPCS","PAV"]},
            {"key":"paciente_dia","label":"Paciente-dia","tipo":"int","obrigatorio":true,"preencher_de":"patient_devices.paciente_dia"},
            {"key":"ipcs_tipo","label":"Tipo de IPCS","tipo":"multiselect","opcoes":["IPCSC (clínica, sem microrganismo)","IPCSL (laboratorial, com microrganismo)"],"depende_de":"tipos_infeccao contém IPCS"},
            {"key":"cvc_dia","label":"Pacientes com cateter central-dia","tipo":"int","preencher_de":"patient_devices.cvc_dia","depende_de":"tipos_infeccao contém IPCS"},
            {"key":"ipcsl_casos","label":"Nº de IPCSL no período","tipo":"int","depende_de":"ipcs_tipo contém IPCSL"},
            {"key":"pav_casos","label":"Nº de PAV (casos novos)","tipo":"int","depende_de":"tipos_infeccao contém PAV"},
            {"key":"vm_dia","label":"Ventilação mecânica-dia","tipo":"int","preencher_de":"patient_devices.vm_dia","depende_de":"tipos_infeccao contém PAV"}
          ],
          "validacoes": [
            {"regra":"vm_dia > pav_casos","msg":"Nº de PAV não pode ser maior ou igual ao de ventilação mecânica-dia."},
            {"regra":"cvc_dia >= ipcsl_casos","msg":"Nº de CVC-dia não pode ser menor que o de IPCSL."}
          ]
        }
      }
    ],
    "indicadores": [
      {"key":"di_ipcsl","label":"DI IPCSL","formula":"sum(ipcsl_casos)/sum(cvc_dia)*1000","unidade":"por 1.000 CVC-dia"},
      {"key":"di_pav","label":"DI PAV","formula":"sum(pav_casos)/sum(vm_dia)*1000","unidade":"por 1.000 VM-dia"},
      {"key":"tx_uso_cvc","label":"Taxa utilização CVC","formula":"sum(cvc_dia)/sum(paciente_dia)","unidade":"razão"},
      {"key":"tx_uso_vm","label":"Taxa utilização VM","formula":"sum(vm_dia)/sum(paciente_dia)","unidade":"razão"},
      {"key":"tx_adesao_checklist","label":"Adesão ao checklist CVC","formula":"cvc_checklist_aplicado/cvc_inseridos*100","unidade":"%"},
      {"key":"tx_conformidade_checklist","label":"Conformidade 100% checklist","formula":"cvc_checklist_100/cvc_checklist_aplicado*100","unidade":"%"}
    ]
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, schema = EXCLUDED.schema, ativo = true;

-- 5d. Surtos
INSERT INTO public.notification_types
  (id, nome, descricao, fonte, anvisa_id, paradigma, prefixo, icon_name, ordem, visivel_para, schema)
VALUES (
  'anvisa_surtos',
  'Notificação Nacional de Surtos Infecciosos 2026',
  'Notificação obrigatória de surtos infecciosos por microrganismo - ANVISA #742771',
  'ANVISA', '742771', 'caso', 'SURTO', 'AlertTriangle', 4,
  '{"hospital_types":["all"]}',
  '{
    "blocos": [
      {
        "id": "notificador",
        "titulo": "Dados do Notificador",
        "campos": [
          {"key":"notificante","label":"Responsável pela notificação","tipo":"text","obrigatorio":true,"mapeia":"notificante"},
          {"key":"telefone","label":"Telefone para contato","tipo":"tel","mascara":"(00) 00000-0000","obrigatorio":true},
          {"key":"email","label":"E-mail de contato","tipo":"email","obrigatorio":true}
        ]
      },
      {
        "id": "local",
        "titulo": "Dados do Local do Evento",
        "campos": [
          {"key":"origem","label":"Local de origem do evento/surto","tipo":"select","obrigatorio":true,
            "opcoes":["Próprio serviço de saúde","Outro local (outro serviço, consultório, clínica etc.)"]},
          {"key":"nome_servico","label":"Nome do serviço de saúde","tipo":"text","obrigatorio":true},
          {"key":"uf","label":"UF onde ocorreu o evento","tipo":"select_uf","obrigatorio":true},
          {"key":"cnes_cnpj","label":"CNES ou CNPJ do serviço","tipo":"text","obrigatorio":true,"origem":"hospital.cnes"}
        ]
      },
      {
        "id": "identificacao_evento",
        "titulo": "Identificação do Evento",
        "campos": [
          {"key":"tem_microrganismo","label":"Há microrganismo identificado?","tipo":"select","opcoes":["SIM","NÃO"],"obrigatorio":true},
          {"key":"qtd_microrganismos","label":"Quantos microrganismos diferentes (espécies)?","tipo":"select","opcoes":["1","2","3"],"depende_de":"tem_microrganismo == SIM"},
          {"key":"microrganismo","label":"Microrganismo envolvido","tipo":"select","mapeia":"microrganismo","depende_de":"tem_microrganismo == SIM",
            "opcoes":["Adenovírus","Candida spp.","Candida auris","Citrobacter spp.","Clostridioides difficile","Complexo Acinetobacter baumannii-calcoaceticus","Complexo Burkholderia cepacia","Enterobacter spp.","Enterococcus faecalis","Enterococcus faecium","Escherichia coli","Klebsiella pneumoniae complexo","Micobactéria de crescimento rápido (MCR/MNT)","Pseudomonas aeruginosa","SARS-CoV-2","Staphylococcus aureus","Staphylococcus coagulase negativo","Outro"]},
          {"key":"microrganismo_outro","label":"Em caso de outro, especifique","tipo":"text","depende_de":"microrganismo == Outro"}
        ]
      }
    ],
    "indicadores": []
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, schema = EXCLUDED.schema, ativo = true;

-- 5e. Higiene das Mãos
INSERT INTO public.notification_types
  (id, nome, descricao, fonte, anvisa_id, paradigma, prefixo, icon_name, ordem, visivel_para, schema)
VALUES (
  'anvisa_higiene',
  'Consumo de Preparação Alcoólica - Higiene das Mãos 2026',
  'Monitoramento de consumo de álcool gel para higiene das mãos - ANVISA #875761',
  'ANVISA', '875761', 'agregado', 'HM', 'Droplets', 5,
  '{"hospital_types":["all"]}',
  '{
    "blocos": [
      {
        "id": "notificador",
        "titulo": "Dados do Notificador",
        "campos": [
          {"key":"notificante","label":"Responsável pelo preenchimento","tipo":"text","obrigatorio":true,"mapeia":"notificante"},
          {"key":"email","label":"E-mail","tipo":"email","obrigatorio":true}
        ]
      },
      {
        "id": "institucional",
        "titulo": "Dados Institucionais",
        "auto_preenche_do_hospital": true,
        "campos": [
          {"key":"estado","label":"Estado","tipo":"select_uf","origem":"hospital.state","obrigatorio":true},
          {"key":"cnpj","label":"CNPJ","tipo":"text","mascara":"00.000.000/0000-00","origem":"hospital.cnpj","obrigatorio":true}
        ]
      },
      {
        "id": "monitoramento",
        "titulo": "Dados do Monitoramento",
        "campos": [
          {"key":"ano","label":"Ano de monitoramento","tipo":"select_ano","obrigatorio":true,"mapeia":"ano_vigilancia"},
          {"key":"mes","label":"Mês de monitoramento","tipo":"select_mes","obrigatorio":true,"mapeia":"mes_vigilancia"},
          {"key":"unidades","label":"Unidades monitoradas no mês","tipo":"multiselect","obrigatorio":true,
            "opcoes":["UTI Adulto","UTI Pediátrica","UTI Neonatal"]}
        ]
      },
      {
        "id": "consumo_por_unidade",
        "titulo": "Consumo por Unidade",
        "repeat_por": "unidades",
        "bloco_repetivel": {
          "campos": [
            {"key":"paciente_dia","label":"Paciente-dia","tipo":"int","obrigatorio":true,"preencher_de":"patient_devices.paciente_dia"},
            {"key":"consumo_alcoolica_ml","label":"Consumo de preparação alcoólica (mL)","tipo":"int","obrigatorio":true},
            {"key":"consumo_sabonete_ml","label":"Consumo de sabonete líquido (mL)","tipo":"int","obrigatorio":true}
          ]
        }
      }
    ],
    "indicadores": [
      {"key":"consumo_alcool_pac_dia","label":"Consumo de álcool por paciente-dia","formula":"consumo_alcoolica_ml/paciente_dia","unidade":"mL/paciente-dia","por_instancia":true,
        "alerta":{"regra":"< 20","msg":"Abaixo do mínimo recomendado pela OMS (20 mL/paciente-dia)"}}
    ]
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, schema = EXCLUDED.schema, ativo = true;

-- 5f. PLACON-RM
INSERT INTO public.notification_types
  (id, nome, descricao, fonte, anvisa_id, paradigma, prefixo, icon_name, ordem, visivel_para, schema)
VALUES (
  'placon_rm',
  'PLACON-RM/RJ - Notificação de Microrganismo Multirresistente',
  'Notificação individual de microrganismo multirresistente para PLACON-RM/RJ',
  'PLACON', NULL, 'caso', 'PLACON', 'ShieldAlert', 6,
  '{"hospital_types":["all"]}',
  '{
    "blocos": [
      {
        "id": "notificacao",
        "titulo": "Identificação da Notificação",
        "auto_preenche_do_hospital": true,
        "campos": [
          {"key":"unidade_notificante","label":"Unidade notificante","tipo":"text","origem":"hospital.name","obrigatorio":true},
          {"key":"cnes","label":"CNES","tipo":"text","origem":"hospital.cnes"},
          {"key":"notificante","label":"Profissional notificante","tipo":"text","obrigatorio":true,"mapeia":"notificante"},
          {"key":"data_notificacao","label":"Data da notificação","tipo":"date","obrigatorio":true,"mapeia":"data_evento"}
        ]
      },
      {
        "id": "paciente",
        "titulo": "Identificação do Paciente",
        "campos": [
          {"key":"paciente_nome","label":"Nome do paciente","tipo":"text","obrigatorio":true,"mapeia":"paciente_nome","preencher_de":"patients"},
          {"key":"prontuario","label":"Prontuário","tipo":"text"},
          {"key":"data_nascimento","label":"Data de nascimento","tipo":"date"},
          {"key":"sexo","label":"Sexo","tipo":"select","opcoes":["Masculino","Feminino","Ignorado"]},
          {"key":"leito","label":"Leito","tipo":"text"},
          {"key":"unidade_internacao","label":"Unidade de internação","tipo":"text","mapeia":"setor"},
          {"key":"data_internacao","label":"Data de internação","tipo":"date"},
          {"key":"procedencia","label":"Procedência","tipo":"select","opcoes":["Comunidade","Outro hospital","Mesma unidade","Ignorado"]}
        ]
      },
      {
        "id": "microbiologia",
        "titulo": "Microbiologia",
        "campos": [
          {"key":"microrganismo","label":"Microrganismo","tipo":"select","mapeia":"microrganismo","obrigatorio":true,"preencher_de":"lab_results",
            "opcoes":["Klebsiella pneumoniae complexo","Escherichia coli","Complexo Acinetobacter baumannii-calcoaceticus","Pseudomonas aeruginosa","Enterobacter spp.","Staphylococcus aureus","Enterococcus faecium","Enterococcus faecalis","Candida auris","Outro"]},
          {"key":"amostra","label":"Amostra clínica","tipo":"select",
            "opcoes":["Hemocultura","Urocultura","Secreção traqueal","LCR","Ponta de cateter","Swab de vigilância (retal)","Ferida operatória","Outro"]},
          {"key":"data_coleta","label":"Data da coleta","tipo":"date"},
          {"key":"laboratorio","label":"Laboratório","tipo":"text"}
        ]
      },
      {
        "id": "resistencia",
        "titulo": "Mecanismo de Resistência",
        "campos": [
          {"key":"mecanismo","label":"Mecanismo","tipo":"select",
            "opcoes":["KPC","NDM","OXA-48","IMP","VIM","MRSA","VRE (vanA)","VRE (vanB)","ESBL","Resistência à polimixina","Outro"]},
          {"key":"confirmacao","label":"Confirmação","tipo":"select","opcoes":["Fenotípica","Genotípica (PCR)","Não realizada"]}
        ]
      },
      {
        "id": "classificacao",
        "titulo": "Classificação e Desfecho",
        "campos": [
          {"key":"tipo_caso","label":"Tipo de caso","tipo":"select","opcoes":["Colonização","Infecção"]},
          {"key":"iras","label":"Relacionada à assistência (IRAS)?","tipo":"select","opcoes":["Sim","Não","Indeterminado"]},
          {"key":"sitio_infeccao","label":"Sítio de infecção","tipo":"text","depende_de":"tipo_caso == Infecção"},
          {"key":"precaucao_contato","label":"Precaução de contato instituída?","tipo":"sim_nao"},
          {"key":"data_precaucao","label":"Data da precaução","tipo":"date","depende_de":"precaucao_contato == Sim"},
          {"key":"desfecho","label":"Desfecho","tipo":"select","opcoes":["Em tratamento","Alta","Transferência","Óbito"]},
          {"key":"obito_relacionado","label":"Óbito relacionado à infecção?","tipo":"select","opcoes":["Sim","Não","Não se aplica"],"depende_de":"desfecho == Óbito"}
        ]
      }
    ],
    "indicadores": []
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, schema = EXCLUDED.schema, ativo = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Marketplace entry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.marketplace_tools
  (id, name, description, category, icon_name, route, version, author, price, is_free, features, downloads, rating)
VALUES (
  'modulo-notificacoes-anvisa',
  'Notificações ANVISA/PLACON',
  'Módulo completo de notificações epidemiológicas para ANVISA e PLACON-RM/RJ. Formulários dinâmicos, dashboard analítico e geração de relatório PDF.',
  'Monitoramento',
  'Bell',
  '/notificacoes',
  '1.0.0',
  'IRASControl',
  'Grátis',
  true,
  '["6 modelos: ISC, UTI Adulto, UTI Neonatal, Surtos, Higiene das Mãos, PLACON-RM", "Formulários dinâmicos com validação ANVISA", "Dashboard analítico com séries temporais", "Geração de relatório PDF", "Visibilidade por tipo de hospital", "Histórico completo com rastreabilidade"]'::jsonb,
  0,
  5.0
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, route = EXCLUDED.route;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Storage bucket para PDFs de notificações
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('notifications', 'notifications', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "notif_pdf_insert" ON storage.objects;
CREATE POLICY "notif_pdf_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notifications'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_hospital_ids(auth.uid()))
);

DROP POLICY IF EXISTS "notif_pdf_select" ON storage.objects;
CREATE POLICY "notif_pdf_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'notifications'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_hospital_ids(auth.uid()))
);
