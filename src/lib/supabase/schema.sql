-- ============================================
-- Med Bio — Schema Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

create extension if not exists "uuid-ossp";

create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  display_name text not null,
  email text,
  phone text,
  cpf text,
  photo_url text,
  join_date timestamptz default now(),
  dob text,
  address text,
  notes text,
  demographics jsonb,
  medical_history text[],
  consent_forms jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists treatments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  date timestamptz not null,
  service_name text not null,
  professional text not null,
  price numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  service_name text not null,
  date text not null,
  start_time text not null,
  end_time text not null,
  status text not null default 'Pendente',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category text,
  duration integer default 60,
  price numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  stock integer not null default 0,
  max_stock integer not null default 100,
  low_stock_threshold integer not null default 10,
  last_restock text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists lead_stages (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  "order" integer not null default 0,
  color text not null default '#cccccc',
  description text,
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  source text,
  status text not null default 'Novo',
  owner text,
  potential_value numeric(10,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists lead_history (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  date timestamptz default now(),
  interaction_type text not null,
  summary text not null,
  next_action text,
  next_action_date text,
  created_at timestamptz default now()
);

create table if not exists quotes (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  date timestamptz default now(),
  status text not null default 'Pendente',
  items jsonb not null default '[]',
  total_amount numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists whatsapp_messages (
  id uuid primary key default uuid_generate_v4(),
  client_name text not null default 'Desconhecido',
  client_phone text not null,
  sender_phone text,
  content text not null default '',
  message text not null default '',
  sent_date timestamptz default now(),
  is_read boolean not null default false,
  is_client boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists idx_wa_phone on whatsapp_messages(client_phone);
create index if not exists idx_wa_date on whatsapp_messages(sent_date desc);
create index if not exists idx_wa_read on whatsapp_messages(is_read);

create table if not exists n8n_logs (
  id uuid primary key default uuid_generate_v4(),
  received_at timestamptz default now(),
  data jsonb not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists settings (
  id text primary key default 'general',
  logo_url text,
  n8n_training_webhook_url text,
  updated_at timestamptz default now()
);
insert into settings (id) values ('general') on conflict (id) do nothing;

create table if not exists ai_training_data (
  id uuid primary key default uuid_generate_v4(),
  topic text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists system_users (
  id uuid primary key default uuid_generate_v4(),
  display_name text not null,
  email text not null unique,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists treatment_plans (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  start_date timestamptz default now(),
  status text not null default 'Ativo',
  sessions jsonb not null default '[]',
  notes text,
  total_value numeric(10,2) default 0,
  progress_notes text,
  client_feedback text,
  current_treatment_plan text,
  pre_care_instructions text,
  post_care_instructions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilita Realtime apenas para mensagens (necessário para conversas em tempo real)
alter publication supabase_realtime add table whatsapp_messages;
