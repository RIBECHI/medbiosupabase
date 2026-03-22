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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


const leadFormSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().min(1, 'A origem é obrigatória.'),
  owner: z.string().min(1, 'Atribua o lead a um responsável.'),
  potentialValue: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type AddLeadFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  leadStatuses: string[];
};

export function AddLeadForm({ isOpen, onOpenChange, leadStatuses }: AddLeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  


  const loadingData = loadingClients || loadingUsers;

  const form = useForm<z.infer<typeof leadFormSchema>>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      source: 'Site',
      potentialValue: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (currentUser && !form.getValues('owner')) {
        form.setValue('owner', currentUser.displayName || '');
    }
  }, [currentUser, form]);

  useEffect(() => {
    if (!isOpen) {
        form.reset({
            name: '',
            email: '',
            phone: '',
            source: 'Site',
            potentialValue: 0,
            notes: '',
            owner: currentUser?.displayName || '',
        });
    }
  }, [isOpen, form, currentUser]);

  async function onSubmit(values: z.infer<typeof leadFormSchema>) {
    if (!firestore) return;
    setIsSubmitting(true);

    const firstStage = leadStatuses[0] || 'Novo Lead';

    const newLeadData = {
        ...values,
        status: firstStage,
        createdAt: serverTimestamp(),
    };

    const leadsCollection = collection(firestore, 'leads');

    addDoc(leadsCollection, newLeadData)
      .then(() => {
        toast({
          title: 'Sucesso!',
          description: `Lead "${values.name}" adicionado ao funil.`,
        });
        form.reset();
        onOpenChange(false);
      })
      .catch((serverError) => {
          path: leadsCollection.path,
          operation: 'create',
          requestResourceData: newLeadData,
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
          <SheetTitle>Adicionar Novo Lead</SheetTitle>
          <SheetDescription>
            Busque por um cliente existente ou preencha os detalhes para criar um novo lead.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full overflow-hidden"
          >
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Buscar Cliente Existente</FormLabel>
                      <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                >
                                    {field.value
                                        ? clients?.find(client => client.displayName === field.value)?.displayName
                                        : "Selecione um cliente ou digite um novo nome"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput 
                                    placeholder="Buscar cliente..." 
                                    onValueChange={(search) => form.setValue('name', search)}
                                    value={field.value}
                                />
                                <CommandList>
                                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        {clients?.map((client) => (
                                            <CommandItem
                                                value={client.displayName}
                                                key={client.id}
                                                onSelect={() => {
                                                    form.setValue('name', client.displayName);
                                                    form.setValue('email', client.email || '');
                                                    form.setValue('phone', client.phone || '');
                                                    setClientPopoverOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn("mr-2 h-4 w-4", client.displayName === field.value ? "opacity-100" : "opacity-0")}
                                                />
                                                <div className="flex justify-between w-full">
                                                    <span>{client.displayName}</span>
                                                    <span className="text-xs text-muted-foreground">{client.phone}</span>
                                                </div>
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Ex: joao.silva@email.com" {...field} />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fonte</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione a origem do lead" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Site">Site</SelectItem>
                                <SelectItem value="Instagram">Instagram</SelectItem>
                                <SelectItem value="Facebook">Facebook</SelectItem>
                                <SelectItem value="Indicação">Indicação</SelectItem>
                                <SelectItem value="Anúncio Google">Anúncio Google</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="owner"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Responsável</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={loadingData}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder={loadingData ? "Carregando..." : "Atribuir a..."} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {users?.map(user => (
                                    <SelectItem key={user.id} value={user.displayName}>{user.displayName}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="potentialValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Potencial (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 1500" {...field} />
                      </FormControl>
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
                        <Textarea placeholder="Anotações sobre o lead..." {...field} />
                      </FormControl>
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Lead'
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
