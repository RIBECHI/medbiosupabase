
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LeadPipeline } from './LeadPipeline';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

function PipelineSkeleton() {
    const defaultStatuses = ['Novo Lead', 'Contato', 'Qualificação', 'Agendado', 'Negociação', 'Vendido'];
    
    return (
        <div className="h-full flex flex-col">
             <div className="flex items-center justify-between mb-4 shrink-0">
                <Skeleton className="h-10 w-44" />
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-48" />
                </div>
            </div>
            <div className="flex flex-1 gap-6 overflow-x-auto p-1">
                {defaultStatuses.map((status) => (
                    <div key={status} className="w-[300px] shrink-0">
                        <div className="p-4 bg-muted/50 rounded-lg h-full">
                            <h3 className="font-semibold text-md mb-4 flex justify-between items-center">
                                <Skeleton className="h-5 w-32" />
                                <Badge variant="secondary" className="rounded-full">0</Badge>
                            </h3>
                            <div className="space-y-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ClientOnlyLeadPipeline() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This hook ensures that the component is mounted on the client-side
    // before rendering the DndContext, which is not SSR-friendly.
    setIsClient(true);
  }, []);
  
  const searchParams = useSearchParams();

  if (!isClient) {
    return <PipelineSkeleton />;
  }

  // Pass searchParams to the component that uses it
  return <LeadPipeline searchParams={searchParams} />;
}

    