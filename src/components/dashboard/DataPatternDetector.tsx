
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2 } from 'lucide-react';
import { detectDataPatterns, DetectDataPatternsOutput } from '@/ai/flows/data-pattern-detection';
import { useToast } from '@/hooks/use-toast';

export function DataPatternDetector() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectDataPatternsOutput | null>(null);
  const { toast } = useToast();

  const handleDetectPatterns = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      // NOTE: In a real-world scenario, you would fetch this data from your backend.
      // We are sending dummy data for demonstration purposes.
      const clientData = JSON.stringify([
          { age: 39, gender: 'Feminino', location: 'New York, NY' },
          { age: 33, gender: 'Masculino', location: 'Los Angeles, CA' },
          { age: 28, gender: 'Feminino', location: 'Chicago, IL' },
      ]);
      const treatmentData = JSON.stringify([
          { name: 'HydraFacial', clientAge: 39 },
          { name: 'Botox', clientAge: 33 },
          { name: 'Peeling Químico', clientAge: 28 },
      ]);
      
      const response = await detectDataPatterns({ clientData, treatmentData });
      setResult(response);
    } catch (error) {
      console.error('Erro ao detectar padrões de dados:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao detectar padrões de dados. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary"/>
            <CardTitle>Insights com IA</CardTitle>
        </div>
        <CardDescription>
          Detecte automaticamente padrões significativos em seus dados de clientes e tratamentos para informar estratégias de marketing e ofertas de serviços.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-4">
          <Button onClick={handleDetectPatterns} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando Dados...
              </>
            ) : (
              'Detectar Padrões de Dados'
            )}
          </Button>
          {result && (
            <div className="mt-4 rounded-lg border bg-secondary/50 p-4 w-full">
              <h4 className="font-semibold mb-2">Análise Concluída:</h4>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{result.patterns}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
