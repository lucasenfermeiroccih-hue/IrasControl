export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      action_plan_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          plan_id: string
          responsible_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          plan_id: string
          responsible_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          plan_id?: string
          responsible_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_plan_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans_5w2h"
            referencedColumns: ["id"]
          },
        ]
      }
      action_plans_5w2h: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          hospital_id: string | null
          how: string | null
          how_much: number | null
          id: string
          linked_audit_id: string | null
          linked_infection_case_id: string | null
          linked_kanban_card_id: string | null
          priority: string | null
          responsible_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          what: string | null
          when_date: string | null
          where_field: string | null
          who: string | null
          why: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          hospital_id?: string | null
          how?: string | null
          how_much?: number | null
          id?: string
          linked_audit_id?: string | null
          linked_infection_case_id?: string | null
          linked_kanban_card_id?: string | null
          priority?: string | null
          responsible_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          what?: string | null
          when_date?: string | null
          where_field?: string | null
          who?: string | null
          why?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          hospital_id?: string | null
          how?: string | null
          how_much?: number | null
          id?: string
          linked_audit_id?: string | null
          linked_infection_case_id?: string | null
          linked_kanban_card_id?: string | null
          priority?: string | null
          responsible_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          what?: string | null
          when_date?: string | null
          where_field?: string | null
          who?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_5w2h_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_5w2h_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_5w2h_linked_kanban_card_id_fkey"
            columns: ["linked_kanban_card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          created_at: string
          hospital_id: string | null
          how: string
          how_much: string | null
          id: string
          infection_type: string
          status: string
          updated_at: string
          user_id: string
          what: string
          when_date: string
          where_sector: string
          who: string
          why: string
        }
        Insert: {
          created_at?: string
          hospital_id?: string | null
          how: string
          how_much?: string | null
          id?: string
          infection_type: string
          status?: string
          updated_at?: string
          user_id: string
          what: string
          when_date: string
          where_sector: string
          who: string
          why: string
        }
        Update: {
          created_at?: string
          hospital_id?: string | null
          how?: string
          how_much?: string | null
          id?: string
          infection_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          what?: string
          when_date?: string
          where_sector?: string
          who?: string
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_chat_sessions: {
        Row: {
          agent_id: string
          agent_name: string
          created_at: string
          hospital_id: string | null
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_name: string
          created_at?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_name?: string
          created_at?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_chat_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_chat_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          description: string | null
          hospital_id: string
          id: string
          related_case_id: string | null
          related_patient_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          description?: string | null
          hospital_id: string
          id?: string
          related_case_id?: string | null
          related_patient_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          description?: string | null
          hospital_id?: string
          id?: string
          related_case_id?: string | null
          related_patient_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_related_case_id_fkey"
            columns: ["related_case_id"]
            isOneToOne: false
            referencedRelation: "infection_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_related_patient_id_fkey"
            columns: ["related_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      antibiogram_reports: {
        Row: {
          ai_content: string | null
          created_at: string
          created_by: string | null
          filters: Json
          hospital_id: string
          id: string
          period_end: string | null
          period_label: string
          period_start: string | null
          report_type: string
          resistance_rate: number | null
          summary: Json
          total_exams: number
          updated_at: string
        }
        Insert: {
          ai_content?: string | null
          created_at?: string
          created_by?: string | null
          filters?: Json
          hospital_id: string
          id?: string
          period_end?: string | null
          period_label: string
          period_start?: string | null
          report_type: string
          resistance_rate?: number | null
          summary?: Json
          total_exams?: number
          updated_at?: string
        }
        Update: {
          ai_content?: string | null
          created_at?: string
          created_by?: string | null
          filters?: Json
          hospital_id?: string
          id?: string
          period_end?: string | null
          period_label?: string
          period_start?: string | null
          report_type?: string
          resistance_rate?: number | null
          summary?: Json
          total_exams?: number
          updated_at?: string
        }
        Relationships: []
      }
      antibiogram_results: {
        Row: {
          antibiotic: string
          created_at: string
          id: string
          lab_result_id: string
          mic_value: number | null
          notes: string | null
          sensitivity: string
          sir_category: string | null
        }
        Insert: {
          antibiotic: string
          created_at?: string
          id?: string
          lab_result_id: string
          mic_value?: number | null
          notes?: string | null
          sensitivity: string
          sir_category?: string | null
        }
        Update: {
          antibiotic?: string
          created_at?: string
          id?: string
          lab_result_id?: string
          mic_value?: number | null
          notes?: string | null
          sensitivity?: string
          sir_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "antibiogram_results_lab_result_id_fkey"
            columns: ["lab_result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
        ]
      }
      antimicrobial_prescriptions: {
        Row: {
          created_at: string
          dose: string | null
          drug_name: string
          end_date: string | null
          frequency: string | null
          hospital_id: string
          id: string
          indication: string | null
          is_active: boolean
          patient_id: string
          prescriber_id: string | null
          route: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dose?: string | null
          drug_name: string
          end_date?: string | null
          frequency?: string | null
          hospital_id: string
          id?: string
          indication?: string | null
          is_active?: boolean
          patient_id: string
          prescriber_id?: string | null
          route?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dose?: string | null
          drug_name?: string
          end_date?: string | null
          frequency?: string | null
          hospital_id?: string
          id?: string
          indication?: string | null
          is_active?: boolean
          patient_id?: string
          prescriber_id?: string | null
          route?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "antimicrobial_prescriptions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antimicrobial_prescriptions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antimicrobial_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          notify_email: boolean
          notify_push: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          notify_email?: boolean
          notify_push?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          notify_email?: boolean
          notify_push?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_items: {
        Row: {
          audit_id: string
          category: string | null
          created_at: string
          id: string
          item_order: number
          observation: string | null
          question: string
          status: Database["public"]["Enums"]["audit_item_status"]
        }
        Insert: {
          audit_id: string
          category?: string | null
          created_at?: string
          id?: string
          item_order?: number
          observation?: string | null
          question: string
          status?: Database["public"]["Enums"]["audit_item_status"]
        }
        Update: {
          audit_id?: string
          category?: string | null
          created_at?: string
          id?: string
          item_order?: number
          observation?: string | null
          question?: string
          status?: Database["public"]["Enums"]["audit_item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          audit_date: string
          audit_type: Database["public"]["Enums"]["audit_type"]
          auditor_id: string | null
          compliance_rate: number | null
          compliant_items: number
          created_at: string
          hospital_id: string
          id: string
          observations: string | null
          photo_captions: string[]
          photo_urls: string[]
          sector: string | null
          total_items: number
          updated_at: string
        }
        Insert: {
          audit_date?: string
          audit_type: Database["public"]["Enums"]["audit_type"]
          auditor_id?: string | null
          compliance_rate?: number | null
          compliant_items?: number
          created_at?: string
          hospital_id: string
          id?: string
          observations?: string | null
          photo_captions?: string[]
          photo_urls?: string[]
          sector?: string | null
          total_items?: number
          updated_at?: string
        }
        Update: {
          audit_date?: string
          audit_type?: Database["public"]["Enums"]["audit_type"]
          auditor_id?: string | null
          compliance_rate?: number | null
          compliant_items?: number
          created_at?: string
          hospital_id?: string
          id?: string
          observations?: string | null
          photo_captions?: string[]
          photo_urls?: string[]
          sector?: string | null
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          author_id: string | null
          case_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          case_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
          case_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "infection_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ccih_kanban_columns: {
        Row: {
          created_at: string
          id: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ccih_kanban_tasks: {
        Row: {
          column_id: string
          created_at: string
          description: string | null
          id: string
          position: number
          recurrence: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          column_id: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          recurrence?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          column_id?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          recurrence?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ccih_kanban_tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "ccih_kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company: string
          created_at: string
          created_by: string | null
          email: string
          hospital_id: string
          id: string
          last_contact_at: string | null
          name: string
          notes: string | null
          phone: string
          role: string
          score: number
          stage: string
          updated_at: string
          value: string
        }
        Insert: {
          company?: string
          created_at?: string
          created_by?: string | null
          email?: string
          hospital_id: string
          id?: string
          last_contact_at?: string | null
          name: string
          notes?: string | null
          phone?: string
          role?: string
          score?: number
          stage?: string
          updated_at?: string
          value?: string
        }
        Update: {
          company?: string
          created_at?: string
          created_by?: string | null
          email?: string
          hospital_id?: string
          id?: string
          last_contact_at?: string | null
          name?: string
          notes?: string | null
          phone?: string
          role?: string
          score?: number
          stage?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      ddd_record_lines: {
        Row: {
          antimicrobiano_id: number
          apresentacao: string
          created_at: string
          ddd_padrao: number
          ddd_record_id: string
          id: string
          indicador: number | null
          mg_por_unidade: number
          nome: string
          quantidade: number
          total_g: number
          total_mg: number
          valor_ab: number | null
        }
        Insert: {
          antimicrobiano_id: number
          apresentacao: string
          created_at?: string
          ddd_padrao?: number
          ddd_record_id: string
          id?: string
          indicador?: number | null
          mg_por_unidade?: number
          nome: string
          quantidade?: number
          total_g?: number
          total_mg?: number
          valor_ab?: number | null
        }
        Update: {
          antimicrobiano_id?: number
          apresentacao?: string
          created_at?: string
          ddd_padrao?: number
          ddd_record_id?: string
          id?: string
          indicador?: number | null
          mg_por_unidade?: number
          nome?: string
          quantidade?: number
          total_g?: number
          total_mg?: number
          valor_ab?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ddd_record_lines_ddd_record_id_fkey"
            columns: ["ddd_record_id"]
            isOneToOne: false
            referencedRelation: "ddd_records"
            referencedColumns: ["id"]
          },
        ]
      }
      ddd_records: {
        Row: {
          ano_vigilancia: number
          compilado_utis: number
          created_at: string
          data_vigilancia: string
          hospital_id: string
          id: string
          mes_vigilancia: string
          paciente_dia: Json
          profissional: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano_vigilancia: number
          compilado_utis?: number
          created_at?: string
          data_vigilancia: string
          hospital_id: string
          id?: string
          mes_vigilancia: string
          paciente_dia?: Json
          profissional: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano_vigilancia?: number
          compilado_utis?: number
          created_at?: string
          data_vigilancia?: string
          hospital_id?: string
          id?: string
          mes_vigilancia?: string
          paciente_dia?: Json
          profissional?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ddd_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddd_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          campos: number
          categoria: string
          created_at: string
          created_by: string | null
          descricao: string | null
          hospital_id: string
          id: string
          nome: string
          obrigatorio: boolean
          preenchimentos: number
          status: string
          updated_at: string
        }
        Insert: {
          campos?: number
          categoria?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          hospital_id: string
          id?: string
          nome: string
          obrigatorio?: boolean
          preenchimentos?: number
          status?: string
          updated_at?: string
        }
        Update: {
          campos?: number
          categoria?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          hospital_id?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          preenchimentos?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_logos: {
        Row: {
          created_at: string
          display_name: string | null
          display_order: number
          hospital_id: string
          id: string
          logo_type: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          display_order?: number
          hospital_id: string
          id?: string
          logo_type: string
          storage_path: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          display_order?: number
          hospital_id?: string
          id?: string
          logo_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_logos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_logos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_roles: {
        Row: {
          created_at: string
          description: string | null
          hospital_id: string | null
          id: string
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_tool_installations: {
        Row: {
          hospital_id: string
          id: string
          installed_at: string | null
          installed_by: string | null
          is_active: boolean | null
          tool_id: string
        }
        Insert: {
          hospital_id: string
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          is_active?: boolean | null
          tool_id: string
        }
        Update: {
          hospital_id?: string
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          is_active?: boolean | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_tool_installations_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "marketplace_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_users: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          is_primary_admin: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          is_primary_admin?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          is_primary_admin?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_users_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_users_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_users_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      hospitals: {
        Row: {
          bed_count: number | null
          city: string | null
          cnes: string | null
          cnpj: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notification_settings: Json
          state: string | null
          status: Database["public"]["Enums"]["hospital_status"]
          type: string
          updated_at: string
        }
        Insert: {
          bed_count?: number | null
          city?: string | null
          cnes?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notification_settings?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hospital_status"]
          type?: string
          updated_at?: string
        }
        Update: {
          bed_count?: number | null
          city?: string | null
          cnes?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notification_settings?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hospital_status"]
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      hygiene_consumption_records: {
        Row: {
          ano: string
          consumo_alcool_ml: number
          consumo_sabonete_ml: number
          created_at: string
          hospital_id: string
          id: string
          instancias_com_higienizacao: number
          instancias_sem_higienizacao: number
          mes: string
          paciente_dia: number
          responsavel: string
          setor: string
          total_formularios: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ano: string
          consumo_alcool_ml?: number
          consumo_sabonete_ml?: number
          created_at?: string
          hospital_id: string
          id?: string
          instancias_com_higienizacao?: number
          instancias_sem_higienizacao?: number
          mes: string
          paciente_dia?: number
          responsavel?: string
          setor: string
          total_formularios?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: string
          consumo_alcool_ml?: number
          consumo_sabonete_ml?: number
          created_at?: string
          hospital_id?: string
          id?: string
          instancias_com_higienizacao?: number
          instancias_sem_higienizacao?: number
          mes?: string
          paciente_dia?: number
          responsavel?: string
          setor?: string
          total_formularios?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hygiene_consumption_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hygiene_consumption_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      indicadores_records: {
        Row: {
          ano_vigilancia: number
          calculated: Json
          created_at: string
          data_vigilancia: string
          hospital_id: string
          id: string
          inputs: Json
          mes_vigilancia: string
          profissional: string
          setor: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano_vigilancia?: number
          calculated?: Json
          created_at?: string
          data_vigilancia?: string
          hospital_id: string
          id?: string
          inputs?: Json
          mes_vigilancia?: string
          profissional?: string
          setor?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano_vigilancia?: number
          calculated?: Json
          created_at?: string
          data_vigilancia?: string
          hospital_id?: string
          id?: string
          inputs?: Json
          mes_vigilancia?: string
          profissional?: string
          setor?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicadores_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      infection_cases: {
        Row: {
          case_number: string | null
          confirmation_date: string | null
          created_at: string
          created_by: string | null
          detection_date: string
          device_related: boolean | null
          device_type: Database["public"]["Enums"]["device_type"] | null
          hospital_id: string
          id: string
          infection_site: string | null
          infection_type: string | null
          investigating_user_id: string | null
          investigation_data: Json
          notes: string | null
          patient_id: string | null
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
        }
        Insert: {
          case_number?: string | null
          confirmation_date?: string | null
          created_at?: string
          created_by?: string | null
          detection_date?: string
          device_related?: boolean | null
          device_type?: Database["public"]["Enums"]["device_type"] | null
          hospital_id: string
          id?: string
          infection_site?: string | null
          infection_type?: string | null
          investigating_user_id?: string | null
          investigation_data?: Json
          notes?: string | null
          patient_id?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
        }
        Update: {
          case_number?: string | null
          confirmation_date?: string | null
          created_at?: string
          created_by?: string | null
          detection_date?: string
          device_related?: boolean | null
          device_type?: Database["public"]["Enums"]["device_type"] | null
          hospital_id?: string
          id?: string
          infection_site?: string | null
          infection_type?: string | null
          investigating_user_id?: string | null
          investigation_data?: Json
          notes?: string | null
          patient_id?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "infection_cases_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infection_cases_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infection_cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      iras_series: {
        Row: {
          created_at: string
          date: string
          id: string
          rate: number
          sector: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          rate: number
          sector: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          rate?: number
          sector?: string
        }
        Relationships: []
      }
      isc_record_indicators: {
        Row: {
          contatos_atendidos: number
          created_at: string
          id: string
          isc_confirmada: number
          isc_record_id: string
          procedimento: string
          reinternacoes: number
          retorno_ambulatorio: number
          retorno_whatsapp: number
          sitio: string | null
          total_cirurgias: number
        }
        Insert: {
          contatos_atendidos?: number
          created_at?: string
          id?: string
          isc_confirmada?: number
          isc_record_id: string
          procedimento: string
          reinternacoes?: number
          retorno_ambulatorio?: number
          retorno_whatsapp?: number
          sitio?: string | null
          total_cirurgias?: number
        }
        Update: {
          contatos_atendidos?: number
          created_at?: string
          id?: string
          isc_confirmada?: number
          isc_record_id?: string
          procedimento?: string
          reinternacoes?: number
          retorno_ambulatorio?: number
          retorno_whatsapp?: number
          sitio?: string | null
          total_cirurgias?: number
        }
        Relationships: [
          {
            foreignKeyName: "isc_record_indicators_isc_record_id_fkey"
            columns: ["isc_record_id"]
            isOneToOne: false
            referencedRelation: "isc_records"
            referencedColumns: ["id"]
          },
        ]
      }
      isc_records: {
        Row: {
          ano: string
          created_at: string
          data_vigilancia: string
          hospital_id: string
          id: string
          mes: string
          nome_profissional: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano: string
          created_at?: string
          data_vigilancia: string
          hospital_id: string
          id?: string
          mes: string
          nome_profissional: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: string
          created_at?: string
          data_vigilancia?: string
          hospital_id?: string
          id?: string
          mes?: string
          nome_profissional?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "isc_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isc_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_boards: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          hospital_id: string | null
          id: string
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_boards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_boards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_card_comments: {
        Row: {
          card_id: string
          comment: string
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          card_id: string
          comment: string
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          card_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_card_comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_card_history: {
        Row: {
          card_id: string
          from_column: string | null
          id: string
          moved_at: string | null
          moved_by: string | null
          to_column: string | null
        }
        Insert: {
          card_id: string
          from_column?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string | null
          to_column?: string | null
        }
        Update: {
          card_id?: string
          from_column?: string | null
          id?: string
          moved_at?: string | null
          moved_by?: string | null
          to_column?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_card_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          assigned_to: string | null
          board_id: string
          column_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          hospital_id: string | null
          id: string
          linked_5w2h_id: string | null
          linked_audit_id: string | null
          linked_infection_case_id: string | null
          position: number
          priority: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          board_id: string
          column_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          hospital_id?: string | null
          id?: string
          linked_5w2h_id?: string | null
          linked_audit_id?: string | null
          linked_infection_case_id?: string | null
          position?: number
          priority?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          board_id?: string
          column_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          hospital_id?: string | null
          id?: string
          linked_5w2h_id?: string | null
          linked_audit_id?: string | null
          linked_infection_case_id?: string | null
          position?: number
          priority?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_kanban_cards_5w2h"
            columns: ["linked_5w2h_id"]
            isOneToOne: false
            referencedRelation: "action_plans_5w2h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_ccih_tarefas: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          assigned_to_ids: string[]
          created_at: string
          description: string | null
          hospital_id: string
          id: string
          last_completed_at: string | null
          priority: string
          recurrence: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          assigned_to_ids?: string[]
          created_at?: string
          description?: string | null
          hospital_id: string
          id?: string
          last_completed_at?: string | null
          priority?: string
          recurrence?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          assigned_to_ids?: string[]
          created_at?: string
          description?: string | null
          hospital_id?: string
          id?: string
          last_completed_at?: string | null
          priority?: string
          recurrence?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_ccih_tarefas_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_ccih_tarefas_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          board_id: string | null
          color: string | null
          created_at: string | null
          hospital_id: string | null
          id: string
          position: number
          title: string
          user_id: string | null
          wip_limit: number | null
        }
        Insert: {
          board_id?: string | null
          color?: string | null
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          position?: number
          title: string
          user_id?: string | null
          wip_limit?: number | null
        }
        Update: {
          board_id?: string | null
          color?: string | null
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          position?: number
          title?: string
          user_id?: string | null
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_columns_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_columns_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_task_assignees: {
        Row: {
          created_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      kanban_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          column_id: string
          created_at: string
          description: string | null
          hospital_id: string | null
          id: string
          last_completed_at: string | null
          position: number
          priority: string
          recurrence: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          column_id: string
          created_at?: string
          description?: string | null
          hospital_id?: string | null
          id?: string
          last_completed_at?: string | null
          position?: number
          priority?: string
          recurrence?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          column_id?: string
          created_at?: string
          description?: string | null
          hospital_id?: string | null
          id?: string
          last_completed_at?: string | null
          position?: number
          priority?: string
          recurrence?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kanban_tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_tasks_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_tasks_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          carbapenemase: string | null
          carbapenemase_type: string | null
          collection_date: string
          created_at: string
          created_by: string | null
          esbl: string | null
          hospital_id: string
          id: string
          notes: string | null
          organism: string | null
          patient_id: string | null
          result_date: string | null
          sample_category: string | null
          sample_location_detail: string | null
          sample_location_enabled: string | null
          sample_material: string | null
          sample_type: string | null
          status: Database["public"]["Enums"]["lab_result_status"]
          updated_at: string
        }
        Insert: {
          carbapenemase?: string | null
          carbapenemase_type?: string | null
          collection_date?: string
          created_at?: string
          created_by?: string | null
          esbl?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          organism?: string | null
          patient_id?: string | null
          result_date?: string | null
          sample_category?: string | null
          sample_location_detail?: string | null
          sample_location_enabled?: string | null
          sample_material?: string | null
          sample_type?: string | null
          status?: Database["public"]["Enums"]["lab_result_status"]
          updated_at?: string
        }
        Update: {
          carbapenemase?: string | null
          carbapenemase_type?: string | null
          collection_date?: string
          created_at?: string
          created_by?: string | null
          esbl?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          organism?: string | null
          patient_id?: string | null
          result_date?: string | null
          sample_category?: string | null
          sample_location_detail?: string | null
          sample_location_enabled?: string | null
          sample_material?: string | null
          sample_type?: string | null
          status?: Database["public"]["Enums"]["lab_result_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_tools: {
        Row: {
          author: string | null
          category: string | null
          created_at: string | null
          description: string | null
          downloads: number | null
          features: Json | null
          icon_name: string | null
          id: string
          is_free: boolean | null
          name: string
          price: string | null
          rating: number | null
          recommended_for: string[] | null
          route: string
          version: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          downloads?: number | null
          features?: Json | null
          icon_name?: string | null
          id: string
          is_free?: boolean | null
          name: string
          price?: string | null
          rating?: number | null
          recommended_for?: string[] | null
          route: string
          version?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          downloads?: number | null
          features?: Json | null
          icon_name?: string | null
          id?: string
          is_free?: boolean | null
          name?: string
          price?: string | null
          rating?: number | null
          recommended_for?: string[] | null
          route?: string
          version?: string | null
        }
        Relationships: []
      }
      maternidade_action_plans: {
        Row: {
          created_at: string
          hospital_id: string
          how: string
          id: string
          indicador: string
          status: string
          updated_at: string
          user_id: string
          what: string
          when_date: string | null
          who: string
          why: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          how?: string
          id?: string
          indicador?: string
          status?: string
          updated_at?: string
          user_id: string
          what: string
          when_date?: string | null
          who: string
          why?: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          how?: string
          id?: string
          indicador?: string
          status?: string
          updated_at?: string
          user_id?: string
          what?: string
          when_date?: string | null
          who?: string
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "maternidade_action_plans_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maternidade_action_plans_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      maternidade_busca_ativa: {
        Row: {
          ano: string
          casos_confirmados: number
          contatos_ligacoes: number
          contatos_revisao_prontuario: number
          contatos_whatsapp: number
          created_at: string
          hospital_id: string
          id: string
          mes: string
          observacoes: string
          retornos_confirmados: number
          total_cesarianas_periodo: number
          user_id: string
        }
        Insert: {
          ano: string
          casos_confirmados?: number
          contatos_ligacoes?: number
          contatos_revisao_prontuario?: number
          contatos_whatsapp?: number
          created_at?: string
          hospital_id: string
          id?: string
          mes: string
          observacoes?: string
          retornos_confirmados?: number
          total_cesarianas_periodo?: number
          user_id: string
        }
        Update: {
          ano?: string
          casos_confirmados?: number
          contatos_ligacoes?: number
          contatos_revisao_prontuario?: number
          contatos_whatsapp?: number
          created_at?: string
          hospital_id?: string
          id?: string
          mes?: string
          observacoes?: string
          retornos_confirmados?: number
          total_cesarianas_periodo?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maternidade_busca_ativa_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maternidade_busca_ativa_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      maternidade_casos: {
        Row: {
          ano: string
          classificacao_isc: string
          comorbidades: string
          created_at: string
          data_parto: string | null
          data_reintranacao: string | null
          hospital_id: string
          id: string
          medico_prestador: string
          mes: string
          nome_paciente: string
          observacoes: string
          pre_eclampsia: boolean
          prontuario: string
          status_caso: string
          tipo: string
          user_id: string
        }
        Insert: {
          ano: string
          classificacao_isc?: string
          comorbidades?: string
          created_at?: string
          data_parto?: string | null
          data_reintranacao?: string | null
          hospital_id: string
          id?: string
          medico_prestador?: string
          mes: string
          nome_paciente: string
          observacoes?: string
          pre_eclampsia?: boolean
          prontuario?: string
          status_caso?: string
          tipo: string
          user_id: string
        }
        Update: {
          ano?: string
          classificacao_isc?: string
          comorbidades?: string
          created_at?: string
          data_parto?: string | null
          data_reintranacao?: string | null
          hospital_id?: string
          id?: string
          medico_prestador?: string
          mes?: string
          nome_paciente?: string
          observacoes?: string
          pre_eclampsia?: boolean
          prontuario?: string
          status_caso?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maternidade_casos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maternidade_casos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      maternidade_educacao: {
        Row: {
          created_at: string
          data_atividade: string
          descricao: string
          facilitador: string
          hospital_id: string
          id: string
          observacoes: string
          participantes: number
          tema: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_atividade: string
          descricao?: string
          facilitador?: string
          hospital_id: string
          id?: string
          observacoes?: string
          participantes?: number
          tema: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_atividade?: string
          descricao?: string
          facilitador?: string
          hospital_id?: string
          id?: string
          observacoes?: string
          participantes?: number
          tema?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maternidade_educacao_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maternidade_educacao_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      maternidade_partos: {
        Row: {
          ano: string
          cesarianas: number
          created_at: string
          data_registro: string
          hospital_id: string
          id: string
          mes: string
          nome_profissional: string
          observacoes: string
          partos_normais: number
          total_partos: number
          user_id: string
        }
        Insert: {
          ano: string
          cesarianas?: number
          created_at?: string
          data_registro?: string
          hospital_id: string
          id?: string
          mes: string
          nome_profissional?: string
          observacoes?: string
          partos_normais?: number
          total_partos?: number
          user_id: string
        }
        Update: {
          ano?: string
          cesarianas?: number
          created_at?: string
          data_registro?: string
          hospital_id?: string
          id?: string
          mes?: string
          nome_profissional?: string
          observacoes?: string
          partos_normais?: number
          total_partos?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maternidade_partos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maternidade_partos_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      maternidade_records: {
        Row: {
          ano: string
          busca_ativa_contatos: number
          busca_ativa_retornos: number
          cesarianas: number
          created_at: string
          data_registro: string
          dias_permanencia_total: number
          educacoes_realizadas: number
          hospital_id: string
          id: string
          infeccao_puerperal_confirmada: number
          infeccao_puerperal_suspeita: number
          investigacoes_epidemio: number
          isc_pos_cesariana: number
          leitos_obstetricos: number
          leitos_ocupados: number
          mes: string
          nome_profissional: string
          observacoes: string
          paciente_dias: number
          partos_normais: number
          profissionais_capacitados: number
          total_partos: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ano: string
          busca_ativa_contatos?: number
          busca_ativa_retornos?: number
          cesarianas?: number
          created_at?: string
          data_registro?: string
          dias_permanencia_total?: number
          educacoes_realizadas?: number
          hospital_id: string
          id?: string
          infeccao_puerperal_confirmada?: number
          infeccao_puerperal_suspeita?: number
          investigacoes_epidemio?: number
          isc_pos_cesariana?: number
          leitos_obstetricos?: number
          leitos_ocupados?: number
          mes: string
          nome_profissional: string
          observacoes?: string
          paciente_dias?: number
          partos_normais?: number
          profissionais_capacitados?: number
          total_partos?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: string
          busca_ativa_contatos?: number
          busca_ativa_retornos?: number
          cesarianas?: number
          created_at?: string
          data_registro?: string
          dias_permanencia_total?: number
          educacoes_realizadas?: number
          hospital_id?: string
          id?: string
          infeccao_puerperal_confirmada?: number
          infeccao_puerperal_suspeita?: number
          investigacoes_epidemio?: number
          isc_pos_cesariana?: number
          leitos_obstetricos?: number
          leitos_ocupados?: number
          mes?: string
          nome_profissional?: string
          observacoes?: string
          paciente_dias?: number
          partos_normais?: number
          profissionais_capacitados?: number
          total_partos?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maternidade_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maternidade_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      maternity_action_plans: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          due_date: string | null
          evidence: string | null
          hospital_id: string
          id: string
          indicator_key: string
          monthly_record_id: string | null
          priority: string
          problem: string
          responsible: string
          root_cause: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          evidence?: string | null
          hospital_id: string
          id?: string
          indicator_key: string
          monthly_record_id?: string | null
          priority?: string
          problem: string
          responsible: string
          root_cause?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          evidence?: string | null
          hospital_id?: string
          id?: string
          indicator_key?: string
          monthly_record_id?: string | null
          priority?: string
          problem?: string
          responsible?: string
          root_cause?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maternity_action_plans_monthly_record_id_fkey"
            columns: ["monthly_record_id"]
            isOneToOne: false
            referencedRelation: "maternity_monthly_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maternity_monthly_records: {
        Row: {
          analysis: string | null
          beds_available: number
          created_at: string
          created_by: string | null
          discharged_patients: number
          hospital_id: string
          id: string
          identified_infection_cases: number
          investigated_infection_cases: number
          month: number
          observations: string | null
          patient_days: number
          post_cesarean_ssi_cases: number
          post_discharge_contacted_patients: number
          post_discharge_eligible_patients: number
          professionals_eligible: number
          professionals_trained: number
          puerperal_infection_cases: number
          puerperal_infection_readmissions: number
          sector_id: string | null
          status: string
          sum_length_of_stay_days: number
          total_admissions: number
          total_births: number
          total_cesareans: number
          total_vaginal_births: number
          training_hours: number
          trainings_count: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          year: number
        }
        Insert: {
          analysis?: string | null
          beds_available?: number
          created_at?: string
          created_by?: string | null
          discharged_patients?: number
          hospital_id: string
          id?: string
          identified_infection_cases?: number
          investigated_infection_cases?: number
          month: number
          observations?: string | null
          patient_days?: number
          post_cesarean_ssi_cases?: number
          post_discharge_contacted_patients?: number
          post_discharge_eligible_patients?: number
          professionals_eligible?: number
          professionals_trained?: number
          puerperal_infection_cases?: number
          puerperal_infection_readmissions?: number
          sector_id?: string | null
          status?: string
          sum_length_of_stay_days?: number
          total_admissions?: number
          total_births?: number
          total_cesareans?: number
          total_vaginal_births?: number
          training_hours?: number
          trainings_count?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          year: number
        }
        Update: {
          analysis?: string | null
          beds_available?: number
          created_at?: string
          created_by?: string | null
          discharged_patients?: number
          hospital_id?: string
          id?: string
          identified_infection_cases?: number
          investigated_infection_cases?: number
          month?: number
          observations?: string | null
          patient_days?: number
          post_cesarean_ssi_cases?: number
          post_discharge_contacted_patients?: number
          post_discharge_eligible_patients?: number
          professionals_eligible?: number
          professionals_trained?: number
          puerperal_infection_cases?: number
          puerperal_infection_readmissions?: number
          sector_id?: string | null
          status?: string
          sum_length_of_stay_days?: number
          total_admissions?: number
          total_births?: number
          total_cesareans?: number
          total_vaginal_births?: number
          training_hours?: number
          trainings_count?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          year?: number
        }
        Relationships: []
      }
      meeting_action_items: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          due_date: string | null
          evidence_required: string | null
          evidence_url: string | null
          hospital_id: string
          id: string
          meeting_id: string
          priority: string
          responsible_name: string
          status: string
          title: string
          updated_at: string
          why: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          evidence_required?: string | null
          evidence_url?: string | null
          hospital_id: string
          id?: string
          meeting_id: string
          priority?: string
          responsible_name: string
          status?: string
          title: string
          updated_at?: string
          why?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          evidence_required?: string | null
          evidence_url?: string | null
          hospital_id?: string
          id?: string
          meeting_id?: string
          priority?: string
          responsible_name?: string
          status?: string
          title?: string
          updated_at?: string
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decisions: {
        Row: {
          created_at: string
          decision: string
          due_date: string | null
          id: string
          meeting_id: string
          responsible_name: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          due_date?: string | null
          id?: string
          meeting_id: string
          responsible_name?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          responsible_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          email: string | null
          expected: boolean
          id: string
          institution: string | null
          meeting_id: string
          name: string
          phone: string | null
          present: boolean
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          expected?: boolean
          id?: string
          institution?: string | null
          meeting_id: string
          name: string
          phone?: string | null
          present?: boolean
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          expected?: boolean
          id?: string
          institution?: string | null
          meeting_id?: string
          name?: string
          phone?: string | null
          present?: boolean
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          actual_end_at: string | null
          actual_start_at: string | null
          agenda: string | null
          ai_summary: string | null
          approved_at: string | null
          approved_by: string | null
          committee: string | null
          created_at: string
          created_by: string | null
          department: string | null
          end_time: string | null
          generated_minutes_md: string | null
          hospital_id: string
          id: string
          location: string | null
          meeting_character: string | null
          meeting_type: string
          next_meeting_agenda: string | null
          next_meeting_date: string | null
          next_meeting_location: string | null
          next_meeting_time: string | null
          online_link: string | null
          president_name: string | null
          previous_pending_items: string | null
          raw_text_input: string | null
          reporter_name: string | null
          scheduled_date: string | null
          sector_id: string | null
          start_time: string | null
          status: string
          theme: string | null
          title: string
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          agenda?: string | null
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          committee?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          end_time?: string | null
          generated_minutes_md?: string | null
          hospital_id: string
          id?: string
          location?: string | null
          meeting_character?: string | null
          meeting_type?: string
          next_meeting_agenda?: string | null
          next_meeting_date?: string | null
          next_meeting_location?: string | null
          next_meeting_time?: string | null
          online_link?: string | null
          president_name?: string | null
          previous_pending_items?: string | null
          raw_text_input?: string | null
          reporter_name?: string | null
          scheduled_date?: string | null
          sector_id?: string | null
          start_time?: string | null
          status?: string
          theme?: string | null
          title: string
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          agenda?: string | null
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          committee?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          end_time?: string | null
          generated_minutes_md?: string | null
          hospital_id?: string
          id?: string
          location?: string | null
          meeting_character?: string | null
          meeting_type?: string
          next_meeting_agenda?: string | null
          next_meeting_date?: string | null
          next_meeting_location?: string | null
          next_meeting_time?: string | null
          online_link?: string | null
          president_name?: string | null
          previous_pending_items?: string | null
          raw_text_input?: string | null
          reporter_name?: string | null
          scheduled_date?: string | null
          sector_id?: string | null
          start_time?: string | null
          status?: string
          theme?: string | null
          title?: string
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      microorganisms: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notification_attachments: {
        Row: {
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          hospital_id: string
          id: string
          notification_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          hospital_id: string
          id?: string
          notification_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          hospital_id?: string
          id?: string
          notification_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_attachments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_attachments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          notification_id: string
          observacao: string | null
          snapshot: Json | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          notification_id: string
          observacao?: string | null
          snapshot?: Json | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          notification_id?: string
          observacao?: string | null
          snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_types: {
        Row: {
          anvisa_id: string | null
          ativo: boolean
          created_at: string
          descricao: string | null
          fonte: string
          hospital_id: string | null
          icon_name: string
          id: string
          nome: string
          ordem: number
          paradigma: string
          prefixo: string
          schema: Json
          visivel_para: Json
        }
        Insert: {
          anvisa_id?: string | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          fonte?: string
          hospital_id?: string | null
          icon_name?: string
          id: string
          nome: string
          ordem?: number
          paradigma: string
          prefixo: string
          schema?: Json
          visivel_para?: Json
        }
        Update: {
          anvisa_id?: string | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          fonte?: string
          hospital_id?: string | null
          icon_name?: string
          id?: string
          nome?: string
          ordem?: number
          paradigma?: string
          prefixo?: string
          schema?: Json
          visivel_para?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notification_types_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_types_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          ano_vigilancia: number
          calculated: Json
          created_at: string
          data_evento: string
          finalized_at: string | null
          hospital_id: string
          id: string
          inputs: Json
          mes_vigilancia: string | null
          microrganismo: string | null
          numero: string | null
          paciente_nome: string | null
          pdf_path: string | null
          setor: string | null
          status: string
          type_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano_vigilancia?: number
          calculated?: Json
          created_at?: string
          data_evento?: string
          finalized_at?: string | null
          hospital_id: string
          id?: string
          inputs?: Json
          mes_vigilancia?: string | null
          microrganismo?: string | null
          numero?: string | null
          paciente_nome?: string | null
          pdf_path?: string | null
          setor?: string | null
          status?: string
          type_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano_vigilancia?: number
          calculated?: Json
          created_at?: string
          data_evento?: string
          finalized_at?: string | null
          hospital_id?: string
          id?: string
          inputs?: Json
          mes_vigilancia?: string | null
          microrganismo?: string | null
          numero?: string | null
          paciente_nome?: string | null
          pdf_path?: string | null
          setor?: string | null
          status?: string
          type_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "notification_types"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_devices: {
        Row: {
          created_at: string
          created_by: string | null
          device_name: string | null
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          insertion_date: string
          insertion_site: string | null
          notes: string | null
          patient_id: string
          removal_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_name?: string | null
          device_type: Database["public"]["Enums"]["device_type"]
          id?: string
          insertion_date?: string
          insertion_site?: string | null
          notes?: string | null
          patient_id: string
          removal_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_name?: string | null
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          insertion_date?: string
          insertion_site?: string | null
          notes?: string | null
          patient_id?: string
          removal_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_devices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          admission_date: string
          admission_reason: string | null
          base_diseases: string | null
          bed: string | null
          birth_date: string | null
          clinical_data: Json | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          discharge_date: string | null
          discharge_type: string | null
          full_name: string
          gender: string | null
          hospital_id: string
          icu_admission_date: string | null
          id: string
          medical_record: string | null
          notes: string | null
          origin: string | null
          sector: string | null
          source: string
          specialty: string | null
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
        }
        Insert: {
          admission_date?: string
          admission_reason?: string | null
          base_diseases?: string | null
          bed?: string | null
          birth_date?: string | null
          clinical_data?: Json | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          discharge_date?: string | null
          discharge_type?: string | null
          full_name: string
          gender?: string | null
          hospital_id: string
          icu_admission_date?: string | null
          id?: string
          medical_record?: string | null
          notes?: string | null
          origin?: string | null
          sector?: string | null
          source?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Update: {
          admission_date?: string
          admission_reason?: string | null
          base_diseases?: string | null
          bed?: string | null
          birth_date?: string | null
          clinical_data?: Json | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          discharge_date?: string | null
          discharge_type?: string | null
          full_name?: string
          gender?: string | null
          hospital_id?: string
          icu_admission_date?: string | null
          id?: string
          medical_record?: string | null
          notes?: string | null
          origin?: string | null
          sector?: string | null
          source?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_catalog: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          permission_group: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          permission_group: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          permission_group?: string
        }
        Relationships: []
      }
      precautions: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean
          patient_id: string
          precaution_type: string
          reason: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          patient_id: string
          precaution_type: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          patient_id?: string
          precaution_type?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "precautions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      protocol_ai_questions: {
        Row: {
          answer: string | null
          created_at: string
          hospital_id: string
          id: string
          question: string
          source_protocol_ids: string[] | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          question: string
          source_protocol_ids?: string[] | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          question?: string
          source_protocol_ids?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_ai_questions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_ai_questions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          hospital_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          hospital_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          hospital_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_categories_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_categories_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          hospital_id: string
          id: string
          page_number: number | null
          protocol_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          hospital_id: string
          id?: string
          page_number?: number | null
          protocol_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          hospital_id?: string
          id?: string
          page_number?: number | null
          protocol_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_document_chunks_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_document_chunks_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_document_chunks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocol_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_documents: {
        Row: {
          ai_enabled: boolean
          category_id: string | null
          created_at: string
          description: string | null
          document_code: string | null
          expiration_date: string | null
          extracted_text: string | null
          extraction_error: string | null
          extraction_status: string
          file_mime_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          hospital_id: string
          id: string
          issue_date: string | null
          page_count: number | null
          protocol_type: string | null
          responsible_name: string | null
          responsible_role: string | null
          review_date: string | null
          sector: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          ai_enabled?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          document_code?: string | null
          expiration_date?: string | null
          extracted_text?: string | null
          extraction_error?: string | null
          extraction_status?: string
          file_mime_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          hospital_id: string
          id?: string
          issue_date?: string | null
          page_count?: number | null
          protocol_type?: string | null
          responsible_name?: string | null
          responsible_role?: string | null
          review_date?: string | null
          sector?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          ai_enabled?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          document_code?: string | null
          expiration_date?: string | null
          extracted_text?: string | null
          extraction_error?: string | null
          extraction_status?: string
          file_mime_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          hospital_id?: string
          id?: string
          issue_date?: string | null
          page_count?: number | null
          protocol_type?: string | null
          responsible_name?: string | null
          responsible_role?: string | null
          review_date?: string | null
          sector?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "protocol_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_documents_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_documents_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permission_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "hospital_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_action_plans: {
        Row: {
          created_at: string
          hospital_id: string
          how: string | null
          how_much: string | null
          id: string
          nc_id: string | null
          status: string
          updated_at: string
          what: string
          when_date: string | null
          where_sector: string | null
          who: string | null
          why: string | null
        }
        Insert: {
          created_at?: string
          hospital_id: string
          how?: string | null
          how_much?: string | null
          id?: string
          nc_id?: string | null
          status?: string
          updated_at?: string
          what: string
          when_date?: string | null
          where_sector?: string | null
          who?: string | null
          why?: string | null
        }
        Update: {
          created_at?: string
          hospital_id?: string
          how?: string | null
          how_much?: string | null
          id?: string
          nc_id?: string | null
          status?: string
          updated_at?: string
          what?: string
          when_date?: string | null
          where_sector?: string | null
          who?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scih_action_plans_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_action_plans_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_action_plans_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "scih_ncs"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_audit_schedules: {
        Row: {
          audit_type: string | null
          completed: boolean | null
          created_at: string
          hospital_id: string
          id: string
          planned_date: string
          responsible: string | null
          sector_key: string
        }
        Insert: {
          audit_type?: string | null
          completed?: boolean | null
          created_at?: string
          hospital_id: string
          id?: string
          planned_date: string
          responsible?: string | null
          sector_key: string
        }
        Update: {
          audit_type?: string | null
          completed?: boolean | null
          created_at?: string
          hospital_id?: string
          id?: string
          planned_date?: string
          responsible?: string | null
          sector_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "scih_audit_schedules_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_audit_schedules_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_iras_indicators: {
        Row: {
          cases: number
          created_at: string
          denominator: number
          hospital_id: string
          id: string
          indicator_type: string
          observations: string | null
          period: string | null
          sector: string | null
        }
        Insert: {
          cases?: number
          created_at?: string
          denominator?: number
          hospital_id: string
          id?: string
          indicator_type: string
          observations?: string | null
          period?: string | null
          sector?: string | null
        }
        Update: {
          cases?: number
          created_at?: string
          denominator?: number
          hospital_id?: string
          id?: string
          indicator_type?: string
          observations?: string | null
          period?: string | null
          sector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scih_iras_indicators_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_iras_indicators_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_kanban_cards: {
        Row: {
          card_order: number | null
          column_id: string
          created_at: string
          deadline: string | null
          hospital_id: string
          id: string
          priority: string | null
          sector: string | null
          title: string
        }
        Insert: {
          card_order?: number | null
          column_id?: string
          created_at?: string
          deadline?: string | null
          hospital_id: string
          id?: string
          priority?: string | null
          sector?: string | null
          title: string
        }
        Update: {
          card_order?: number | null
          column_id?: string
          created_at?: string
          deadline?: string | null
          hospital_id?: string
          id?: string
          priority?: string | null
          sector?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scih_kanban_cards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_kanban_cards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_module_data: {
        Row: {
          data: Json
          hospital_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          data?: Json
          hospital_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          data?: Json
          hospital_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scih_nc_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          nc_id: string
          observation: string | null
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          nc_id: string
          observation?: string | null
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          nc_id?: string
          observation?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scih_nc_history_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "scih_ncs"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_ncs: {
        Row: {
          audit_date: string | null
          audit_id: string | null
          created_at: string
          hospital_id: string
          id: string
          observation: string | null
          question: string
          sector_key: string
          sector_name: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          audit_date?: string | null
          audit_id?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          observation?: string | null
          question: string
          sector_key: string
          sector_name: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          audit_date?: string | null
          audit_id?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          observation?: string | null
          question?: string
          sector_key?: string
          sector_name?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scih_ncs_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "scih_sector_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_ncs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_ncs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_risk_items: {
        Row: {
          contingency_plan: string | null
          created_at: string
          description: string
          hospital_id: string
          id: string
          impact: number
          probability: number
          sector: string | null
        }
        Insert: {
          contingency_plan?: string | null
          created_at?: string
          description: string
          hospital_id: string
          id?: string
          impact: number
          probability: number
          sector?: string | null
        }
        Update: {
          contingency_plan?: string | null
          created_at?: string
          description?: string
          hospital_id?: string
          id?: string
          impact?: number
          probability?: number
          sector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scih_risk_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_risk_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_sector_audits: {
        Row: {
          audit_date: string
          audit_time: string | null
          audit_type: string
          auditor_id: string | null
          auditor_name: string | null
          compliance_rate: number | null
          compliant_items: number
          created_at: string
          hospital_id: string
          id: string
          na_items: number
          nc_items: number
          observations: string | null
          partial_items: number
          participants: string | null
          responsible_name: string | null
          sector_key: string
          sector_name: string
          total_items: number
          updated_at: string
        }
        Insert: {
          audit_date?: string
          audit_time?: string | null
          audit_type?: string
          auditor_id?: string | null
          auditor_name?: string | null
          compliance_rate?: number | null
          compliant_items?: number
          created_at?: string
          hospital_id: string
          id?: string
          na_items?: number
          nc_items?: number
          observations?: string | null
          partial_items?: number
          participants?: string | null
          responsible_name?: string | null
          sector_key: string
          sector_name: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          audit_date?: string
          audit_time?: string | null
          audit_type?: string
          auditor_id?: string | null
          auditor_name?: string | null
          compliance_rate?: number | null
          compliant_items?: number
          created_at?: string
          hospital_id?: string
          id?: string
          na_items?: number
          nc_items?: number
          observations?: string | null
          partial_items?: number
          participants?: string | null
          responsible_name?: string | null
          sector_key?: string
          sector_name?: string
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scih_sector_audits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_sector_audits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_sector_responses: {
        Row: {
          audit_id: string
          created_at: string
          group_name: string
          id: string
          item_index: number
          observation: string | null
          question: string
          response: string | null
        }
        Insert: {
          audit_id: string
          created_at?: string
          group_name: string
          id?: string
          item_index: number
          observation?: string | null
          question: string
          response?: string | null
        }
        Update: {
          audit_id?: string
          created_at?: string
          group_name?: string
          id?: string
          item_index?: number
          observation?: string | null
          question?: string
          response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scih_sector_responses_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "scih_sector_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      scih_swot_items: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          quadrant: string
          sector_key: string
          text: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          quadrant: string
          sector_key: string
          text: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          quadrant?: string
          sector_key?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "scih_swot_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scih_swot_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_types: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          label: string
          value: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          label: string
          value: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          label?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_types_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_types_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          bed_count: number | null
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          bed_count?: number | null
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          bed_count?: number | null
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sectors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      user_direct_permissions: {
        Row: {
          created_at: string
          granted: boolean
          granted_by: string | null
          hospital_id: string
          id: string
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          hospital_id: string
          id?: string
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          hospital_id?: string
          id?: string
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_direct_permissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_direct_permissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_direct_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permission_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      user_hospital_roles: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          is_admin: boolean
          role_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          role_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          role_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hospital_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hospital_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hospital_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "hospital_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          description: string | null
          hospital_id: string | null
          id: string
          is_system: boolean
          role: Database["public"]["Enums"]["app_role"]
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_system?: boolean
          role: Database["public"]["Enums"]["app_role"]
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_system?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      hospitals_summary: {
        Row: {
          bed_count: number | null
          city: string | null
          created_at: string | null
          id: string | null
          name: string | null
          state: string | null
          status: Database["public"]["Enums"]["hospital_status"] | null
          type: string | null
        }
        Insert: {
          bed_count?: number | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["hospital_status"] | null
          type?: string | null
        }
        Update: {
          bed_count?: number | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["hospital_status"] | null
          type?: string | null
        }
        Relationships: []
      }
      managed_users_view: {
        Row: {
          email: string | null
          full_name: string | null
          hospital_id: string | null
          is_active: boolean | null
          is_admin: boolean | null
          role_id: string | null
          role_name: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_users_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_users_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_users_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_hospital_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "hospital_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_primary_admin_hospital_ids: { Args: never; Returns: string[] }
      get_user_hospital_ids: { Args: { _user_id: string }; Returns: string[] }
      has_any_super_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hospital_admin: { Args: { p_hospital_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      match_protocol_chunks: {
        Args: {
          match_count?: number
          match_hospital_id: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          page_number: number
          protocol_id: string
          similarity: number
          title: string
        }[]
      }
      trigger_monthly_antibiogram_reports: {
        Args: { _api_key: string; _function_url: string }
        Returns: undefined
      }
      user_has_hospital: { Args: { p_hospital_id: string }; Returns: boolean }
      user_has_permission: {
        Args: {
          target_hospital_id: string
          target_permission: string
          target_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high" | "critical"
      alert_status: "active" | "acknowledged" | "resolved" | "dismissed"
      app_role:
        | "super_admin"
        | "hospital_admin"
        | "nurse_ccih"
        | "doctor"
        | "lab_tech"
        | "viewer"
        | "doctor_scih"
        | "nurse_tech_scih"
        | "biologist"
        | "administrative"
      audit_item_status:
        | "compliant"
        | "non_compliant"
        | "not_applicable"
        | "not_evaluated"
      audit_type:
        | "bundles"
        | "hand_hygiene"
        | "infection_control"
        | "dispenser"
        | "cti_infrastructure"
        | "antibiogram"
        | "precaution"
        | "hand_hygiene_consumption"
        | "construction_renovation"
      case_status:
        | "open"
        | "investigating"
        | "confirmed"
        | "discarded"
        | "closed"
      device_type: "cvc" | "svu" | "vm" | "other"
      hospital_status: "active" | "inactive" | "pending"
      lab_result_status: "pending" | "partial" | "completed"
      patient_status: "active" | "discharged" | "transferred" | "deceased"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["low", "medium", "high", "critical"],
      alert_status: ["active", "acknowledged", "resolved", "dismissed"],
      app_role: [
        "super_admin",
        "hospital_admin",
        "nurse_ccih",
        "doctor",
        "lab_tech",
        "viewer",
        "doctor_scih",
        "nurse_tech_scih",
        "biologist",
        "administrative",
      ],
      audit_item_status: [
        "compliant",
        "non_compliant",
        "not_applicable",
        "not_evaluated",
      ],
      audit_type: [
        "bundles",
        "hand_hygiene",
        "infection_control",
        "dispenser",
        "cti_infrastructure",
        "antibiogram",
        "precaution",
        "hand_hygiene_consumption",
        "construction_renovation",
      ],
      case_status: [
        "open",
        "investigating",
        "confirmed",
        "discarded",
        "closed",
      ],
      device_type: ["cvc", "svu", "vm", "other"],
      hospital_status: ["active", "inactive", "pending"],
      lab_result_status: ["pending", "partial", "completed"],
      patient_status: ["active", "discharged", "transferred", "deceased"],
    },
  },
} as const
