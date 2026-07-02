export type ProtocolStatus = 'draft' | 'active' | 'archived' | 'expired';
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProtocolCategory {
  id: string;
  hospital_id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProtocolDocument {
  id: string;
  hospital_id: string;
  category_id?: string | null;
  title: string;
  description?: string | null;
  sector?: string | null;
  protocol_type?: string | null;
  document_code?: string | null;
  version?: string | null;
  status: ProtocolStatus;
  responsible_name?: string | null;
  responsible_role?: string | null;
  issue_date?: string | null;
  review_date?: string | null;
  expiration_date?: string | null;
  tags?: string[] | null;
  file_name: string;
  file_path: string;
  file_mime_type?: string | null;
  file_size?: number | null;
  extracted_text?: string | null;
  extraction_status: ExtractionStatus;
  extraction_error?: string | null;
  page_count?: number | null;
  ai_enabled: boolean;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
  protocol_categories?: ProtocolCategory | null;
}

export interface ProtocolUploadInput {
  hospitalId: string;
  categoryId?: string | null;
  title: string;
  description?: string;
  sector?: string;
  protocolType?: string;
  documentCode?: string;
  version?: string;
  responsibleName?: string;
  responsibleRole?: string;
  issueDate?: string;
  reviewDate?: string;
  expirationDate?: string;
  tags?: string[];
  aiEnabled?: boolean;
  file: File;
}

export interface ProtocolAISource {
  protocol_id: string;
  title: string;
  page_number?: number | null;
  content: string;
  similarity?: number;
}

export interface ProtocolAIAnswer {
  answer: string;
  sources: ProtocolAISource[];
}

export interface ProtocolDashboardData {
  total: number;
  active: number;
  expired: number;
  expiringSoon: number;
  aiReady: number;
  failed: number;
  bySector: Record<string, number>;
}
