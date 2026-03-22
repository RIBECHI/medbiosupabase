'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/lib/supabase/types';

const formSchema = z.object({
  displayName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  dob: z.date().optional().nullable(),
  address: z.string().optional(),
  photoURL: z.string().url('URL inválida.').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { displayName: '', email: '', phone: '', cpf: '', address: '', photoURL: '', notes: '' },
  });

  const loadClient = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').eq('id', params.id).single();
    if (data) {
      form.reset({
        displayName: data.display_name,
        email: data.email || '',
        phone: data.phone || '',
        cpf: data.cpf || '',
        address: data.address || '',
        photoURL: data.photo_url || '',
        notes: data.notes || '',
        dob: data.dob ? new Date(data.dob + 'T00:00:00') : null,
      });
    }
    setLoading(false);
  }, [params.id, form]);

  useEffect(() => { loadClient(); }, [loadClient]);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    const { error } = await supabase
      .from('clients')
      .update({
        display_name: values.displayName,
        email: values.email || null,
        phone: values.phone || null,
        cpf: values.cpf || null,
        address: values.address || null,
        notes: values.notes || null,
        dob: values.dob ? format(values.dob, 'yyyy-MM-dd') : null,
        photo_url: values.photoURL || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar.' });
    } else {
      toast({ title: 'Sucesso!', description: 'Dados do cliente atualizados.' });
      router.push(`/clients/${params.id}`);
    }
    setIsSubmitting(false);
  }

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader title={<span className="text-primary">Editar Cliente</span>} description="Atualize as informações do cliente." />
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Ficha de Cadastro</CardTitle>
          <CardDescription>Edite os campos necessários.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="displayName" render={({ field }) => (
                  <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="dob" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Data de Nascimento</FormLabel>
                    <Dialog open={isCalendarOpen} onOpenChange={setCalendarOpen}>
                      <DialogTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                            {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </DialogTrigger>
                      <DialogContent className="p-4 w-[420px]">
                        <Calendar mode="single" captionLayout="dropdown-buttons"
                          fromYear={new Date().getFullYear() - 100} toYear={new Date().getFullYear()}
                          selected={field.value || undefined}
                          onSelect={date => { field.onChange(date); setCalendarOpen(false); }}
                          disabled={date => date > new Date()} initialFocus locale={ptBR} />
                      </DialogContent>
                    </Dialog>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="photoURL" render={({ field }) => (
                <FormItem><FormLabel>URL da Foto</FormLabel><FormControl><Input {...field} /></FormControl>
                <FormDescription>URL de uma imagem para o perfil do cliente.</FormDescription><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-4">
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
