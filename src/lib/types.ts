// Este arquivo mantém apenas os tipos de IA (Genkit) que não dependem do Firebase
// Os tipos de dados do sistema estão em src/lib/supabase/types.ts

export type Kpi = {
  label: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  description: string;
};
