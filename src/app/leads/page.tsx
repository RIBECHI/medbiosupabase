
'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { ClientOnlyLeadPipeline } from '@/components/leads/ClientOnlyLeadPipeline';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title={<span className="text-destructive">Funil de Vendas</span>}
        description="Gerencie seus leads através das etapas de atendimento."
      />
      <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <ClientOnlyLeadPipeline />
      </Suspense>
    </>
  );
}

    