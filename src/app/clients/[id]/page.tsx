'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FileText, Stethoscope, Home, StickyNote, Info, MessageSquare, PlusCircle, Edit } from 'lucide-react';
import { TreatmentPlanRecommender } from '@/components/clients/TreatmentPlanRecommender';
import { ClientTreatmentHistory } from '@/components/clients/ClientTreatmentHistory';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient as createSupabase } from '@/lib/supabase/client';
import type { Client, Quote, TreatmentPlan } from '@/lib/supabase/types';

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabase();
  const [client, setClient] = useState<Client | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [clientRes, quotesRes, plansRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', params.id).single(),
      supabase.from('quotes').select('*').eq('client_id', params.id),
      supabase.from('treatment_plans').select('*').eq('client_id', params.id),
    ]);
    if (clientRes.data) setClient(clientRes.data);
    if (quotesRes.data) setQuotes(quotesRes.data);
    if (plansRes.data) setTreatmentPlans(plansRes.data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatDate = (date?: string, fmt = 'dd/MM/yyyy') => {
    if (!date) return 'N/A';
    try { return format(parseISO(date), fmt, { locale: ptBR }); } catch { return 'N/A'; }
  };

  const beforeAfterImages = [
    PlaceHolderImages.find(img => img.id === 'before1'),
    PlaceHolderImages.find(img => img.id === 'after1'),
    PlaceHolderImages.find(img => img.id === 'before2'),
    PlaceHolderImages.find(img => img.id === 'after2'),
  ].filter((img): img is ImagePlaceholder => !!img);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button asChild className="mt-4"><Link href="/clients">Voltar para Clientes</Link></Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={<span className="text-primary">{client.display_name}</span>}
        description={`Detalhes do cliente desde ${formatDate(client.join_date)}`}
      >
        <Button variant="outline" asChild>
          <Link href={`/clients/${client.id}/edit`}><Edit className="mr-2 h-4 w-4" />Editar</Link>
        </Button>
        <Button asChild>
          <Link href={`/conversations?phone=${client.phone?.replace(/\D/g, '')}`}>
            <MessageSquare className="mr-2 h-4 w-4" />Ver Conversa
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
            <Image
              src={client.photo_url || `https://picsum.photos/seed/${client.id}/200/200`}
              alt={client.display_name} width={120} height={120} className="rounded-full object-cover" />
            <div>
              <h2 className="text-xl font-semibold">{client.display_name}</h2>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
            <Separator />
            <div className="w-full text-left space-y-2 text-sm">
              <p><span className="font-medium">Telefone:</span> {client.phone || 'Não informado'}</p>
              <p><span className="font-medium">CPF:</span> {client.cpf || 'Não informado'}</p>
              <p><span className="font-medium">Nascimento:</span> {client.dob ? format(new Date(client.dob + 'T00:00:00'), 'dd/MM/yyyy') : 'Não informado'}</p>
              <p><span className="font-medium">Endereço:</span> {client.address || 'Não informado'}</p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="tratamentos">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tratamentos"><Stethoscope className="h-4 w-4 mr-1" />Tratamentos</TabsTrigger>
              <TabsTrigger value="orcamentos"><FileText className="h-4 w-4 mr-1" />Orçamentos</TabsTrigger>
              <TabsTrigger value="notas"><StickyNote className="h-4 w-4 mr-1" />Notas</TabsTrigger>
              <TabsTrigger value="ia"><Info className="h-4 w-4 mr-1" />IA</TabsTrigger>
            </TabsList>

            <TabsContent value="tratamentos" className="mt-4 space-y-4">
              <ClientTreatmentHistory clientId={client.id} />
            </TabsContent>

            <TabsContent value="orcamentos" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Orçamentos</CardTitle>
                  <Button size="sm" asChild>
                    <Link href={`/quotes?clientId=${client.id}&clientName=${encodeURIComponent(client.display_name)}`}>
                      <PlusCircle className="mr-2 h-4 w-4" />Novo Orçamento
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {quotes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum orçamento encontrado.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotes.map(q => (
                          <TableRow key={q.id}>
                            <TableCell>{formatDate(q.date)}</TableCell>
                            <TableCell><Badge variant="outline">{q.status}</Badge></TableCell>
                            <TableCell>R$ {q.total_amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notas" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {client.notes || 'Nenhuma observação registrada.'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ia" className="mt-4">
              <TreatmentPlanRecommender client={client as any} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
