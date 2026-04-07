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
      antibiogram_results: {
        Row: {
          antibiotic: string
          created_at: string
          id: string
          lab_result_id: string
          mic_value: number | null
          notes: string | null
          sensitivity: string
        }
        Insert: {
          antibiotic: string
          created_at?: string
          id?: string
          lab_result_id: string
          mic_value?: number | null
          notes?: string | null
          sensitivity: string
        }
        Update: {
          antibiotic?: string
          created_at?: string
          id?: string
          lab_result_id?: string
          mic_value?: number | null
          notes?: string | null
          sensitivity?: string
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
      hospital_users: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          is_primary_admin: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          is_primary_admin?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
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
        ]
      }
      hospitals: {
        Row: {
          bed_count: number | null
          city: string | null
          cnes: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          state: string | null
          status: Database["public"]["Enums"]["hospital_status"]
          type: string
          updated_at: string
        }
        Insert: {
          bed_count?: number | null
          city?: string | null
          cnes?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          state?: string | null
          status?: Database["public"]["Enums"]["hospital_status"]
          type?: string
          updated_at?: string
        }
        Update: {
          bed_count?: number | null
          city?: string | null
          cnes?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string | null
          status?: Database["public"]["Enums"]["hospital_status"]
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      isc_record_indicators: {
        Row: {
          contatos_atendidos: number
          created_at: string
          id: string
          isc_confirmada: number
          isc_record_id: string
          procedimento: string
          reinternacoes: number
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
      lab_results: {
        Row: {
          collection_date: string
          created_at: string
          created_by: string | null
          hospital_id: string
          id: string
          notes: string | null
          organism: string | null
          patient_id: string | null
          result_date: string | null
          sample_type: string | null
          status: Database["public"]["Enums"]["lab_result_status"]
          updated_at: string
        }
        Insert: {
          collection_date?: string
          created_at?: string
          created_by?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          organism?: string | null
          patient_id?: string | null
          result_date?: string | null
          sample_type?: string | null
          status?: Database["public"]["Enums"]["lab_result_status"]
          updated_at?: string
        }
        Update: {
          collection_date?: string
          created_at?: string
          created_by?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          organism?: string | null
          patient_id?: string | null
          result_date?: string | null
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
          bed: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          discharge_date: string | null
          full_name: string
          gender: string | null
          hospital_id: string
          id: string
          medical_record: string | null
          notes: string | null
          sector: string | null
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
        }
        Insert: {
          admission_date?: string
          bed?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          discharge_date?: string | null
          full_name: string
          gender?: string | null
          hospital_id: string
          id?: string
          medical_record?: string | null
          notes?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Update: {
          admission_date?: string
          bed?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          discharge_date?: string | null
          full_name?: string
          gender?: string | null
          hospital_id?: string
          id?: string
          medical_record?: string | null
          notes?: string | null
          sector?: string | null
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
    }
    Functions: {
      get_user_hospital_ids: { Args: { _user_id: string }; Returns: string[] }
      has_any_super_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
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
