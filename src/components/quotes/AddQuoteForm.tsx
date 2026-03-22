'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { collection, addDoc, serverTimestamp, WithFieldValue, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { type Client, type Service, quoteConverter, type Quote, clientConverter, serviceConverter } from '@/lib/types';


const quoteItemSchema = z.object({
    description: z.string().min(1, 'A descrição é obrigatória.'),
    quantity: z.coerce.number().min(1, 'A quantidade deve ser pelo menos 1.'),
    unitPrice: z.coerce.number().min(0, 'O preço unitário não pode ser negativo.'),
});

const quoteFormSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  status: z.enum(['Pendente', 'Aprovado', 'Recusado']),
  items: z.array(quoteItemSchema).min(1, 'Adicione pelo menos um item ao orçamento.'),
  notes: z.string().optional(),
});

type AddQuoteFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddQuoteForm({ isOpen, onOpenChange }: AddQuoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState<number | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const clientsQuery = useMemo(() => firestore ? query(collection(firestore, 'clients')).withConverter(clientConverter) : null, [firestore]);
  const servicesQuery = useMemo(() => firestore ? query(collection(firestore, 'services')).withConverter(serviceConverter) : null, [firestore]);

  const { data: clients, loading: loadingClients } = useCollection<Client>(clientsQuery, {snapshot: false});
  const { data: services, loading: loadingServices } = useCollection<Service>(servicesQuery, {snapshot: false});
  const loadingData = loadingClients || loadingServices;

  const form = useForm<z.infer<typeof quoteFormSchema>>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      clientId: '',
      status: 'Pendente',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const totalAmount = useMemo(() => {
    return watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [watchedItems]);

  useEffect(() => {
    if (!isOpen) {
        form.reset({
            clientId: '',
            status: 'Pendente',
            items: [{ description: '', quantity: 1, unitPrice: 0 }],
            notes: '',
        });
    }
  }, [isOpen, form]);


  async function onSubmit(values: z.infer<typeof quoteFormSchema>) {
    if (!firestore || !clients) return;
    setIsSubmitting(true);

    const selectedClient = clients.find(c => c.id === values.clientId);
    if (!selectedClient) {
        toast({ title: "Erro", description: "Cliente selecionado não encontrado.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const newQuoteData: WithFieldValue<Omit<Quote, 'id'>> = {
        ...values,
        clientName: selectedClient.displayName,
        totalAmount,
        date: serverTimestamp(),
    };

    const quotesCollection = collection(firestore, 'quotes').withConverter(quoteConverter);

    addDoc(quotesCollection, newQuoteData)
      .then(() => {
        toast({
          title: 'Sucesso!',
          description: `Orçamento para "${selectedClient.displayName}" criado.`,
        });
        onOpenChange(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: quotesCollection.path,
          operation: 'create',
          requestResourceData: newQuoteData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Criar Novo Orçamento</SheetTitle>
          <SheetDescription>
            Preencha os detalhes para criar um novo orçamento para um cliente.
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
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingData}>
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

              <div className="space-y-2">
                <FormLabel>Itens do Orçamento</FormLabel>
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-[1fr_80px_120px_40px] gap-2 items-start p-2 border rounded-lg">
                            <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        {index === 0 && <FormLabel className="text-xs">Descrição</FormLabel>}
                                         <Popover open={popoverOpen === index} onOpenChange={(open) => setPopoverOpen(open ? index : null)}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                                    >
                                                        {field.value
                                                            ? services?.find(service => service.name === field.value)?.name
                                                            : "Selecione o serviço"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Buscar serviço..." />
                                                    <CommandList>
                                                        <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {services?.map((service) => (
                                                                <CommandItem
                                                                    value={service.name}
                                                                    key={service.id}
                                                                    onSelect={() => {
                                                                        form.setValue(`items.${index}.description`, service.name);
                                                                        form.setValue(`items.${index}.unitPrice`, service.price);
                                                                        setPopoverOpen(null);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn("mr-2 h-4 w-4", service.name === field.value ? "opacity-100" : "opacity-0")}
                                                                    />
                                                                    {service.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                    <FormItem>
                                        {index === 0 && <FormLabel className="text-xs">Qtd.</FormLabel>}
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`items.${index}.unitPrice`}
                                render={({ field }) => (
                                    <FormItem>
                                        {index === 0 && <FormLabel className="text-xs">Preço Unit.</FormLabel>}
                                        <FormControl>
                                            <Input type="number" placeholder="R$" {...field} readOnly/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <div className={`flex items-center h-full ${index === 0 ? 'pt-6' : ''}`}>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                             </div>
                        </div>
                    ))}
                </div>
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Item
                </Button>
                {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>}
              </div>

            <Separator />
            
            <div className="flex justify-end items-center px-6 pt-4">
                <span className="text-lg font-semibold">
                    Total: {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
            
            <div className="px-6 py-4 space-y-4">
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
                        <SelectItem value="Aprovado">Aprovado</SelectItem>
                        <SelectItem value="Recusado">Recusado</SelectItem>
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
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Validade, condições especiais, etc." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            </div>
            </ScrollArea>
            <SheetFooter className="p-6 pt-4 border-t">
                <SheetClose asChild>
                    <Button variant="outline">Cancelar</Button>
                </SheetClose>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Orçamento'
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
