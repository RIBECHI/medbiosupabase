'use client';

import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';

const DEFAULT_LIMIT = 10000;
const STORAGE_KEY = 'firestore_read_limit';

// --- CONTEXTO 1: ESTADO (Muda sempre que lê) ---
// Quem usar isso vai renderizar a cada leitura (Use apenas em componentes visuais, como o Monitor)
type FirestoreStateContextType = {
  readCount: number;
  limit: number;
  limitReached: boolean;
};

// --- CONTEXTO 2: AÇÕES (Estável) ---
// Quem usar isso NÃO vai renderizar quando o contador mudar (Use nos Hooks de dados)
type FirestoreActionsContextType = {
  incrementReadCount: () => void;
  resetReadCount: () => void;
  setLimit: (newLimit: number) => void;
};

const FirestoreStateContext = createContext<FirestoreStateContextType | undefined>(undefined);
const FirestoreActionsContext = createContext<FirestoreActionsContextType | undefined>(undefined);

export function FirestoreReadProvider({ children }: { children: ReactNode }) {
  const [readCount, setReadCount] = useState(0);
  const [limit, setInternalLimit] = useState(DEFAULT_LIMIT);
  const [halfwayWarningShown, setHalfwayWarningShown] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    try {
      const storedLimit = localStorage.getItem(STORAGE_KEY);
      if (storedLimit) {
        setInternalLimit(JSON.parse(storedLimit));
      }
    } catch (error) {
      console.error("Could not read Firestore limit from localStorage", error);
    }
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLimit));
      setInternalLimit(newLimit);
      setHalfwayWarningShown(false); 
      setLimitReached(false);
    } catch (error) {
      console.error("Could not save Firestore limit to localStorage", error);
    }
  }, []);

  const incrementReadCount = useCallback(() => {
    setReadCount(prevCount => {
        const newCount = prevCount + 1;
        return newCount;
    });
  }, []);

  // Effect separado para monitorar os limites (Isso tira a lógica pesada de dentro do render cycle)
  useEffect(() => {
     if (limitReached) return;

     // Aviso de 50%
     if (readCount >= limit / 2 && !halfwayWarningShown && readCount < limit) {
         toast({
             title: "Aviso de Cota do Firestore",
             description: `Você atingiu 50% (${readCount} de ${limit}) do seu limite de leitura definido.`,
             variant: 'default',
             duration: 5000,
         });
         setHalfwayWarningShown(true);
     }

     // Aviso de 100%
     if (readCount >= limit && !limitReached) {
         setLimitReached(true);
         toast({
            title: "Limite Atingido",
            description: "Leituras bloqueadas para proteger sua cota.",
            variant: "destructive"
         });
     }
  }, [readCount, limit, halfwayWarningShown, limitReached]);

  const resetReadCount = useCallback(() => {
    setReadCount(0);
    setHalfwayWarningShown(false);
    setLimitReached(false);
    toast({
        title: "Contador Zerado",
        description: "O contador de leituras do Firestore foi reiniciado.",
    });
  }, []);

  const stateValue = useMemo(() => ({
      readCount,
      limit,
      limitReached
  }), [readCount, limit, limitReached]);

  const actionsValue = useMemo(() => ({
      incrementReadCount,
      resetReadCount,
      setLimit
  }), [incrementReadCount, resetReadCount, setLimit]);

  return (
    <FirestoreStateContext.Provider value={stateValue}>
      <FirestoreActionsContext.Provider value={actionsValue}>
        {children}
      </FirestoreActionsContext.Provider>
    </FirestoreStateContext.Provider>
  );
}

// Hook 1: Para o Monitor (Precisa ver os números mudando)
export function useFirestoreReadCount() {
  const state = useContext(FirestoreStateContext);
  const actions = useContext(FirestoreActionsContext);
  
  if (state === undefined || actions === undefined) {
    throw new Error('useFirestoreReadCount must be used within a FirestoreReadProvider');
  }
  
  return { ...state, ...actions };
}

// Hook 2: Para os Hooks do Firebase (SÓ QUER INCREMENTAR, NÃO QUER SABER O VALOR)
export function useIncrementFirestoreReads() {
    const context = useContext(FirestoreActionsContext);
    if (context === undefined) {
      throw new Error('useIncrementFirestoreReads must be used within a FirestoreReadProvider');
    }
    return context.incrementReadCount;
}