

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useCollection, useFirestore } from '@/firebase';
import { doc, updateDoc, Timestamp, addDoc, serverTimestamp, deleteDoc, collection, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { leadConverter, leadStageConverter, userConverter } from '@/lib/types';
import type { Lead, LeadStatus, LeadStage, User } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Mail, Tag, Loader2, PlusCircle, Trash2, Users, Info, Save, Search, Phone } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from '@/components/ui/textarea';
import { CSS } from '@dnd-kit/utilities';
import { LeadDetailSheet } from './LeadDetailSheet';
import { Skeleton } from '../ui/skeleton';
import { format, parseISO } from 'date-fns';
import { AddLeadForm } from './AddLeadForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
        let dateObj: Date | null = null;
        if (date instanceof Timestamp) dateObj = date.toDate();
        else if (typeof date === 'string') dateObj = parseISO(date);
        else if (date instanceof Date) dateObj = date;

        if (dateObj) return format(dateObj, 'dd/MM/yyyy');
    } catch (e) { /* ignore invalid date */ }
    return 'N/A';
}

function LeadCardDisplay({ lead, color, onDelete, isHighlighted }: { lead: Lead, color?: string, onDelete?: (e: React.MouseEvent, lead: Lead) => void, isHighlighted?: boolean }) {
    return (
        <Card
            className={cn("mb-4 overflow-hidden group/lead", isHighlighted && "animate-pulse-strong border-primary ring-2 ring-primary")}
            style={{ borderTop: `4px solid ${color || 'hsl(var(--primary))'}` } as React.CSSProperties}
        >
          <CardContent className="p-4 relative">
            {onDelete && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover/lead:opacity-100"
                    onClick={(e) => onDelete(e, lead)}
                >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir lead</span>
                </Button>
            )}
            <div className="flex items-center gap-3 mb-3 pr-8">
                <Avatar className="w-8 h-8">
                    <AvatarImage src={`https://picsum.photos/seed/${lead.id}/100/100`} alt={lead.name} />
                    <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h4 className="font-semibold text-sm">{lead.name}</h4>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    <span>{lead.email}</span>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      <span>{lead.phone}</span>
                  </div>
                )}
                 <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3" />
                    <Badge variant="secondary" className="text-xs">{lead.source}</Badge>
                 </div>
                 <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>Criado em: {formatDate(lead.createdAt)}</span>
                 </div>
            </div>
          </CardContent>
        </Card>
    )
}

function LeadCard({ lead, onCardClick, color, onDelete, isHighlighted }: { lead: Lead, onCardClick: (lead: Lead) => void, color?: string, onDelete: (e: React.MouseEvent, lead: Lead) => void, isHighlighted: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
      } = useSortable({ id: lead.id, data: { status: lead.status, lead }});
    
      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      };
      
  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners} 
        onClick={() => onCardClick(lead)} 
        className="cursor-grab active:cursor-grabbing"
        id={`lead-card-${lead.id}`}
    >
      <LeadCardDisplay lead={lead} color={color} onDelete={onDelete} isHighlighted={isHighlighted} />
    </div>
  );
}

const defaultStages = [
    { id: 'default-1', name: 'Novo Lead', order: 0, color: '#3b82f6', description: 'Leads recém-chegados que ainda não foram contatados.' },
    { id: 'default-2', name: 'Primeiro Contato', order: 1, color: '#8b5cf6', description: 'Leads que já receberam a primeira mensagem ou ligação.' },
    { id: 'default-3', name: 'Qualificação', order: 2, color: '#f97316', description: 'Leads com quem uma conversa foi iniciada para entender suas necessidades.' },
    { id: 'default-4', name: 'Consulta Agendada', order: 3, color: '#10b981', description: 'Leads que agendaram uma consulta ou avaliação.' },
    { id: 'default-5', name: 'Negociação', order: 4, color: '#f59e0b', description: 'Leads que receberam uma proposta e estão em fase de negociação.' },
    { id: 'default-6', name: 'Convertido', order: 5, color: '#22c55e', description: 'Leads que se tornaram clientes.' },
    { id: 'default-7', name: 'Perdido', order: 6, color: '#ef4444', description: 'Leads que não avançaram no funil.' },
];

