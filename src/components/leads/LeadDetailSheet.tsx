

'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Lead, LeadHistory, LeadInteractionType } from '@/lib/types';
import { leadHistoryConverter } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Mail,
  Phone,
  DollarSign,
  PlusCircle,
  MessageSquare,
  Calendar as CalendarIcon,
  PhoneCall,
  Briefcase,
  StickyNote,
  Loader2,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore } from '@/firebase';
import { addDoc, collection, query, orderBy, serverTimestamp, Timestamp, WithFieldValue, doc, updateDoc, where, limit } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '../ui/skeleton';
import { LeadConversationModal } from './LeadConversationModal';

type LeadDetailSheetProps = {
  lead: Lead | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateLead: (updatedLead: Partial<Lead> & { id: string }) => void;
};

const historyFormSchema = z.object({
    interactionType: z.enum(["Chamada Telefônica", "Mensagem WhatsApp", "E-mail", "Reunião Presencial", "Nota Interna"]),
    summary: z.string().min(1, 'O resumo é obrigatório.'),
    nextAction: z.string().optional(),
    nextActionDate: z.date().optional().nullable(),
});

type HistoryFormData = z.infer<typeof historyFormSchema>;

const interactionIcons: Record<LeadInteractionType, React.ElementType> = {
    'Chamada Telefônica': PhoneCall,
    'Mensagem WhatsApp': MessageSquare,
    'E-mail': Mail,
    'Reunião Presencial': Briefcase,
    'Nota Interna': StickyNote,
}

