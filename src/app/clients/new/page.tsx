'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
import { useState, useEffect } from 'react';
import { Loader2, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';

const formSchema = z.object({
  displayName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  dob: z.date().optional(),
  address: z.string().optional(),
  photoURL: z.string().url('URL inválida.').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: searchParams.get('name') || '',
      email: '',
      phone: searchParams.get('phone') || '',
      cpf: '', address: '', photoURL: '', notes: '',
    },
  });

  const displayName = form.watch('displayName');
  useEffect(() => {
    if (displayName && !form.getValues('photoURL')) {
      form.setValue('photoURL', `https://picsum.photos/seed/${encodeURIComponent(displayName)}/100/100`);
    }
  }, [displayName, form]);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          display_name: values.displayName,
          email: values.email || null,
          phone: values.phone || null,
          cpf: values.cpf || null,
          address: values.address || null,
          notes: values.notes || null,
          dob: values.dob ? format(values.dob, 'yyyy-MM-dd') : null,
          photo_url: values.photoURL || `https://picsum.photos/seed/${encodeURIComponent(values.displayName)}/100/100`,
        })
        .select('id')
        .single();

      if (clientError) throw clientError;

      // Cria lead automaticamente
      await supabase.from('leads').insert({
        name: values.displayName,
        email: values.email || null,
        phone: values.phone || null,
        source: 'Cadastro Manual',
        status: 'Novo Lead',
        owner: 'Não atribuído',
        potential_value: 0,
      });

      toast({ title: 'Sucesso!', description: `Cliente "${values.displayName}" adicionado.` });
      router.push('/clients');
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o cliente.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title={<span className="text-primary">Novo Cliente</span>} description="Preencha os detalhes para adicionar um novo cliente." />
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Ficha de Cadastro</CardTitle>
          <CardDescription>Informações detalhadas para um melhor gerenciamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="displayName" render={({ field }) => (
                  <FormItem><FormLabel>Nome Completo</FormLabel><FormControl>
                    <Input placeholder="Ex: Maria da Silva" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>E-mail (Opcional)</FormLabel><FormControl>
                    <Input type="email" placeholder="Ex: maria@email.com" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone</FormLabel><FormControl>
                    <Input placeholder="Ex: (44) 99999-8888" {...field} />
                  </FormControl></FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem><FormLabel>CPF (Opcional)</FormLabel><FormControl>
                    <Input placeholder="000.000.000-00" {...field} />
                  </FormControl></FormItem>
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
                          selected={field.value} onSelect={date => { field.onChange(date); setCalendarOpen(false); }}
                          disabled={date => date > new Date()} initialFocus locale={ptBR} />
                      </DialogContent>
                    </Dialog>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Endereço</FormLabel><FormControl>
                  <Input placeholder="Ex: Rua das Flores, 123, Maringá, PR" {...field} />
                </FormControl></FormItem>
              )} />
              <FormField control={form.control} name="photoURL" render={({ field }) => (
                <FormItem><FormLabel>URL da Foto</FormLabel><FormControl>
                  <Input placeholder="https://exemplo.com/foto.jpg" {...field} />
                </FormControl>
                <FormDescription>Gerada automaticamente pelo nome, mas pode ser alterada.</FormDescription>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl>
                  <Textarea placeholder="Anotações importantes sobre o cliente..." {...field} />
                </FormControl></FormItem>
              )} />
              <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
