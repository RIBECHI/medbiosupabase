

'use client';

import { useMemo, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { MessageSquareText, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type LeadConversationModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  leadName: string;
  leadPhone: string;
};

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

export function LeadConversationModal({
  isOpen,
  onOpenChange,
  leadName,
  leadPhone,
}: LeadConversationModalProps) {

  const normalizedLeadPhone = useMemo(() => normalizePhoneNumber(leadPhone), [leadPhone]);

  const messagesQuery = useMemo(() => {
    if (!firestore || !normalizedLeadPhone) return null;
    return query(
        collection(firestore, 'whatsappMessages'),
        where('clientPhone', '==', normalizedLeadPhone),
        orderBy('sentDate', 'asc')
  }, [firestore, normalizedLeadPhone]);

  
  const displayMessages = useMemo((): DisplayMessage[] => {
    if (!conversationMessages) return [];
    const allMessages: DisplayMessage[] = [];

    conversationMessages.forEach(msg => {
        // Adiciona a mensagem do cliente (entrada) - 'content'
        if (msg.content && typeof msg.content === 'string' && msg.content.trim() !== '') {
            allMessages.push({ 
                id: msg.id + '-client', 
                text: msg.content, 
                isFromClient: true, 
                receivedAt: msg.sentDate,
            });
        }
        // Adiciona a mensagem do atendente (saída) - 'message'
        if (msg.message && typeof msg.message === 'string' && msg.message.trim() !== '') {
            allMessages.push({ 
                id: msg.id + '-attendant', 
                text: msg.message, 
                isFromClient: false, 
                receivedAt: msg.sentDate,
            });
        }
    });
    
    return allMessages.sort((a, b) => a.receivedAt.toMillis() - b.receivedAt.toMillis());

  }, [conversationMessages]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 100);
    }
  }, [isOpen, displayMessages]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-6 w-6" />
            Conversa com {leadName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Phone className="h-4 w-4"/>
            {leadPhone}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
            <div className="p-4 space-y-2 flex flex-col">
            {loading && (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-3/4 self-start" />
                    <Skeleton className="h-16 w-2/3 self-end" />
                    <Skeleton className="h-8 w-1/2 self-start" />
                </div>
            )}
            {!loading && displayMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <MessageSquareText className="w-12 h-12 mb-2" />
                    <p>Nenhuma mensagem encontrada para este contato.</p>
                </div>
            )}
            {!loading && displayMessages.map((msg, index, arr) => {
                if (!msg || !msg.receivedAt) return null;

                const prevMsg = arr[index - 1]; 
                const showDateSeparator = !prevMsg || !isSameDay(msg.receivedAt.toDate(), prevMsg.receivedAt.toDate());
                
                const { isFromClient, text } = msg;
                
                if (!text) return null;

                return (
                    <div key={msg.id}>
                         {showDateSeparator && (
                            <div className="text-center text-xs text-muted-foreground my-4">
                                <span>{format(msg.receivedAt.toDate(), 'PPP', { locale: ptBR })}</span>
                            </div>
                        )}
                        <div className={cn("group relative flex items-end max-w-lg gap-1 my-1", isFromClient ? "self-start" : "self-end flex-row-reverse")}>
                            <div className={cn("p-3 rounded-lg flex flex-col", isFromClient ? "bg-muted rounded-bl-none" : "bg-primary text-primary-foreground rounded-br-none")}>
                                <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
                            </div>
                            <time className="text-xs text-muted-foreground px-1">
                                {format(msg.receivedAt.toDate(), 'p', { locale: ptBR })}
                            </time>
                        </div>
                    </div>
                )
           })}
           <div ref={messagesEndRef} />
           </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