function LeadHistoryComponent({ lead }: { lead: Lead }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const form = useForm<HistoryFormData>({
        resolver: zodResolver(historyFormSchema),
        defaultValues: {
            interactionType: 'Nota Interna',
            summary: '',
            nextAction: '',
            nextActionDate: null,
        }
    });

    const historyQuery = useMemo(() => {
        if (!firestore || !lead?.id) return null;
        return query(
            collection(firestore, 'leads', lead.id, 'history'),
            orderBy('date', 'desc'),
            limit(50)
        ).withConverter(leadHistoryConverter);
    }, [firestore, lead?.id]);

    const { data: history, loading, setData: setHistory } = useCollection<LeadHistory>(historyQuery, { snapshot: false });

    const onAddHistory = async (values: HistoryFormData) => {
        if (!firestore || !lead?.id) return;
        
        const newHistoryData: WithFieldValue<Omit<LeadHistory, 'id'>> = {
            leadId: lead.id,
            date: serverTimestamp(),
            interactionType: values.interactionType,
            summary: values.summary,
            nextAction: values.nextAction,
            nextActionDate: values.nextActionDate ? format(values.nextActionDate, 'yyyy-MM-dd') : null,
        };

        const historyCollection = collection(firestore, 'leads', lead.id, 'history');
        
        addDoc(historyCollection, newHistoryData)
        .then((docRef) => {
            toast({ title: "Sucesso", description: "Histórico adicionado." });

            const locallyCreatedHistory: LeadHistory = {
                id: docRef.id,
                leadId: lead.id,
                date: Timestamp.now(), // Use a client-side timestamp for immediate UI update
                interactionType: values.interactionType,
                summary: values.summary,
                nextAction: values.nextAction,
                nextActionDate: values.nextActionDate ? format(values.nextActionDate, 'yyyy-MM-dd') : null,
            };
            setHistory(prevHistory => [locallyCreatedHistory, ...(prevHistory || [])]);

            form.reset();
        })
        .catch(err => {
            const permissionError = new FirestorePermissionError({
                path: historyCollection.path,
                operation: 'create',
                requestResourceData: newHistoryData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }

    const formatDate = (date: any) => {
        if (!date) return '';
        const d = date instanceof Timestamp ? date.toDate() : new Date(date);
        return format(d, 'dd/MM/yy HH:mm');
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-primary">Histórico de Acompanhamento</h4>
            </div>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddHistory)} className="p-4 border rounded-lg bg-muted/50 space-y-4 mb-6">
                    <FormField
                        control={form.control}
                        name="interactionType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de Interação</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {Object.keys(interactionIcons).map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="summary"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Resumo</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Descreva a interação..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="nextAction"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Próxima Ação (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Ligar na próxima semana" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="nextActionDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Data da Próxima Ação</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={'outline'}
                                        className={cn(
                                            'pl-3 text-left font-normal',
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
                                        selected={field.value ?? undefined}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <Button type="submit" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar ao Histórico
                    </Button>
                </form>
            </Form>

            <div className="space-y-4 mt-4">
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : history?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico encontrado.</p>
            ) : (
                history?.map(item => {
                    const Icon = interactionIcons[item.interactionType];
                    return (
                        <div key={item.id} className="flex items-start gap-3 text-sm">
                            <div className="flex-shrink-0 mt-1">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold">{item.interactionType}</p>
                                    <time className="text-xs text-muted-foreground">{formatDate(item.date)}</time>
                                </div>
                                <p className="text-muted-foreground">{item.summary}</p>
                                {item.nextAction && (
                                    <p className="text-xs text-primary mt-1">
                                        <strong>Próxima ação:</strong> {item.nextAction}
                                        {item.nextActionDate && ` em ${format(new Date(item.nextActionDate), 'dd/MM/yyyy')}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                })
            )}
            </div>
        </div>
    );
}

const leadDetailsSchema = z.object({
    potentialValue: z.coerce.number().min(0, "O valor deve ser positivo."),
    notes: z.string().optional(),
});

type LeadDetailsFormData = z.infer<typeof leadDetailsSchema>;

export function LeadDetailSheet({
  lead,
  isOpen,
  onOpenChange,
  onUpdateLead,
}: LeadDetailSheetProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isConversationModalOpen, setConversationModalOpen] = useState(false);

    const form = useForm<LeadDetailsFormData>({
        resolver: zodResolver(leadDetailsSchema),
        defaultValues: {
            potentialValue: 0,
            notes: '',
        }
    });

    useEffect(() => {
        if (lead) {
            form.reset({
                potentialValue: lead.potentialValue,
                notes: lead.notes || '',
            })
        }
    }, [lead, form]);

    if (!lead) return null;
    
    const { isDirty, dirtyFields } = form.formState;

    const onSubmit = async (data: LeadDetailsFormData) => {
        if (!firestore || !lead?.id) return;
        setIsSaving(true);
        
        const leadRef = doc(firestore, 'leads', lead.id);
        const updateData: Partial<Lead> = {};

        if (dirtyFields.potentialValue) {
            updateData.potentialValue = data.potentialValue;
        }
        if (dirtyFields.notes) {
            updateData.notes = data.notes;
        }

        updateDoc(leadRef, updateData)
            .then(() => {
                toast({ title: 'Sucesso', description: 'Lead atualizado.' });
                onUpdateLead({ id: lead.id, ...updateData });
                form.reset(data); // Resets the form with the new values, clearing the dirty state
            })
            .catch((err) => {
                const permissionError = new FirestorePermissionError({
                    path: leadRef.path,
                    operation: 'update',
                    requestResourceData: updateData
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSaving(false);
            });
    }

    const openWhatsApp = () => {
        if (lead.phone) {
            const cleanPhone = lead.phone.replace(/\D/g, '');
            const whatsappUrl = `whatsapp://send?phone=${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}`;
            window.open(whatsappUrl, '_blank');
        }
    }

    const isMessageSource = ['WhatsApp', 'Instagram', 'Facebook'].includes(lead.source);

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col p-0">
        <SheetHeader className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`https://picsum.photos/seed/${lead.id}/100/100`} alt={lead.name} />
              <AvatarFallback>{lead.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-2xl text-primary">{lead.name}</SheetTitle>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {isMessageSource ? (
                    <Button variant="secondary" size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={() => setConversationModalOpen(true)}>
                        <Eye className="mr-1 h-3 w-3" />
                        Ver Conversa
                    </Button>
                ) : (
                    <Badge variant="secondary">{lead.source}</Badge>
                )}
                 | Status: <Badge>{lead.status}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col h-full overflow-hidden">
                <ScrollArea className="flex-1 px-6">
                <div className="space-y-6">
                    <div>
                    <h4 className="font-semibold mb-2 text-primary">Detalhes de Contato</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.email || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.phone || 'Não informado'}</span>
                        {lead.phone && (
                            <button type="button" onClick={openWhatsApp} title="Abrir no WhatsApp" className="ml-2">
                            <MessageSquare className="h-4 w-4 text-green-500 hover:text-green-600" />
                            </button>
                        )}
                        </div>
                    </div>
                    </div>

                    <Separator />

                    <div>
                    <h4 className="font-semibold mb-2 text-primary">Informações Adicionais</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="potentialValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor Potencial</FormLabel>
                                    <div className="relative">
                                        <DollarSign className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                        <FormControl>
                                            <Input type="number" {...field} className="pl-8" />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="space-y-1">
                            <Label>Proprietário</Label>
                            <p className="text-sm pt-2">{lead.owner}</p>
                        </div>
                    </div>
                    </div>
                    
                    <Separator />

                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-primary">Anotações Gerais</FormLabel>
                                <FormControl>
                                    <Textarea rows={8} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <Separator />
                    
                    <LeadHistoryComponent lead={lead} />
                    
                </div>
                </ScrollArea>
                <SheetFooter className="p-6 mt-auto border-t">
                    <SheetClose asChild>
                        <Button variant="outline">Fechar</Button>
                    </SheetClose>
                    <Button type="submit" disabled={isSaving || !isDirty}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </SheetFooter>
            </form>
        </Form>
      </SheetContent>
    </Sheet>
    {lead.phone && (
        <LeadConversationModal
            isOpen={isConversationModalOpen}
            onOpenChange={setConversationModalOpen}
            leadName={lead.name}
            leadPhone={lead.phone}
        />
    )}
    </>
  );
}
