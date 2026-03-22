'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { FileText, Stethoscope, Home, Gift, StickyNote, Info, MessageSquare, PlusCircle, UserSquare, Edit } from 'lucide-react';
import { TreatmentPlanRecommender } from '@/components/clients/TreatmentPlanRecommender';
import { ClientTreatmentHistory } from '@/components/clients/ClientTreatmentHistory';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Timestamp, collection, doc, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import type { Client, TreatmentPlan, Quote } from '@/lib/types';
import { clientConverter, quoteConverter, treatmentPlanConverter } from '@/lib/types';


export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const firestore = useFirestore();

  const clientRef = useMemo(() => {
    if (!firestore || !params.id) return null;
    return doc(firestore, 'clients', params.id).withConverter(clientConverter);
  }, [firestore, params.id]);

  const quotesQuery = useMemo(() => {
    if (!firestore || !params.id) return null;
    return query(collection(firestore, 'quotes'), where('clientId', '==', params.id)).withConverter(quoteConverter);
  }, [firestore, params.id]);

  const treatmentPlansQuery = useMemo(() => {
    if (!firestore || !params.id) return null;
    return query(collection(firestore, 'clients', params.id, 'treatmentPlans')).withConverter(treatmentPlanConverter);
  }, [firestore, params.id]);

  const { data: client, loading: loadingClient } = useDoc<Client>(clientRef);
  const { data: clientQuotes, loading: loadingQuotes } = useCollection<Quote>(quotesQuery, { snapshot: false });
  const { data: clientTreatmentPlans, loading: loadingPlans } = useCollection<TreatmentPlan>(treatmentPlansQuery, { snapshot: false });
  
  const loading = loadingClient || loadingQuotes || loadingPlans;

  const beforeAfterImages = [
    PlaceHolderImages.find(img => img.id === 'before1'),
    PlaceHolderImages.find(img => img.id === 'after1'),
    PlaceHolderImages.find(img => img.id === 'before2'),
    PlaceHolderImages.find(img => img.id === 'after2'),
  ].filter((img): img is ImagePlaceholder => !!img);

  const formatDate = (date: any, targetFormat: string = 'dd/MM/yyyy') => {
    if (!date) return 'N/A';
    let dateObj: Date | null = null;

    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      const parsed = parseISO(date);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      } else {
        const utcDate = new Date(date + 'T00:00:00');
        if (!isNaN(utcDate.getTime())) {
          dateObj = utcDate;
        }
      }
    }

    return dateObj && !isNaN(dateObj.getTime()) ? format(dateObj, targetFormat, { locale: ptBR }) : 'N/A';
  }
  
  function TreatmentPlanList({ client, plans }: { client: Client, plans: TreatmentPlan[] }) {
    if (loading) {
        return <Skeleton className="h-40 w-full" />;
    }

    if (!plans || plans.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-primary">Nenhum Plano de Tratamento Ativo</CardTitle>
                    <CardDescription>Este cliente ainda não possui um plano de tratamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button disabled>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Criar Plano de Tratamento
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    const firstPlan = plans[0];

    return <TreatmentPlanRecommender plan={firstPlan} />;
  }

  function ClientQuotesList() {
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

      if (loading) {
          return <Skeleton className="h-40 w-full" />;
      }

      if (!clientQuotes || clientQuotes.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <Info className="w-8 h-8 mb-2" />
                  <p>Nenhum orçamento encontrado para este cliente.</p>
              </div>
          );
      }

      return (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {clientQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                          <TableCell>{formatDate(quote.date)}</TableCell>
                          <TableCell>{formatCurrency(quote.totalAmount)}</TableCell>
                          <TableCell><Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge></TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      );
  }

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <>
        <PageHeader title={<Skeleton className="h-8 w-48" />} description={<Skeleton className="h-4 w-64" />} showBackButton />
        <Card>
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!client && !loading) {
    notFound();
  }

  // Fallback while client is defined but loading might still be finalizing other things
  if (!client) {
    return <PageHeader title="Carregando cliente..." showBackButton />;
  }

  return (
    <>
      <PageHeader title={<span className="text-primary">{client.displayName}</span>} description={`Cliente desde ${formatDate(client.joinDate)}`} showBackButton>
        <Button variant="outline" onClick={() => router.push(`/clients/${client.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar Perfil
        </Button>
        <Button onClick={() => router.push('/schedule')}>Novo Agendamento</Button>
      </PageHeader>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="history">Histórico de Tratamentos</TabsTrigger>
          <TabsTrigger value="plan">Planos de Tratamento</TabsTrigger>
          <TabsTrigger value="quotes">Orçamentos</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><strong>Email:</strong> {client.email || 'Não informado'}</div>
                <div className="flex items-center gap-2">
                  <strong>Telefone:</strong> {client.phone || 'Não informado'}
                  {client.phone && (
                    <button onClick={() => openWhatsApp(client.phone!)} title="Abrir no WhatsApp" className="ml-2">
                      <MessageSquare className="h-4 w-4 text-primary hover:text-primary/80" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <UserSquare className="h-4 w-4 text-muted-foreground" />
                  <strong>CPF:</strong> {client.cpf || 'Não informado'}
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-muted-foreground" />
                  <strong>Nascimento:</strong> {client.dob ? formatDate(client.dob, 'dd MMMM yyyy') : 'Não informado'}
                </div>
                <div className="flex items-center gap-2 col-span-full">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <strong>Endereço:</strong> {client.address || 'Não informado'}
                </div>
              </div>
              {client.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><StickyNote className="w-4 h-4" /> Observações</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                  </div>
                </>
              )}
              {client.medicalHistory && client.medicalHistory.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Histórico Médico</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {client.medicalHistory.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </>
              )}
              {client.consentForms && client.consentForms.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Termos de Consentimento</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {client.consentForms.map((form, i) => (
                        <li key={i}>{form.name} - <Badge variant={form.status === 'Assinado' ? 'default' : 'secondary'}>{form.status}</Badge> ({form.date})</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
            <ClientTreatmentHistory client={client} />
        </TabsContent>
        <TabsContent value="plan" className="mt-4">
          <TreatmentPlanList client={client} plans={clientTreatmentPlans || []} />
        </TabsContent>
        <TabsContent value="quotes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Orçamentos do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientQuotesList />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Fotos de Antes e Depois</CardTitle>
              <CardDescription>Registro visual do progresso do tratamento.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {beforeAfterImages.map(img => (
                  <div key={img.id}>
                    <Image src={img.imageUrl} alt={img.description} width={600} height={400} className="rounded-lg object-cover" data-ai-hint={img.imageHint} />
                    <p className="text-center text-sm mt-2 text-muted-foreground capitalize">{img.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
