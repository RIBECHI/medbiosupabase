

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, type WithFieldValue } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
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
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clientConverter, type Client } from '@/lib/types';


const formSchema = z.object({
  displayName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.').optional().or(z.literal('')),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  dob: z.date().optional(),
  address: z.string().optional(),
  photoURL: z.string().url('Por favor, insira uma URL válida.').optional(),
  notes: z.string().optional(),
});

type NewClientFormData = z.infer<typeof formSchema>;

export default function NewClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const nameFromParams = searchParams.get('name');
  const phoneFromParams = searchParams.get('phone');

  const form = useForm<NewClientFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: nameFromParams || '',
      email: '',
      phone: phoneFromParams || '',
      cpf: '',
      address: '',
      photoURL: '',
      notes: '',
    },
  });

  const displayName = form.watch('displayName');
  useEffect(() => {
    if (displayName) {
      const generatedUrl = `https://picsum.photos/seed/${encodeURIComponent(
        displayName
      )}/100/100`;
      if (form.getValues('photoURL') === '') {
        form.setValue('photoURL', generatedUrl);
      }
    }
  }, [displayName, form]);

  async function onSubmit(values: NewClientFormData) {
    if (!firestore) return;
    setIsSubmitting(true);

    const newClientData: WithFieldValue<Omit<Client, 'id'>> = {
      displayName: values.displayName,
      email: values.email || '',
      phone: values.phone,
      cpf: values.cpf,
      address: values.address,
      notes: values.notes,
      joinDate: serverTimestamp(),
      dob: values.dob ? format(values.dob, 'yyyy-MM-dd') : null,
      photoURL: values.photoURL || `https://picsum.photos/seed/${encodeURIComponent(
        values.displayName
      )}/100/100`,
    };

    const clientsCollection = collection(firestore, 'clients').withConverter(clientConverter);
    
    addDoc(clientsCollection, newClientData)
      .then((docRef) => {
        toast({
          title: 'Sucesso!',
          description: `Cliente "${values.displayName}" adicionado.`,
        });
        
        const newLeadData = {
          name: values.displayName,
          email: values.email || '',
          phone: values.phone || '',
          source: 'WhatsApp', 
          status: 'Novo Lead',
          createdAt: serverTimestamp(),
          owner: 'Não atribuído'
        };

        const leadsCollection = collection(firestore, 'leads');
        return addDoc(leadsCollection, newLeadData);
      })
      .then(() => {
          toast({
              title: 'Lead Criado!',
              description: `Um novo lead para ${values.displayName} foi criado no funil de vendas.`,
          });
          router.push('/clients');
      })
      .catch((serverError) => {
        // This will catch errors from either addDoc call
        const permissionError = new FirestorePermissionError({
          path: 'clients or leads', // Generic path as it could be one of two
          operation: 'create',
          requestResourceData: { client: newClientData },
        });
        errorEmitter.emit('permission-error', permissionError);

        console.error('Erro ao adicionar novo cliente ou lead:', serverError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <>
      <PageHeader
        title={<span className="text-primary">Novo Cliente</span>}
        description="Preencha os detalhes abaixo para adicionar um novo cliente."
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
                            fromYear={new Date().getFullYear() - 100}
                            toYear={new Date().getFullYear()}
                            classNames={{
                                caption_dropdowns: "flex gap-2 [&>div]:w-full",
                                vhidden: "hidden"
                            }}
                            selected={field.value}
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
                    <FormDescription>
                     Uma foto é gerada automaticamente a partir do nome, mas você pode colar uma URL diferente aqui.
                    </FormDescription>
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
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Salvando...' : 'Salvar Cliente e Criar Lead'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
