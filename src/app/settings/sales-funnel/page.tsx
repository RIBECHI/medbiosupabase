'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Skeleton } from '@/components/ui/skeleton';

const generateRandomColor = () => {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

function SortableStageItem({ stage, onSave, onDelete }: { stage: LeadStage, onSave: (id: string, name: string, color: string) => void, onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const [name, setName] = useState(stage.name);
  const [color, setColor] = useState(stage.color);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(stage.name);
    setColor(stage.color);
  }, [stage]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as 'relative',
  };

  const handleNameSave = () => {
    if (name.trim() !== '' && name !== stage.name) {
      onSave(stage.id, name, color);
    }
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (name.trim() !== '') {
        onSave(stage.id, name, newColor);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-background rounded-lg border">
      <Button variant="ghost" size="icon" className="cursor-grab" {...listeners} {...attributes}>
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </Button>
      <div 
        className="h-8 w-8 rounded-md border cursor-pointer"
        style={{ backgroundColor: color }}
        onClick={() => colorInputRef.current?.click()}
      >
        <input 
          ref={colorInputRef}
          type="color" 
          value={color} 
          onChange={(e) => handleColorChange(e.target.value)}
          className="opacity-0 w-0 h-0 absolute"
        />
      </div>
      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleNameSave} />
      <Button variant="ghost" size="icon" onClick={() => onDelete(stage.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function SalesFunnelPage() {
  const { toast } = useToast();
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const stagesQuery = useMemo(() => {
    if (!firestore) return null;
  }, [firestore]);


  useEffect(() => {
    if (firestoreStages) {
      setStages(firestoreStages);
    }
  }, [firestoreStages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over!.id);
      const newOrder = arrayMove(stages, oldIndex, newIndex);
      setStages(newOrder);

      // Update order in Firestore
      if (firestore) {
        const batch = writeBatch(firestore);
        newOrder.forEach((stage, index) => {
          const stageRef = doc(firestore, 'leadStages', stage.id);
          batch.update(stageRef, { order: index });
        });
        await batch.commit();
        toast({ title: "Sucesso", description: "Ordem das etapas atualizada." });
      }
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim() || !firestore) return;
    setIsAdding(true);
    const newStage = {
      name: newStageName,
      order: stages.length,
      color: generateRandomColor(),
    };
    try {
      await addDoc(collection(firestore, 'leadStages'), newStage);
      setNewStageName('');
      toast({ title: "Sucesso", description: "Nova etapa adicionada." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível adicionar a etapa.", variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveStage = async (id: string, name: string, color: string) => {
    if (!firestore) return;
    const stageRef = doc(firestore, 'leadStages', id);
    try {
        await updateDoc(stageRef, { name, color });
        toast({ title: "Sucesso", description: `Etapa "${name}" atualizada.` });
    } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível salvar a etapa.", variant: 'destructive' });
    }
  };

  const handleDeleteStage = async (id: string) => {
    if (!firestore) return;
    if (stages.length <= 1) {
        toast({ title: "Ação não permitida", description: "Você deve ter pelo menos uma etapa no funil.", variant: 'destructive' });
        return;
    }
    const stageRef = doc(firestore, 'leadStages', id);
    try {
        await deleteDoc(stageRef);
        toast({ title: "Sucesso", description: "Etapa removida." });
    } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Não foi possível remover a etapa.", variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader
        title="Personalizar Funil de Vendas"
        description="Adicione, renomeie, reordene e exclua as etapas do seu funil de vendas."
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Etapas do Funil</CardTitle>
          <CardDescription>
            Arraste para reordenar, clique no nome para editar e no quadrado colorido para alterar a cor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {stages.map((stage) => (
                    <SortableStageItem key={stage.id} stage={stage} onSave={handleSaveStage} onDelete={handleDeleteStage}/>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="mt-6 flex gap-2">
            <Input
              placeholder="Nome da nova etapa"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              disabled={isAdding}
            />
            <Button onClick={handleAddStage} disabled={isAdding || !newStageName.trim()}>
              {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
