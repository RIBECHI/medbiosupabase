'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  type Query,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  aiTrainingDataConverter,
  type AITrainingData,
  settingsConverter, 
  type GeneralSettings,
} from '@/lib/types';
import {
  Bot,
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  Send,
} from 'lucide-react';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// Main page component
export default function AITrainingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<AITrainingData | null>(null);
  const [itemToEdit, setItemToEdit] = useState<AITrainingData | null>(null);

  const trainingDataQuery = useMemo<Query<AITrainingData> | null>(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'aiTrainingData'),
      orderBy('createdAt', 'desc')
    ).withConverter(aiTrainingDataConverter);
  }, [firestore]);

  const { data: trainingData, loading } = useCollection<AITrainingData>(
    trainingDataQuery
  );

  const handleAddItem = async () => {
    if (!topic.trim() || !content.trim() || !firestore) return;
    setIsAdding(true);
    try {
      await addDoc(collection(firestore, 'aiTrainingData'), {
        topic,
        content,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Sucesso', description: 'Novo dado de treinamento adicionado.' });
      setTopic('');
      setContent('');
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o dado.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleDeleteItem = async () => {
      if (!itemToDelete || !firestore) return;
      const idToDelete = itemToDelete.id;
      setItemToDelete(null); // Close dialog immediately for better UX
      try {
          await deleteDoc(doc(firestore, 'aiTrainingData', idToDelete));
          toast({ title: 'Sucesso', description: 'Dado de treinamento removido.' });
      } catch (error) {
          console.error(error);
          toast({
            title: 'Erro',
            description: 'Não foi possível remover o dado.',
            variant: 'destructive',
          });
      }
  }
  
  const handleUpdateItem = async (id: string, updatedTopic: string, updatedContent: string) => {
      if (!id || !updatedTopic.trim() || !updatedContent.trim() || !firestore) return false;
      try {
          await updateDoc(doc(firestore, 'aiTrainingData', id), { topic: updatedTopic, content: updatedContent });
          toast({ title: 'Sucesso', description: 'Dado de treinamento atualizado.' });
          setItemToEdit(null);
          return true;
      } catch (error) {
          console.error(error);
          toast({
            title: 'Erro',
            description: 'Não foi possível atualizar o dado.',
            variant: 'destructive',
          });
          return false;
      }
  }

  const handleSyncWithN8n = async () => {
    if (!trainingData || trainingData.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Sem dados para enviar',
            description: 'Adicione alguns dados de treinamento antes de sincronizar.',
        });
        return;
    }

    setIsSyncing(true);
    
    try {
        const response = await fetch('/api/n8n-sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ trainingData }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Falha ao comunicar com a API interna.');
        }

        toast({
            title: "Sincronização Enviada",
            description: `${trainingData.length} itens foram enviados para o n8n para treinamento.`,
        });
    } catch (error: any) {
        console.error("Erro ao sincronizar com o n8n:", error);
        toast({
            variant: 'destructive',
            title: "Erro na Sincronização",
            description: error.message || "Não foi possível enviar os dados. Verifique as configurações.",
        });
    } finally {
        setIsSyncing(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'dd/MM/yy HH:mm');
  }

  return (
    <>
      <PageHeader
        title="Treinamento da IA"
        description="Gerencie a base de conhecimento do seu agente de IA do n8n."
      >
        <Button onClick={handleSyncWithN8n} disabled={isSyncing || loading || !trainingData || trainingData.length === 0}>
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar com n8n'}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna para Adicionar Dados */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Novo Conhecimento</CardTitle>
              <CardDescription>
                Insira um tópico e o conteúdo correspondente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Tópico ou Pergunta (Ex: Política de Cancelamento)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Textarea
                  placeholder="Conteúdo ou Resposta (Ex: O cliente deve avisar com 48h de antecedência...)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                />
              </div>
              <Button
                onClick={handleAddItem}
                disabled={isAdding || !topic.trim() || !content.trim()}
                className="w-full"
              >
                {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Adicionar
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Coluna para Listar Dados */}
        <div className="lg:col-span-2">
           <Card>
                <CardHeader>
                    <CardTitle>Base de Conhecimento</CardTitle>
                    <CardDescription>
                        Lista de todos os dados de treinamento cadastrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {loading ? (
                            Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                        ) : trainingData && trainingData.length > 0 ? (
                           trainingData.map(item => (
                               <div key={item.id} className="border p-4 rounded-lg relative group">
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setItemToEdit(item)}>
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setItemToDelete(item)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                    <h4 className="font-semibold text-primary pr-20">{item.topic}</h4>
                                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.content}</p>
                                    <p className="text-xs text-muted-foreground/50 mt-2">Criado em: {formatDate(item.createdAt)}</p>
                               </div>
                           ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                                <Bot className="w-12 h-12 mb-4" />
                                <p>Nenhum dado de treinamento encontrado.</p>
                                <p className="text-xs">Comece adicionando um novo conhecimento ao lado.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
           </Card>
        </div>
      </div>
      
      {/* Edit Dialog */}
      {itemToEdit && (
        <EditTrainingItemDialog 
            item={itemToEdit}
            onUpdate={handleUpdateItem}
            onOpenChange={(isOpen) => !isOpen && setItemToEdit(null)}
        />
      )}

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o dado de treinamento sobre <span className="font-bold">{itemToDelete?.topic}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteItem}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Edit Dialog Component
function EditTrainingItemDialog({ item, onUpdate, onOpenChange }: { item: AITrainingData, onUpdate: (id: string, topic: string, content: string) => Promise<boolean>, onOpenChange: (isOpen: boolean) => void }) {
    const [topic, setTopic] = useState(item.topic);
    const [content, setContent] = useState(item.content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const success = await onUpdate(item.id, topic, content);
        if (success) {
            onOpenChange(false);
        }
        setIsSaving(false);
    }

    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Editar Dado de Treinamento</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="edit-topic">Tópico</label>
                        <Input id="edit-topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="edit-content">Conteúdo</label>
                        <Textarea id="edit-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={isSaving || !topic.trim() || !content.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
