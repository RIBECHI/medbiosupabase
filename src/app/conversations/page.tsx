'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MessageSquareText, Trash2, Loader2, Edit, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ConversationDialog } from '@/components/conversations/ConversationDialog';
import { createClient } from '@/lib/supabase/client';
import type { WhatsAppMessage, Client, Lead, LeadStage } from '@/lib/supabase/types';

export type Conversation = {
  phone: string;
  displayName: string;
  lastMessageTimestamp: string;
  messages: WhatsAppMessage[];
  avatarFallback: string;
  unreadCount: number;
  stageColor?: string;
  clientId?: string;
  isClient: boolean;
};

const normalizePhone = (phone: string | undefined) => {
  if (!phone) return '';
  return phone.split('@')[0].replace(/\D/g, '');
};

function ConversationsPageComponent() {
  const searchParams = useSearchParams();
  const phoneFromUrl = searchParams.get('phone');
  const supabase = createClient();
  const { toast } = useToast();

  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [editingConvo, setEditingConvo] = useState<{ phone: string; name: string } | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [msgsRes, clientsRes, leadsRes, stagesRes] = await Promise.all([
        supabase
          .from('whatsapp_messages')
          .select('*')
          .order('sent_date', { ascending: false })
          .limit(200),
        supabase.from('clients').select('id, display_name, phone'),
        supabase.from('leads').select('id, name, phone, status'),
        supabase.from('lead_stages').select('*').order('order'),
      ]);

      if (msgsRes.data) setMessages(msgsRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (stagesRes.data) setLeadStages(stagesRes.data);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime — escuta só inserções novas (não relê tudo)
    const channel = supabase
      .channel('whatsapp-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
      }, (payload) => {
        setMessages(prev => [payload.new as WhatsAppMessage, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Monta conversas agrupadas por telefone
  const conversations = useMemo<Conversation[]>(() => {
    const map = new Map<string, Conversation>();

    messages.forEach(msg => {
      const phone = normalizePhone(msg.client_phone);
      if (!phone) return;

      let convo = map.get(phone);
      if (!convo) {
        convo = {
          phone,
          displayName: msg.client_name || phone,
          lastMessageTimestamp: msg.sent_date,
          messages: [msg],
          avatarFallback: (msg.client_name || phone).substring(0, 2).toUpperCase(),
          unreadCount: 0,
          isClient: msg.is_client,
        };
      } else {
        if (!convo.messages.some(m => m.id === msg.id)) {
          convo.messages.push(msg);
          if (new Date(msg.sent_date) > new Date(convo.lastMessageTimestamp)) {
            convo.lastMessageTimestamp = msg.sent_date;
          }
        }
      }
      convo.unreadCount = convo.messages.filter(m => !m.is_read).length;
      map.set(phone, convo);
    });

    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    // Enriquece com dados de clientes
    sorted.forEach(convo => {
      const match = clients.find(c => {
        const cp = normalizePhone(c.phone);
        return cp && (cp.endsWith(convo.phone.slice(-8)) || convo.phone.endsWith(cp.slice(-8)));
      });
      if (match) {
        convo.displayName = match.display_name;
        convo.avatarFallback = match.display_name.substring(0, 2).toUpperCase();
        convo.clientId = match.id;
      }

      // Cor do estágio do lead
      const leadMatch = leads.find(l => {
        const lp = normalizePhone(l.phone);
        return lp && (lp.endsWith(convo.phone.slice(-8)) || convo.phone.endsWith(lp.slice(-8)));
      });
      if (leadMatch) {
        const stage = leadStages.find(s => s.name === leadMatch.status);
        if (stage) convo.stageColor = stage.color;
      }
    });

    return sorted;
  }, [messages, clients, leads, leadStages]);

  const filteredConversations = useMemo(() => {
    if (filter === 'unread') return conversations.filter(c => c.unreadCount > 0);
    if (filter === 'read') return conversations.filter(c => c.unreadCount === 0);
    return conversations;
  }, [conversations, filter]);

  useEffect(() => {
    if (phoneFromUrl && conversations.length > 0) {
      const convo = conversations.find(c => c.phone === phoneFromUrl);
      if (convo) handleConversationSelect(convo);
    }
  }, [phoneFromUrl, conversations]);

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsDialogOpen(true);
    if (conversation.unreadCount === 0) return;

    const unreadIds = conversation.messages.filter(m => !m.is_read).map(m => m.id);
    await supabase
      .from('whatsapp_messages')
      .update({ is_read: true })
      .in('id', unreadIds);

    setMessages(prev =>
      prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m)
    );
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    const ids = conversationToDelete.messages.map(m => m.id);
    if (selectedConversation?.phone === conversationToDelete.phone) {
      setIsDialogOpen(false);
      setSelectedConversation(null);
    }
    setMessages(prev => prev.filter(m => !ids.includes(m.id)));
    setConversationToDelete(null);
    const { error } = await supabase.from('whatsapp_messages').delete().in('id', ids);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir a conversa.' });
      loadData();
    } else {
      toast({ title: 'Conversa excluída', description: `Conversa com ${conversationToDelete.displayName} removida.` });
    }
  };

  const handleSaveName = async () => {
    if (!editingConvo) return;
    const { phone, name } = editingConvo;
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome não pode ficar em branco.' });
      return;
    }
    setIsSavingName(true);
    const convo = conversations.find(c => c.phone === phone);
    try {
      if (convo?.clientId) {
        await supabase.from('clients').update({ display_name: name }).eq('id', convo.clientId);
        setClients(prev => prev.map(c => c.id === convo.clientId ? { ...c, display_name: name } : c));
        toast({ title: 'Sucesso!', description: `Nome atualizado para "${name}".` });
      }
      setEditingConvo(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o nome.' });
    } finally {
      setIsSavingName(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try { return format(new Date(dateStr), 'HH:mm'); } catch { return ''; }
  };

  return (
    <>
      <div className="flex h-full flex-col">
        <Card className="flex flex-1 flex-col">
          <div className="p-6">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="unread">Não Lidas</TabsTrigger>
                <TabsTrigger value="read">Lidas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {loading ? (
                  <div className="space-y-4 p-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <MessageSquareText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma conversa encontrada.</p>
                  </div>
                ) : (
                  filteredConversations.map(convo => (
                    <div
                      key={convo.phone}
                      className="group w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors relative cursor-pointer hover:bg-muted/50"
                      style={{ borderLeft: `4px solid ${convo.stageColor || 'transparent'}` }}
                      onClick={() => handleConversationSelect(convo)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{convo.avatarFallback}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        {editingConvo?.phone === convo.phone ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <Input
                              value={editingConvo.name}
                              onChange={e => setEditingConvo({ ...editingConvo, name: e.target.value })}
                              className="h-8"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveName();
                                if (e.key === 'Escape') setEditingConvo(null);
                              }}
                            />
                            <Button size="icon" className="h-8 w-8" onClick={handleSaveName} disabled={isSavingName}>
                              {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate text-primary">{convo.displayName}</p>
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"
                              onClick={e => { e.stopPropagation(); setEditingConvo({ phone: convo.phone, name: convo.displayName }); }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground truncate">{convo.phone}</p>
                          <time className="text-xs text-muted-foreground">{formatTime(convo.lastMessageTimestamp)}</time>
                        </div>
                      </div>
                      {convo.unreadCount > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                          <span className="text-xs font-bold text-green-500">{convo.unreadCount}</span>
                        </div>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100"
                        onClick={e => { e.stopPropagation(); setConversationToDelete(convo); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {selectedConversation && (
        <ConversationDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          conversation={selectedConversation}
          clients={clients as any}
          leads={leads as any}
        />
      )}

      <AlertDialog open={!!conversationToDelete} onOpenChange={open => !open && setConversationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Exclui permanentemente todos os registros de <strong>{conversationToDelete?.displayName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ConversationsPageComponent />
    </Suspense>
  );
}
