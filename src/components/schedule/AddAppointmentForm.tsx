'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, WithFieldValue, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Client, type Service, appointmentConverter, type Appointment, clientConverter, serviceConverter } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

const appointmentFormSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  serviceName: z.string().min(1, 'Selecione um serviço.'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:mm)."),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:mm)."),
  status: z.enum(['Confirmado', 'Pendente', 'Cancelado', 'Concluído']),
  notes: z.string().optional(),
}).refine(data => data.endTime > data.startTime, {
    message: "O horário final deve ser após o horário inicial.",
    path: ["endTime"],
});

type AddAppointmentFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedDate?: Date;
};

export function AddAppointmentForm({ 
    isOpen, 
    onOpenChange, 
    selectedDate
}: AddAppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const clientsQuery = useMemo(() => firestore ? query(collection(firestore, 'clients')).withConverter(clientConverter) : null, [firestore]);
  const servicesQuery = useMemo(() => firestore ? query(collection(firestore, 'services')).withConverter(serviceConverter) : null, [firestore]);

  const { data: clients, loading: loadingClients } = useCollection<Client>(clientsQuery, {snapshot: false});
  const { data: services, loading: loadingServices } = useCollection<Service>(servicesQuery, {snapshot: false});
  const loadingData = loadingClients || loadingServices;

  const form = useForm<z.infer<typeof appointmentFormSchema>>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientId: '',
      serviceName: '',
      startTime: '09:00',
      endTime: '10:00',
      status: 'Pendente',
      notes: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
        form.reset({
            clientId: '',
            serviceName: '',
            startTime: '09:00',
            endTime: '10:00',
            status: 'Pendente',
            notes: '',
        });
    }
  }, [isOpen, form]);


  async function onSubmit(values: z.infer<typeof appointmentFormSchema>) {
    if (!firestore || !clients || !selectedDate) return;
    setIsSubmitting(true);

    const selectedClient = clients.find(c => c.id === values.clientId);
    if (!selectedClient) {
        toast({ title: "Erro", description: "Cliente selecionado não encontrado.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const newAppointmentData: WithFieldValue<Omit<Appointment, 'id'>> = {
        ...values,
        clientName: selectedClient.displayName,
        date: format(selectedDate, 'yyyy-MM-dd'),
    };

    const appointmentsCollection = collection(firestore, 'appointments').withConverter(appointmentConverter);

    addDoc(appointmentsCollection, newAppointmentData)
      .then(() => {
        toast({
          title: 'Sucesso!',
          description: `Consulta para "${selectedClient.displayName}" agendada.`,
        });
        onOpenChange(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: appointmentsCollection.path,
          operation: 'create',
          requestResourceData: newAppointmentData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Agendar Nova Consulta</SheetTitle>
          <SheetDescription>
            {selectedDate ? `Agendando para ${format(selectedDate, 'PPP', { locale: ptBR })}.` : 'Selecione uma data para agendar.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Cliente</FormLabel>
                      <Button variant="link" asChild className="p-0 h-auto text-xs">
                        <Link href="/clients/new" target="_blank">
                            <UserPlus className="mr-1 h-3 w-3" />
                            Novo Cliente
                        </Link>
                      </Button>
                    </div>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loadingData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingData ? "Carregando clientes..." : "Selecione um cliente"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map(client => (
                            <SelectItem key={client.id} value={client.id}>{client.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

             <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loadingData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingData ? "Carregando serviços..." : "Selecione um serviço"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services?.map(service => (
                            <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Horário de Início</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Horário de Término</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Confirmado">Confirmado</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Anotações sobre a consulta..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            </ScrollArea>
            <SheetFooter className="p-6 pt-4 mt-auto border-t">
                <SheetClose asChild>
                    <Button variant="outline">Cancelar</Button>
                </SheetClose>
                <Button type="submit" disabled={isSubmitting || !selectedDate || loadingData}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  'Salvar Agendamento'
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
