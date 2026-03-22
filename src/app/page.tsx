

'use client';

import { useMemo } from 'react';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

import { kpis as staticKpis } from '@/lib/placeholder-data';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClientDemographicsChart } from '@/components/dashboard/ClientDemographicsChart';
import { DataPatternDetector } from '@/components/dashboard/DataPatternDetector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {

  const clientsQuery = useMemo(() => {
    if (!firestore) return null;
  }, [firestore?.app.name]);


  const dynamicKpis = useMemo(() => {
    if (loadingClients || !clients) {
      return [
        { label: 'Novos Clientes', value: '...', description: 'Calculando...' },
        ...staticKpis.slice(1), // Keep other static KPIs
      ];
    }

    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);
    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    const endOfLastMonth = endOfMonth(subMonths(now, 1));

    const newClientsThisMonth = clients.filter(c => {
      if (!c.joinDate || !(c.joinDate instanceof Timestamp)) return false;
      const joinDate = c.joinDate.toDate();
      return joinDate >= startOfThisMonth && joinDate <= endOfThisMonth;
    }).length;

    const newClientsLastMonth = clients.filter(c => {
      if (!c.joinDate || !(c.joinDate instanceof Timestamp)) return false;
      const joinDate = c.joinDate.toDate();
      return joinDate >= startOfLastMonth && joinDate <= endOfLastMonth;
    }).length;

    const change = newClientsThisMonth - newClientsLastMonth;
    const changeType = change >= 0 ? 'increase' : 'decrease';
    const changePrefix = change > 0 ? '+' : '';

    const newClientsKpi: Kpi = {
      label: 'Novos Clientes',
      value: newClientsThisMonth.toString(),
      change: `${changePrefix}${change}`,
      changeType: changeType,
      description: 'em relação ao mês anterior',
    };

    return [newClientsKpi, ...staticKpis.slice(1)];
  }, [clients, loadingClients]);

  return (
    <>
      <PageHeader
        title={<span className="text-accent-foreground">Painel</span>}
        description="Uma visão geral do desempenho da sua clínica."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingClients ? (
            Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                </Card>
            ))
        ) : (
            dynamicKpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} />
            ))
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Demografia dos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientDemographicsChart />
          </CardContent>
        </Card>
        <div className="lg:col-span-2 flex flex-col">
           <DataPatternDetector />
        </div>
      </div>
    </>
  );
}
