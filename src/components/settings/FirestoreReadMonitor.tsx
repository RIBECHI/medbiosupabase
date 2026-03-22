'use client';

import { useFirestoreReadCount } from '@/hooks/use-firestore-read-monitor';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useState } from 'react';

export function FirestoreReadMonitor() {
  const { 
    readCount, 
    resetReadCount,
    limit,
    setLimit,
    limitReached,
  } = useFirestoreReadCount();
  const [localLimit, setLocalLimit] = useState(limit.toString());

  const handleSaveLimit = () => {
    const newLimit = parseInt(localLimit, 10);
    if (!isNaN(newLimit) && newLimit >= 0) {
      setLimit(newLimit);
    }
  };

  const progressPercentage = limit > 0 ? (readCount / limit) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="read-limit">Definir Limite de Leitura</Label>
            <div className="flex gap-2">
                <Input
                    id="read-limit"
                    type="number"
                    value={localLimit}
                    onChange={(e) => setLocalLimit(e.target.value)}
                    placeholder="Ex: 10000"
                />
                <Button onClick={handleSaveLimit} aria-label="Salvar limite">
                    <Save className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                Defina um limite para as leituras do Firestore nesta sessão do navegador.
            </p>
        </div>
        <div className="space-y-2">
            <Label>Contador de Leituras (Sessão)</Label>
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                    <p className="text-3xl font-bold">{readCount} / {limit}</p>
                </div>
                <Button variant="outline" size="icon" onClick={resetReadCount} aria-label="Zerar contador">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>
             <p className="text-xs text-muted-foreground">
              Leituras aproximadas iniciadas pelos hooks `useCollection` e `useDoc`.
            </p>
        </div>
      </div>
      
       <div className="space-y-1">
            <Label>Progresso do Uso</Label>
            <Progress value={progressPercentage} />
       </div>

      {limitReached && (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Limite Atingido!</AlertTitle>
            <AlertDescription>
                O limite de {limit} leituras do Firestore foi atingido. Novas leituras serão bloqueadas nesta sessão para proteger sua cota.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