function PipelineColumn({ stage, leads, onCardClick, onDelete, onUpdateStage, highlightedLeadId }: { stage: LeadStage; leads: Lead[]; onCardClick: (lead: Lead) => void; onDelete: (e: React.MouseEvent, lead: Lead) => void; onUpdateStage: (stageId: string, description: string) => void; highlightedLeadId: string | null; }) {
    const { setNodeRef } = useSortable({ id: stage.name, data: { isContainer: true } });
    const [description, setDescription] = useState(stage.description || '');
    const [isSaving, setIsSaving] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        setDescription(stage.description || '');
    }, [stage.description]);
    
    const handleSaveDescription = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            const stageRef = doc(firestore, 'leadStages', stage.id);
            await updateDoc(stageRef, { description });
            onUpdateStage(stage.id, description);
            toast({ title: 'Sucesso', description: `Descrição para "${stage.name}" atualizada.` });
        } catch (error) {
            console.error('Failed to update stage description:', error);
            toast({ title: 'Erro', description: 'Não foi possível atualizar a descrição.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
  
    return (
      <div className="flex w-[240px] shrink-0 flex-col rounded-lg bg-muted/50 h-full">
          <div className="flex items-center justify-between p-4 font-semibold text-md shrink-0">
            <Popover>
                <PopoverTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-primary">{stage.name}</span>
                        {stage.description && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">{stage.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none text-primary">Descrição da Etapa</h4>
                            <p className="text-sm text-muted-foreground">
                                Explique o que esta etapa significa no seu processo de vendas.
                            </p>
                        </div>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Leads que já receberam o primeiro contato via WhatsApp..."
                        />
                        <Button onClick={handleSaveDescription} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            <Badge variant="secondary" className="rounded-full">{leads.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
              <SortableContext id={stage.name} items={leads} strategy={verticalListSortingStrategy}>
                  <div ref={setNodeRef} className="space-y-4 p-4 pt-0">
                  {leads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onCardClick={onCardClick} color={stage.color} onDelete={onDelete} isHighlighted={lead.id === highlightedLeadId}/>
                  ))}
                  </div>
              </SortableContext>
          </ScrollArea>
      </div>
    );
  }

export function LeadPipeline({ searchParams }: { searchParams: ReadonlyURLSearchParams }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [localLeadStages, setLocalLeadStages] = useState<LeadStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [columns, setColumns] = useState<Record<LeadStatus, Lead[]>>({});

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddLeadSheetOpen, setAddLeadSheetOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [selectedOwner, setSelectedOwner] = useState('Equipe');
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const pipelineContainerRef = useRef<HTMLDivElement>(null);
  
  const leadsQuery = useMemo(() => firestore ? query(collection(firestore, 'leads'), orderBy('createdAt', 'desc')).withConverter(leadConverter) : null, [firestore]);
  const leadStagesQuery = useMemo(() => firestore ? query(collection(firestore, 'leadStages'), orderBy('order')).withConverter(leadStageConverter) : null, [firestore]);
  const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users')).withConverter(userConverter) : null, [firestore]);

  const { data: fetchedLeads, loading: loadingLeads } = useCollection<Lead>(leadsQuery, {snapshot: true});
  const { data: fetchedLeadStages, loading: loadingLeadStages } = useCollection<LeadStage>(leadStagesQuery, {snapshot: false});
  const { data: fetchedUsers, loading: loadingUsers } = useCollection<User>(usersQuery, {snapshot: false});
  
  const loadingData = loadingLeads || loadingLeadStages || loadingUsers;

  useEffect(() => {
    if (fetchedLeads) setAllLeads(fetchedLeads);
  }, [fetchedLeads]);

  useEffect(() => {
    if (fetchedLeadStages) {
      setLocalLeadStages(fetchedLeadStages.length > 0 ? fetchedLeadStages : defaultStages);
    }
  }, [fetchedLeadStages]);

  useEffect(() => {
    if (fetchedUsers) setUsers(fetchedUsers);
  }, [fetchedUsers]);
  
  const leadStatuses = useMemo(() => (localLeadStages || []).map(s => s.name), [localLeadStages]);

  const filteredLeads = useMemo(() => {
    if (!allLeads) return [];
    let leads = allLeads;

    if (selectedOwner !== 'Equipe') {
        leads = leads.filter(lead => lead.owner === selectedOwner);
    }
    
    if (searchTerm.trim() !== '') {
        const lowercasedTerm = searchTerm.toLowerCase();
        leads = leads.filter(lead => {
            const nameMatch = lead.name.toLowerCase().includes(lowercasedTerm);
            const emailMatch = lead.email?.toLowerCase().includes(lowercasedTerm);
            const phoneMatch = lead.phone?.replace(/\D/g, '').includes(lowercasedTerm.replace(/\D/g, ''));
            return nameMatch || emailMatch || phoneMatch;
        });
    }

    return leads;
  }, [allLeads, selectedOwner, searchTerm]);


  useEffect(() => {
    if (filteredLeads && localLeadStages.length > 0) {
      const newColumns = localLeadStages.reduce((acc, stage) => ({ ...acc, [stage.name]: [] }), {} as Record<LeadStatus, Lead[]>);
      for (const lead of filteredLeads) {
        if (newColumns[lead.status]) {
          newColumns[lead.status].push(lead);
        } else if (newColumns[localLeadStages[0]?.name]) {
            newColumns[localLeadStages[0].name].push(lead);
        }
      }
      setColumns(newColumns);
    }
  }, [filteredLeads, localLeadStages]);
  
  const activeLead = useMemo(() => allLeads?.find(lead => lead.id === activeDragId), [allLeads, activeDragId]);

  useEffect(() => {
    const leadIdFromUrl = searchParams.get('leadId');
    if (!leadIdFromUrl) return;
  
    setHighlightedLeadId(leadIdFromUrl);
  
    const observer = new MutationObserver((mutations, obs) => {
      const card = document.getElementById(`lead-card-${leadIdFromUrl}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        obs.disconnect(); // Stop observing once the element is found and scrolled to
  
        // Remove highlight after a few seconds
        const timer = setTimeout(() => setHighlightedLeadId(null), 3000);
        // No need to clear this timer in a cleanup function because we disconnect the observer
      }
    });
  
    if (pipelineContainerRef.current) {
      observer.observe(pipelineContainerRef.current, {
        childList: true,
        subtree: true,
      });
    }
  
    return () => {
      observer.disconnect();
    };
  }, [searchParams]);

  useEffect(() => {
    if (!isSheetOpen) {
      setSelectedLead(null);
    }
  }, [isSheetOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCardClick = (lead: Lead) => {
    if (activeDragId) return;
    setSelectedLead(lead);
    setIsSheetOpen(true);
  };

  const confirmDeleteLead = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    setLeadToDelete(lead);
  };
  
  const handleDeleteLead = async () => {
    if (!leadToDelete || !firestore) return;
    
    const leadId = leadToDelete.id;
    const originalLeads = allLeads;

    setAllLeads(prev => prev.filter(l => l.id !== leadId));
    
    setLeadToDelete(null);

    const leadRef = doc(firestore, 'leads', leadId);
    try {
        await deleteDoc(leadRef);
        toast({
            title: 'Sucesso',
            description: `Lead "${leadToDelete.name}" excluído.`,
        });
    } catch (serverError) {
        setAllLeads(originalLeads);
        const permissionError = new FirestorePermissionError({ path: leadRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            title: 'Erro',
            description: 'Falha ao excluir o lead. O item foi restaurado.',
            variant: 'destructive',
        });
    }
  };
  
  const handleUpdateLead = (updatedLeadData: Partial<Lead> & { id: string }) => {
    if (!allLeads) return;
    
    const updatedLeads = allLeads.map(lead => 
        lead.id === updatedLeadData.id ? { ...lead, ...updatedLeadData } : lead
    );
    setAllLeads(updatedLeads);

    if (selectedLead && selectedLead.id === updatedLeadData.id) {
        setSelectedLead(prev => ({ ...prev!, ...updatedLeadData }));
    }
  }

  const handleUpdateStage = (stageId: string, description: string) => {
      if (!localLeadStages) return;
      const updatedStages = localLeadStages.map(stage =>
          stage.id === stageId ? { ...stage, description } : stage
      );
      setLocalLeadStages(updatedStages);
  };

  const findContainer = (id: string | number): LeadStatus | undefined => {
    if (id in columns) {
      return id as LeadStatus;
    }
    const container = Object.keys(columns).find(key => 
        columns[key as LeadStatus].some(item => item.id === id)
    );
    return container as LeadStatus | undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDragId(null);
    if (!over) return;

    const overId = over.id;
    const overContainer = findContainer(overId);
    
    const activeId = active.id;
    const activeContainer = findContainer(activeId);

    if (!activeContainer || !overContainer) return;

    const leadToMove = allLeads?.find(l => l.id === activeId);
    if (!leadToMove) return;

    if (activeContainer !== overContainer) {
        setAllLeads(prev => prev.map(l => l.id === activeId ? { ...l, status: overContainer } : l));

        if (!firestore) return;
        try {
            const leadRef = doc(firestore, 'leads', String(activeId));
            await updateDoc(leadRef, { status: overContainer });
            toast({
                title: 'Lead Atualizado',
                description: `Status de "${leadToMove.name}" alterado para ${overContainer}.`
            });
        } catch (error) {
            console.error("Failed to update lead status:", error);
            setAllLeads(prev => prev.map(l => l.id === activeId ? { ...l, status: activeContainer } : l));
            toast({
                title: "Erro",
                description: "Falha ao atualizar o status do lead. A alteração foi desfeita.",
                variant: "destructive",
            });
        }
    }
  };
  
  if (loadingData && allLeads.length === 0 && localLeadStages.length === 0) {
     return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <Skeleton className="h-10 w-44" />
                <Skeleton className="h-10 w-48" />
            </div>
            <div className="flex flex-1 gap-6 overflow-x-auto p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-[240px] shrink-0">
                        <div className="p-4 bg-muted/50 rounded-lg h-full">
                            <h3 className="font-semibold text-md mb-4 flex justify-between items-center">
                                <Skeleton className="h-5 w-32" />
                                <Badge variant="secondary" className="rounded-full">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                </Badge>
                            </h3>
                            <div className="space-y-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 shrink-0 gap-4">
          <Button onClick={() => setAddLeadSheetOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Novo Lead
          </Button>

            <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nome, e-mail ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

          <div className="w-full max-w-xs">
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger>
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Filtrar por usuário" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Equipe">Visão da Equipe</SelectItem>
                    {users?.map(user => (
                        <SelectItem key={user.id} value={user.displayName}>{user.displayName}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
          >
              <div ref={pipelineContainerRef} className="h-full w-full overflow-x-auto">
                  <div className="flex h-full w-max gap-6 p-1">
                      {(localLeadStages || []).map(stage => (
                          <PipelineColumn
                              key={stage.name}
                              stage={stage}
                              leads={columns[stage.name] || []}
                              onCardClick={handleCardClick}
                              onDelete={confirmDeleteLead}
                              onUpdateStage={handleUpdateStage}
                              highlightedLeadId={highlightedLeadId}
                          />
                      ))}
                  </div>
              </div>
              <DragOverlay>
                  {activeLead ? (
                  <LeadCardDisplay lead={activeLead} color={localLeadStages?.find(s => s.name === activeLead.status)?.color} />
                  ) : null}
              </DragOverlay>
          </DndContext>
        </div>
      </div>
      <LeadDetailSheet 
          lead={selectedLead}
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onUpdateLead={handleUpdateLead}
      />
      <AddLeadForm isOpen={isAddLeadSheetOpen} onOpenChange={setAddLeadSheetOpen} leadStatuses={leadStatuses} />

      <AlertDialog open={!!leadToDelete} onOpenChange={(isOpen) => !isOpen && setLeadToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o lead <span className="font-bold">{leadToDelete?.name}</span>.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteLead}>Continuar</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
