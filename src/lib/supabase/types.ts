// Tipos TypeScript espelhando o schema do Supabase

export type Client = {
  id: string;
  display_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  photo_url?: string;
  join_date?: string;
  dob?: string;
  address?: string;
  notes?: string;
  demographics?: { age: number; gender: string; location: string };
  medical_history?: string[];
  consent_forms?: { name: string; status: 'Assinado' | 'Pendente'; date: string }[];
  created_at?: string;
  updated_at?: string;
};

export type Treatment = {
  id: string;
  client_id: string;
  date: string;
  service_name: string;
  professional: string;
  price: number;
  notes?: string;
  created_at?: string;
};

export type Appointment = {
  id: string;
  client_id?: string;
  client_name: string;
  service_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'Confirmado' | 'Pendente' | 'Cancelado' | 'Concluído';
  notes?: string;
  created_at?: string;
};

export type Service = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  duration: number;
  price: number;
  created_at?: string;
};

export type Product = {
  id: string;
  name: string;
  category?: string;
  stock: number;
  max_stock: number;
  low_stock_threshold: number;
  last_restock?: string;
  created_at?: string;
};

export type LeadStage = {
  id: string;
  name: string;
  order: number;
  color: string;
  description?: string;
};

export type Lead = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: string;
  owner?: string;
  potential_value?: number;
  notes?: string;
  created_at?: string;
};

export type LeadHistory = {
  id: string;
  lead_id: string;
  date: string;
  interaction_type: string;
  summary: string;
  next_action?: string;
  next_action_date?: string;
  created_at?: string;
};

export type Quote = {
  id: string;
  client_id?: string;
  client_name: string;
  date: string;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  items: { description: string; quantity: number; unitPrice: number }[];
  total_amount: number;
  notes?: string;
  created_at?: string;
};

export type WhatsAppMessage = {
  id: string;
  client_name: string;
  client_phone: string;
  sender_phone?: string;
  content: string;
  message: string;
  sent_date: string;
  is_read: boolean;
  is_client: boolean;
  created_at?: string;
};

export type N8nLog = {
  id: string;
  received_at: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at?: string;
};

export type Settings = {
  id: string;
  logo_url?: string;
  n8n_training_webhook_url?: string;
  updated_at?: string;
};

export type AITrainingData = {
  id: string;
  topic: string;
  content: string;
  created_at?: string;
};

export type TreatmentPlan = {
  id: string;
  client_id: string;
  name: string;
  start_date?: string;
  status: 'Ativo' | 'Concluído' | 'Em Espera';
  sessions: {
    sessionNumber: number;
    date: string;
    description: string;
    completed: boolean;
  }[];
  notes?: string;
  total_value?: number;
  progress_notes?: string;
  client_feedback?: string;
  current_treatment_plan?: string;
  pre_care_instructions?: string;
  post_care_instructions?: string;
  created_at?: string;
};
