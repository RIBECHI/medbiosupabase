'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AddQuoteForm } from '@/components/quotes/AddQuoteForm';

export default function QuotesPage() {
    const [isAddQuoteSheetOpen, setAddQuoteSheetOpen] = useState(false);

    const quotesQuery = useMemo<Query<Quote> | null>(() => {
      if (!firestore) return null;
    }, [firestore]);


    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        let dateObj: Date | null = null;
        if (date instanceof Timestamp) {
            dateObj = date.toDate();
        } else if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            dateObj = new Date(date);
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            return format(dateObj, 'dd/MM/yyyy');
        }
        
        return 'N/A';
    }
    
    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const getStatusVariant = (status: Quote['status']) => {
        switch (status) {
            case 'Aprovado': return 'default';
            case 'Recusado': return 'destructive';
            case 'Pendente': return 'secondary';
            default: return 'outline';
        }
    };

  return (
    <>
      <PageHeader title="Orçamentos" description="Crie e gerencie orçamentos para seus clientes.">
        <Button onClick={() => setAddQuoteSheetOpen(true)} disabled={loading}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Orçamento
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
            <div className="py-4">
                <Input placeholder="Buscar orçamentos..." className="max-w-sm"/>
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                 ))
              ) : (
                quotes?.map((quote) => (
                    <TableRow key={quote.id}>
                    <TableCell>
                        <Link href={`/clients/${quote.clientId}`} className="font-medium hover:underline">
                            {quote.clientName}
                        </Link>
                    </TableCell>
                    <TableCell>{formatDate(quote.date)}</TableCell>
                    <TableCell>{formatCurrency(quote.totalAmount)}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem disabled>Ver Detalhes</DropdownMenuItem>
                                <DropdownMenuItem disabled>Editar</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
              )}
               {!loading && quotes?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum orçamento encontrado.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddQuoteForm 
        isOpen={isAddQuoteSheetOpen} 
        onOpenChange={setAddQuoteSheetOpen} 
      />
    </>
  );
}
