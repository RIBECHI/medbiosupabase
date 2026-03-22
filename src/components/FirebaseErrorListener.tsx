
'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Em vez de mostrar um diálogo, loga o erro no console
      // e mostra uma notificação discreta.
      console.error("Firestore Permission Error Caught:", error.context);
      // toast({
      //   variant: "destructive",
      //   title: "Erro de Permissão",
      //   description: "Uma operação foi bloqueada pelas regras de segurança. Verifique o console para detalhes.",
      // });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  // Não renderiza mais nada na UI, apenas lida com o erro em segundo plano.
  return null;
}
