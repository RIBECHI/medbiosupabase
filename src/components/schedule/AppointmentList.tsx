
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Appointment } from '@/lib/types';
import { appointmentConverter } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, Info } from 'lucide-react';
import Link from 'next/link';

type AppointmentListProps = {
  selectedDate?: Date;
};

export function AppointmentList({ selectedDate }: AppointmentListProps) {
  const firestore = useFirestore();

  const appointmentsQuery = useMemo(() => {
    if (!firestore || !selectedDate) return null;
    
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    return query(
      collection(firestore, 'appointments'),
      where('date', '==', formattedDate),
      orderBy('startTime'),
      limit(50)
    ).withConverter(appointmentConverter);
  }, [firestore, selectedDate]);

  const { data: appointments, loading } = useCollection<Appointment>(appointmentsQuery, {
    snapshot: false
  });

  const sortedAppointments = useMemo(() => {
    if (!appointments) return [];
    return [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments]);


  const getStatusVariant = (status: Appointment['status']) => {
    switch (status) {
      case 'Confirmado': return 'default';
      case 'Concluído': return 'secondary';
      case 'Cancelado': return 'destructive';
      case 'Pendente': return 'outline';
      default: return 'outline';
    }
  };

  if (!selectedDate) {
     return (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <Calendar className="w-8 h-8 mb-2" />
            <p>Selecione uma data no calendário para ver os agendamentos.</p>
        </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!sortedAppointments || sortedAppointments.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <Info className="w-8 h-8 mb-2" />
            <p>Nenhuma consulta encontrada para este dia.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedAppointments.map((appointment) => (
        <div key={appointment.id} className="flex items-start gap-4">
          <div className="text-center w-20">
            <p className="font-bold text-lg">{appointment.startTime}</p>
            <p className="text-sm text-muted-foreground">às {appointment.endTime}</p>
          </div>
          <div className="flex-1 p-4 rounded-md border bg-muted/50">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold">{appointment.serviceName}</h4>
                    <p className="text-sm text-muted-foreground">
                        Cliente: 
                        <Link href={`/clients/${appointment.clientId}`} className="text-primary hover:underline ml-1">
                            {appointment.clientName}
                        </Link>
                    </p>
                </div>
                <Badge variant={getStatusVariant(appointment.status)}>{appointment.status}</Badge>
            </div>
            {appointment.notes && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                    <strong>Obs:</strong> {appointment.notes}
                </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
