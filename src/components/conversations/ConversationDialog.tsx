
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { collection, addDoc, serverTimestamp, WithFieldValue, Timestamp } from 'firebase/firestore';
import type { Conversation } from '@/app/conversations/page';
import type { Lead, Client } from '@/lib/types';
import { Phone, ExternalLink, UserPlus, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DisplayMessage = {
    id: string;
    text: string;
    isFromClient: boolean;
    receivedAt: Timestamp;
};

const normalizePhoneNumber = (phone: string | undefined) => {
    if (!phone) return '';
    return phone.split('@')[0].replace(/\D/g, '');
}

export function ConversationDialog({ 
    isOpen, 
    onOpenChange, 
    conversation,
    clients,
    leads
}: { 
    isOpen: boolean; 
    onOpenChange: (isOpen: boolean) => void;
    conversation: Conversation;
    clients: Client[] | undefined;
    leads: Lead[];
}) {
    const [isProcessing, setIsProcessing] = React.useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const firstUnreadRef = React.useRef<HTMLDivElement>(null);

    const displayMessages = React.useMemo((): DisplayMessage[] => {
        if (!conversation) return [];
        const allMessages: DisplayMessage[] = [];
    
        conversation.messages.forEach(msg => {
            // Adiciona a mensagem do atendente (saída) - 'message'
            if (msg.message && typeof msg.message === 'string' && msg.message.trim() !== '') {
                allMessages.push({ 
                    id: msg.id + '-attendant', 
                    text: msg.message, 
                    isFromClient: false, 
                    receivedAt: msg.sentDate,
                });
            }
            // Adiciona a mensagem do cliente (entrada) - 'content'
            if (msg.content && typeof msg.content === 'string' && msg.content.trim() !== '') {
                allMessages.push({ 
                    id: msg.id + '-client', 
                    text: msg.content, 
                    isFromClient: true, 
                    receivedAt: msg.sentDate,
                });
            }
        });
        
        // Ordena todas as mensagens pela data de recebimento
        return allMessages.sort((a, b) => a.receivedAt.toMillis() - b.receivedAt.toMillis());
    
    }, [conversation]);
    
    const existingClient = React.useMemo(() => {
        if (!conversation || !clients) return null;
        const cleanConversationPhone = normalizePhoneNumber(conversation.phone);
        return clients.find(client => {
            if (!client.phone) return false;
            const cleanClientPhone = normalizePhoneNumber(client.phone);
            return cleanClientPhone.endsWith(cleanConversationPhone) || cleanConversationPhone.endsWith(cleanClientPhone);
        });
    }, [conversation, clients]);

    const existingLead = React.useMemo(() => {
        if (!conversation || !leads) return null;
        const cleanConversationPhone = normalizePhoneNumber(conversation.phone);
        return leads.find(lead => {
            if (!lead.phone) return false;
            const cleanLeadPhone = normalizePhoneNumber(lead.phone);
            return cleanLeadPhone.endsWith(cleanConversationPhone) || cleanConversationPhone.endsWith(cleanLeadPhone);
        });
    }, [conversation, leads]);


    React.useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                 if (firstUnreadRef.current) {
                    firstUnreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }, [isOpen, displayMessages]);

    const handleCreateLead = async () => {
        if (!firestore || !existingClient) return;
        setIsProcessing(true);

        const newLeadData: WithFieldValue<Omit<Lead, 'id'>> = {
            name: existingClient.displayName,
            email: existingClient.email || '',
            phone: existingClient.phone || '',
            source: 'WhatsApp', 
            status: 'Novo Lead', 
            createdAt: serverTimestamp(),
            owner: 'Não atribuído',
            potentialValue: 0,
          };
    
          const leadsCollection = collection(firestore, 'leads');
          addDoc(leadsCollection, newLeadData)
            .then(() => {
              toast({
                title: 'Lead Criado!',
                description: `Um novo lead para ${existingClient.displayName} foi criado no funil de vendas.`,
              });
            })
            .catch(serverError => {
              const permissionError = new FirestorePermissionError({
                path: leadsCollection.path,
                operation: 'create',
                requestResourceData: newLeadData,
              });
              errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
              setIsProcessing(false);
            });
    }

    let firstUnreadFound = false;
    const unreadMessageIds = new Set(conversation.messages.filter(m => !m.isRead).map(m => m.id));


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 overflow-hidden">
                            <DialogTitle className="flex items-center gap-2">
                                {conversation.displayName}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2 text-xs">
                                <Phone className="h-3 w-3"/>
                                {conversation.phone}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {existingClient ? (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/clients/${existingClient.id}`}>
                                        <ExternalLink className="mr-2 h-4 w-4"/>
                                        Ver Perfil
                                    </Link>
                                </Button>
                            ): null}

                            {existingLead ? (
                                <Button asChild size="sm" variant="secondary">
                                     <Link href={`/leads?leadId=${existingLead.id}`}>
                                        <Filter className="mr-2 h-4 w-4" />
                                        Ir para Lead
                                    </Link>
                                </Button>
                            ) : existingClient ? (
                                <Button size="sm" variant="secondary" onClick={handleCreateLead} disabled={isProcessing}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    {isProcessing ? 'Criando...' : 'Criar Novo Lead'}
                                </Button>
                            ) : (
                                <Button asChild size="sm">
                                    <Link href={`/clients/new?name=${encodeURIComponent(conversation.displayName)}&phone=${encodeURIComponent(conversation.phone)}`}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Adicionar Cliente
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-2 flex flex-col">
                            {displayMessages.map((msg, index, arr) => {
                                const prevMsg = arr[index - 1]; 
                                const showDateSeparator = !prevMsg || !isSameDay(msg.receivedAt.toDate(), prevMsg.receivedAt.toDate());

                                let refToSet: React.RefObject<HTMLDivElement> | null = null;
                                const originalMessageId = msg.id.replace(/-client|-attendant/, '');
                                if (!firstUnreadFound && unreadMessageIds.has(originalMessageId)) {
                                    refToSet = firstUnreadRef;
                                    firstUnreadFound = true;
                                }

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDateSeparator && (
                                            <div className="text-center text-xs text-muted-foreground my-4">
                                                <span>{format(msg.receivedAt.toDate(), 'PPP', { locale: ptBR })}</span>
                                            </div>
                                        )}
                                        <div ref={refToSet}>
                                            <div className={cn("group relative flex items-end max-w-lg gap-1 my-1", msg.isFromClient ? "self-start" : "self-end flex-row-reverse")}>
                                                <div className={cn("p-3 rounded-lg flex flex-col", msg.isFromClient ? "bg-muted rounded-bl-none" : "bg-primary text-primary-foreground rounded-br-none")}>
                                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                                </div>
                                                <time className="text-xs text-muted-foreground px-1">
                                                    {format(msg.receivedAt.toDate(), 'p', { locale: ptBR })}
                                                </time>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
