
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
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const serviceFormSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  description: z.string().optional(),
  category: z.string().min(2, 'A categoria é obrigatória.'),
  duration: z.coerce.number().int().min(1, 'A duração deve ser de pelo menos 1 minuto.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
});

type AddServiceFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  serviceToEdit?: Service | null;
};

export function AddServiceForm({ isOpen, onOpenChange, serviceToEdit }: AddServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
  });

  useEffect(() => {
    if (serviceToEdit) {
      form.reset(serviceToEdit);
    } else {
      form.reset({
        name: '',
        description: '',
        category: '',
        duration: 30,
        price: 0,
      });
    }
  }, [serviceToEdit, form, isOpen]);

  const isEditing = !!serviceToEdit;

  async function onSubmit(values: z.infer<typeof serviceFormSchema>) {
    if (!firestore) return;
    setIsSubmitting(true);

    if (isEditing) {
      // Update existing service
      if (!serviceToEdit?.id) return;
      updateDoc(serviceRef, {
          ...values,
          description: values.description ?? '',
      })
        .then(() => {
          toast({
            title: 'Sucesso!',
            description: `Serviço "${values.name}" atualizado.`,
          });
          onOpenChange(false);
        })
        .catch((serverError) => {
            path: serviceRef.path,
            operation: 'update',
            requestResourceData: values,
          });
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    } else {
      // Add new service
      const newServiceData: WithFieldValue<Omit<Service, 'id'>> = {
        ...values,
        description: values.description ?? '',
      };
      
      addDoc(servicesCollection, newServiceData)
        .then(() => {
          toast({
            title: 'Sucesso!',
            description: `Serviço "${values.name}" adicionado.`,
          });
          onOpenChange(false);
        })
        .catch((serverError) => {
            path: servicesCollection.path,
            operation: 'create',
            requestResourceData: newServiceData,
          });
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>{isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</SheetTitle>
          <SheetDescription>
            Preencha os detalhes abaixo para {isEditing ? 'atualizar o' : 'adicionar um novo'} serviço.
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Serviço</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Limpeza de Pele Profunda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Facial" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (min)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o serviço, seus benefícios, etc."
                          rows={5}
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
                {isSubmitting ? 'Salvando...' : 'Salvar Serviço'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
