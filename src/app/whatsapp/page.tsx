
'use client';

import * as React from 'react';
import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, MessageSquareText, Phone, Trash2, Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';


type Conversation = {
    phone: string;
    rawPhone: string;
    displayName: string;
    lastMessageTimestamp: Timestamp;
    messages: WhatsAppMessage[];
    avatarFallback: string;
    isClient: boolean;
}

const normalizePhoneNumber = (phone: string | undefined) => {
    if (!phone) return '';
    const part = phone.split('@')[0];
    const digits = part.replace(/\D/g, '');
    return digits || part;
}

function WhatsAppPageComponent() {
    const searchParams = useSearchParams();
    const phoneFromUrl = searchParams.get('phone');
    
    const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(phoneFromUrl);
    const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    // Removido o filtro 'where' do servidor para evitar erro de índice composto
    const messagesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'whatsappMessages'), 
            orderBy('sentDate', 'desc'), 
            limit(200)
    }, [firestore]);

    
    const conversations = useMemo((): Conversation[] => {
        if (!allMessages) return [];
        
        // Filtramos apenas mensagens de não-clientes no lado do cliente
        const nonClientMessages = allMessages.filter(msg => !msg.isClient);
        
        const convosMap: Map<string, Conversation> = new Map();

        nonClientMessages.forEach(msg => {
            const normalizedPhone = normalizePhoneNumber(msg.clientPhone);
            if (!normalizedPhone) return;

            let convo = convosMap.get(normalizedPhone);

            if (!convo) {
                 const clientName = msg.clientName || 'Cliente Desconhecido';
                convo = {
                    phone: normalizedPhone,
                    rawPhone: msg.clientPhone,
                    displayName: clientName,
                    lastMessageTimestamp: msg.sentDate,
                    messages: [],
                    avatarFallback: clientName.substring(0, 2).toUpperCase(),
                    isClient: msg.isClient,
                };
            }

            convo.messages.push(msg);

            if (msg.sentDate.seconds > convo.lastMessageTimestamp.seconds) {
                convo.lastMessageTimestamp = msg.sentDate;
            }

            convosMap.set(normalizedPhone, convo);
        });
        
        return Array.from(convosMap.values()).sort((a, b) => b.lastMessageTimestamp.seconds - a.lastMessageTimestamp.seconds);

    }, [allMessages]);

    const selectedConversation = useMemo(() => {
        if (!selectedPhoneNumber) return null;
        const normalizedSelectedPhone = normalizePhoneNumber(selectedPhoneNumber);
        return conversations.find(c => c.phone === normalizedSelectedPhone) || null;
    }, [selectedPhoneNumber, conversations]);


    const handleCreateClientAndLead = async () => {
        if (!firestore || !selectedConversation) {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Conversa não selecionada.',
          });
          return;
        }
    
        setIsProcessing(true);
    
        const { rawPhone, displayName } = selectedConversation;
        
        const newClientData: WithFieldValue<Omit<Client, 'id'>> = {
            displayName: displayName,
            email: '',
            phone: rawPhone,
            photoURL: `https://picsum.photos/seed/${encodeURIComponent(displayName)}/100/100`,
            joinDate: serverTimestamp(),
        };

        const clientsCollection = collection(firestore, 'clients');
        addDoc(clientsCollection, newClientData)
        .then(async () => {
            toast({
                title: 'Cliente Adicionado!',
                description: `${displayName} foi adicionado como cliente.`,
            });
            const newLeadData: WithFieldValue<Omit<Lead, 'id'>> = {
                name: displayName,
                email: '',
                phone: rawPhone,
                source: 'WhatsApp',
                status: 'Novo Lead', 
                owner: 'Não atribuído', 
                potentialValue: 0,
                notes: `Lead criado via WhatsApp.`,
                createdAt: serverTimestamp(),
            };
    
            await addDoc(collection(firestore, 'leads'), newLeadData);
            
            toast({
                title: 'Lead Criado!',
                description: `Um novo lead para ${displayName} foi criado no funil de vendas.`,
            });

            // Atualiza as mensagens para isClient: true
            const messagesToUpdateQuery = query(
                collection(firestore, 'whatsappMessages'), 
                where('clientPhone', '==', rawPhone)
            );
            const snapshot = await getDocs(messagesToUpdateQuery);
            const batchUpdate = writeBatch(firestore);
            snapshot.docs.forEach(doc => {
                batchUpdate.update(doc.ref, { isClient: true });
            });
            await batchUpdate.commit();

            toast({ title: 'Conversa Atualizada!', description: 'A conversa foi movida para o histórico do cliente.' });

        })
        .catch(serverError => {
                path: 'clients or leads',
                operation: 'create',
                requestResourceData: { client: newClientData },
            });
        })
        .finally(() => {
            setIsProcessing(false);
            setSelectedPhoneNumber(null);
        });
      };


    const formatDate = (date: any, formatString: string = 'dd/MM/yyyy HH:mm') => {
        if (!date) return 'N/A';
        let dateObj: Date | null = null;

        if (date instanceof Timestamp) { 
            dateObj = date.toDate();
        } else if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            dateObj = new Date(date);
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            return format(dateObj, formatString);
        }
        return 'Data inválida';
    }

    const handleDeleteConversation = async () => {
        if (!firestore || !conversationToDelete) return;

        const messageIdsToDelete = conversationToDelete.messages.map(msg => msg.id);

        if (selectedPhoneNumber === conversationToDelete.phone) {
            setSelectedPhoneNumber(null);
        }
        setConversationToDelete(null);

        const batch = writeBatch(firestore);
        messageIdsToDelete.forEach(id => {
            const docRef = doc(firestore, 'whatsappMessages', id);
            batch.delete(docRef);
        });

        batch.commit()
            .then(() => {
                toast({
                    title: 'Conversa Excluída',
                    description: `A conversa com ${conversationToDelete.displayName} foi removida.`,
                });
            })
            .catch((serverError) => {
                toast({
                    variant: 'destructive',
                    title: 'Erro na Exclusão',
                    description: 'A conversa não pôde ser excluída. Tente novamente.',
                });
                 console.error('Failed to delete conversation:', serverError);
            });
    }
    
    const loading = loadingMessages && conversations.length === 0;

  return (
    <>
      <PageHeader
        title={<span className="text-green-500">Acompanhamento do WhatsApp</span>}
        description="Gerencie mensagens de contatos que ainda não são clientes."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 h-[calc(100vh-10rem)]">
        <Card className="md:col-span-1 lg:col-span-1 flex flex-col h-full">
            <CardHeader>
                <CardTitle>Novos Contatos</CardTitle>
                <CardDescription>Lista de contatos que não são clientes.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                             <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-2">
                        {conversations.map((convo) => (
                                <button
                                    key={convo.phone}
                                    onClick={() => setSelectedPhoneNumber(convo.phone)}
                                    className={cn(
                                        'w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors',
                                        selectedConversation?.phone === convo.phone ? 'bg-muted' : 'hover:bg-muted/50'
                                    )}
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback>{convo.avatarFallback}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold truncate text-primary">{convo.displayName}</p>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-muted-foreground truncate">{convo.phone}</p>
                                            <time className="text-xs text-muted-foreground">{formatDate(convo.lastMessageTimestamp, 'HH:mm')}</time>
                                        </div>
                                    </div>
                                </button>
                        ))}
                    </div>
                )}
                {!loading && conversations.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <MessageSquareText className="h-12 w-12 text-muted-foreground mb-4"/>
                        <p className="text-muted-foreground">Nenhum novo contato encontrado.</p>
                    </div>
                )}
                </ScrollArea>
            </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-3 flex flex-col h-full">
            {selectedConversation ? (
                <>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                                {selectedConversation.displayName}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <Phone className="h-4 w-4"/>
                                {selectedConversation.phone}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button onClick={handleCreateClientAndLead} disabled={isProcessing}>
                              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4" />}
                              {isProcessing ? 'Adicionando...' : `Adicionar Cliente e Lead`}
                           </Button>
                        </div>
                    </div>
                    {selectedConversation && (
                        <div className="mt-4">
                            <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => setConversationToDelete(selectedConversation)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Conversa
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                   <p className="text-center p-4 text-sm text-muted-foreground">A visualização detalhada da conversa para novos contatos está disponível na página <Link href={`/conversations?phone=${selectedConversation.phone}`} className="text-primary underline">Conversas</Link>.</p>
                </CardContent>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full">
                    <MessageSquareText className="h-16 w-16 text-muted-foreground/50 mb-4"/>
                    <p className="text-muted-foreground">Selecione um contato para ver as opções.</p>
                </div>
            )}
        </Card>
    </div>
     <AlertDialog open={!!conversationToDelete} onOpenChange={(isOpen) => !isOpen && setConversationToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os registros de mensagem para <strong>{conversationToDelete?.displayName}</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConversation}>Excluir Conversa</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

export default function WhatsAppPage() {
    return (
        <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <WhatsAppPageComponent />
        </Suspense>
    )
}
