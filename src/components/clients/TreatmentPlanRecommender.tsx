
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, Calendar } from 'lucide-react';
import {
  treatmentPlanRecommendations,
  TreatmentPlanRecommendationsOutput,
} from '@/ai/flows/treatment-plan-recommendations';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';


export function TreatmentPlanRecommender({ plan }: { plan: TreatmentPlan }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TreatmentPlanRecommendationsOutput | null>(null);
  const [progress, setProgress] = useState(plan.progressNotes || '');
  const [feedback, setFeedback] = useState(plan.clientFeedback || '');
  const { toast } = useToast();

    const formatDate = (date: any, targetFormat: string = 'dd/MM/yyyy') => {
      if (!date) return 'N/A';
      let dateObj: Date | null = null;
      
      if (date instanceof Timestamp) {
          dateObj = date.toDate();
      } else if (date instanceof Date) {
          dateObj = date;
      } else if (typeof date === 'string') {
          const parsed = parseISO(date); // Tenta formato ISO 8601
          if (!isNaN(parsed.getTime())) {
              dateObj = parsed;
          } else {
              // Tenta formato 'YYYY-MM-DD', tratando como UTC
              const utcDate = new Date(date + 'T00:00:00');
              if(!isNaN(utcDate.getTime())){
                  dateObj = utcDate;
              }
          }
      }
      
      return dateObj && !isNaN(dateObj.getTime()) ? format(dateObj, targetFormat, { locale: ptBR }) : 'N/A';
    }


  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await treatmentPlanRecommendations({
        clientProgress: progress,
        clientFeedback: feedback,
        currentTreatmentPlan: plan.currentTreatmentPlan || plan.notes || '',
      });
      setResult(response);
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao gerar sugestões. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>Status: <Badge variant={plan.status === 'Ativo' ? 'default' : 'secondary'}>{plan.status}</Badge> | Data de Início: {formatDate(plan.startDate)}</CardDescription>
            </div>
            <Button variant="outline" size="sm">Editar Plano</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><Calendar className="w-4 h-4"/> Sessões</h4>
                <ul className="space-y-3">
                    {(plan.sessions || []).map(s => (
                        <li key={s.sessionNumber} className="flex items-center gap-4 text-sm">
                           <Badge variant={s.completed ? 'default' : 'outline'}>{s.completed ? 'Feito' : 'Próxima'}</Badge>
                           <span className="font-medium">{s.description}</span>
                           <span className="text-muted-foreground ml-auto">{s.date}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <Separator/>
            <div>
                <h4 className="font-semibold text-md mb-2">Instruções Pré/Pós-Cuidado</h4>
                <p className="text-sm text-muted-foreground"><strong>Pré-cuidado:</strong> {plan.preCareInstructions || 'N/A'}</p>
                <p className="text-sm text-muted-foreground"><strong>Pós-cuidado:</strong> {plan.postCareInstructions || 'N/A'}</p>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            <CardTitle>Sugestor de Ajuste com IA</CardTitle>
          </div>
          <CardDescription>
            Gere sugestões com IA com base no progresso e feedback mais recentes do cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="progress">Notas de Progresso do Cliente</Label>
              <Textarea
                id="progress"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                placeholder="Ex: Pele apresenta vermelhidão reduzida, cliente relata satisfação..."
              />
            </div>
            <div>
              <Label htmlFor="feedback">Feedback do Cliente</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ex: 'Minha pele está mais lisa, mas ainda vejo algumas linhas finas...'"
              />
            </div>
            <Button onClick={handleGenerateSuggestions} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar Sugestões'
              )}
            </Button>
          </div>
          {result && (
            <div className="mt-4 rounded-lg border bg-secondary/50 p-4">
              <h4 className="font-semibold mb-2">Ajustes Sugeridos:</h4>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap mb-2">{result.suggestedAdjustments}</p>
              <h4 className="font-semibold mb-2">Justificativa:</h4>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{result.rationale}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
