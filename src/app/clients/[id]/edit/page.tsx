

'use client';

import { useRouter, notFound } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, WithFieldValue } from 'firebase/firestore';
import { useFirestore, useDoc } from '@/firebase';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clientConverter, type Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  displayName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.').optional().or(z.literal('')),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  dob: z.date().optional().nullable(),
  address: z.string().optional(),
  photoURL: z.string().url('Por favor, insira uma URL válida.').optional(),
  notes: z.string().optional(),
});

type EditClientFormData = z.infer<typeof formSchema>;

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const clientRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'clients', params.id).withConverter(clientConverter);
  }, [firestore, params.id]);

  const { data: client, loading } = useDoc<Client>(clientRef);

  const form = useForm<EditClientFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
      phone: '',
      cpf: '',
      address: '',
      photoURL: '',
      notes: '',
      dob: null,
    },
  });

  useEffect(() => {
    if (client) {
        const dobDate = client.dob ? parseISO(client.dob) : null;
        form.reset({
            ...client,
            email: client.email || '',
            dob: dobDate,
        });
    }
  }, [client, form]);

  async function onSubmit(values: EditClientFormData) {
    if (!firestore || !client?.id) return;
    setIsSubmitting(true);
    
    const clientUpdateRef = doc(firestore, 'clients', client.id);

    const updatedClientData: Partial<WithFieldValue<Client>> = {
      ...values,
      email: values.email || '',
      dob: values.dob ? format(values.dob, 'yyyy-MM-dd') : null,
    };

    updateDoc(clientUpdateRef, updatedClientData)
      .then(() => {
        toast({
          title: 'Sucesso!',
          description: `Cliente "${values.displayName}" atualizado.`,
        });
        router.push(`/clients/${client.id}`);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: clientUpdateRef.path,
          operation: 'update',
          requestResourceData: updatedClientData,
        });
        errorEmitter.emit('permission-error', permissionError);

        console.error('Erro ao atualizar cliente:', serverError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }
  
  if (loading) {
    return (
        <>
            <PageHeader title="Editar Cliente" description="Carregando dados do cliente..." showBackButton/>
            <Card>
                <CardHeader><CardTitle><Skeleton className="h-6 w-48" /></CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-24" />
                    </div>
                </CardContent>
            </Card>
        </>
    );
  }

  if (!client && !loading) {
    notFound();
  }

  if (!client) {
      return <PageHeader title="Carregando cliente..." />;
  }

  return (
    <>
      <PageHeader
        title={<span className="text-primary">Editar Cliente</span>}
        description="Atualize os detalhes do cliente abaixo."
        showBackButton
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Ficha de Cadastro</CardTitle>
          <CardDescription>
            Informações detalhadas para um melhor gerenciamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Maria da Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Ex: maria.silva@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: (11) 99999-8888" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Nascimento</FormLabel>
                      <Dialog open={isCalendarOpen} onOpenChange={setCalendarOpen}>
                        <DialogTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ptBR })
                              ) : (
                                <span>Escolha uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </DialogTrigger>
                        <DialogContent className="p-4 w-[420px]">
                           <Calendar
                            mode="single"
                            captionLayout="dropdown-buttons"
                            fromYear={currentYear - 100}
                            toYear={currentYear}
                            classNames={{
                                caption_dropdowns: "flex gap-2 [&>div]:w-full",
                                vhidden: "hidden"
                            }}
                            selected={field.value ?? undefined}
                            onSelect={(date) => {
                                field.onChange(date);
                                setCalendarOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                            locale={ptBR}
                          />
                        </DialogContent>
                      </Dialog>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Rua das Flores, 123, São Paulo, SP" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photoURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Foto</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com/foto.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Anotações importantes sobre o cliente..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
