
'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '../ui/calendar';

const treatmentFormSchema = z.object({
  date: z.date({
    required_error: 'A data do tratamento é obrigatória.',
  }),
  serviceName: z.string().min(2, 'O nome do serviço deve ter pelo menos 2 caracteres.'),
  professional: z.string().min(2, 'O nome do profissional é obrigatório.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  notes: z.string().optional(),
});

type AddTreatmentFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  client: Client;
};

export function AddTreatmentForm({ isOpen, onOpenChange, client }: AddTreatmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof treatmentFormSchema>>({
    resolver: zodResolver(treatmentFormSchema),
    defaultValues: {
      date: new Date(),
      serviceName: '',
      professional: '',
      price: 0,
      notes: '',
    }
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        date: new Date(),
        serviceName: '',
        professional: '',
        price: 0,
        notes: '',
      });
    }
  }, [isOpen, form]);


  async function onSubmit(values: z.infer<typeof treatmentFormSchema>) {
    if (!firestore) return;
    setIsSubmitting(true);

    const newTreatmentData: WithFieldValue<Omit<Treatment, 'id'>> = {
      ...values,
      clientId: client.id,
      date: values.date,
    };
    
    
    addDoc(treatmentsCollection, newTreatmentData)
      .then(() => {
        toast({
          title: 'Sucesso!',
          description: `Novo tratamento adicionado para ${client.displayName}.`,
        });
        onOpenChange(false);
      })
      .catch((serverError) => {
          path: treatmentsCollection.path,
          operation: 'create',
          requestResourceData: newTreatmentData,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Adicionar Novo Tratamento</SheetTitle>
          <SheetDescription>
            Registre um novo procedimento realizado para {client.displayName}.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
              <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data do Tratamento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
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
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Serviço/Procedimento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Microagulhamento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="professional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissional Responsável</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Dra. Ana" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Preço (R$)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" {...field} />
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
                      <FormLabel>Anotações (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Produtos utilizados, observações sobre a pele do cliente, etc."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <SheetFooter className="p-6 mt-auto border-t">
              <SheetClose asChild>
                <Button variant="outline">Cancelar</Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Salvando...' : 'Salvar Tratamento'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
