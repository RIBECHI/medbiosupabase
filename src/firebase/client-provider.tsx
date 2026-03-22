'use client';

import * as React from 'react';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { FirestoreReadProvider } from '@/hooks/use-firestore-read-monitor';

interface FirebaseInstances {
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
}

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Use state to ensure Firebase is initialized only once
  const [firebaseInstances, setFirebaseInstances] = React.useState<FirebaseInstances | null>(null);

  React.useEffect(() => {
    // This effect runs once on mount, initializing Firebase
    if (!firebaseInstances) {
        setFirebaseInstances(initializeFirebase());
    }
  }, [firebaseInstances]);

  if (!firebaseInstances) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background">
            <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-semibold">Inicializando...</p>
                <p className="text-sm text-muted-foreground">Conectando aos serviços.</p>
            </div>
        </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseInstances.app}
      auth={firebaseInstances.auth}
      firestore={firebaseInstances.firestore}
    >
      <FirestoreReadProvider>
        {children}
        <FirebaseErrorListener />
      </FirestoreReadProvider>
    </FirebaseProvider>
  );
}
