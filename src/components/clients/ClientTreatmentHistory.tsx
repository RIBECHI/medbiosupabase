
'use client';

import { useMemo, useState } from 'react';
import type { Client, Treatment } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, PlusCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { AddTreatmentForm } from './AddTreatmentForm';
import { collection, query, orderBy } from 'firebase/firestore';
import { treatmentConverter } from '@/lib/types';

export function ClientTreatmentHistory({ client }: { client: Client }) {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const firestore = useFirestore();

  const treatmentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'clients', client.id, 'treatments'),
        orderBy('date', 'desc')
    ).withConverter(treatmentConverter);
  }, [firestore, client.id]);
  
  const { data: clientTreatments, loading } = useCollection<Treatment>(treatmentsQuery, {snapshot: false});

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    let dateObj: Date | null = null;
    if (date instanceof Date) dateObj = date;
    else if (typeof date === 'string') dateObj = new Date(date);

    return dateObj && !isNaN(dateObj.getTime())
      ? format(dateObj, 'dd/MM/yyyy', { locale: ptBR })
      : 'Data inválida';
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Histórico de Tratamentos</CardTitle>
                <CardDescription>
                    Todos os procedimentos realizados para {client.displayName}.
                </CardDescription>
            </div>
            <Button onClick={() => setSheetOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Tratamento
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Serviço Realizado</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : clientTreatments && clientTreatments.length > 0 ? (
              clientTreatments.map((treatment) => (
                <TableRow key={treatment.id}>
                  <TableCell>{formatDate(treatment.date)}</TableCell>
                  <TableCell className="font-medium">
                    {treatment.serviceName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{treatment.professional}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(treatment.price)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                        <Info className="w-8 h-8 mb-2" />
                        <p>Nenhum tratamento registrado para este cliente.</p>
                    </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    <AddTreatmentForm
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        client={client}
    />
    </>
  );
}
