
'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  getDocs,
  queryEqual,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useIncrementFirestoreReads, useFirestoreReadCount } from '@/hooks/use-firestore-read-monitor';

interface UseCollectionOptions<T> {
  initialValue?: T[];
  snapshot?: boolean;
}

export function useCollection<T>(
  query: Query<T> | null,
  options: UseCollectionOptions<T> = { snapshot: true }
) {
  const [data, setData] = useState<T[] | undefined>(options.initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const incrementReads = useIncrementFirestoreReads();
  const { limitReached } = useFirestoreReadCount();

  useEffect(() => {
    if (!query || limitReached) {
      setLoading(false);
      setData(undefined);
      return;
    }
    
    setLoading(true);

    if (options.snapshot === false) {
      getDocs(query)
        .then((snapshot: QuerySnapshot<T>) => {
          incrementReads();
          const items = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as T) 
          );
          setData(items);
          setLoading(false);
        })
        .catch((err) => {
            const path = (query as any)._query?.path?.segments?.join('/') || 'unknown path';
            const permissionError = new FirestorePermissionError({ path: path, operation: 'list' });
            errorEmitter.emit('permission-error', permissionError);
            setError(err);
            setLoading(false);
        });
        return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => { 
        incrementReads();
        const items = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as T) 
        );
        setData(items);
        setError(null);
        setLoading(false);
      },
      (err) => {
        const path = (query as any)._query?.path?.segments?.join('/') || 'unknown path';
        const permissionError = new FirestorePermissionError({ path, operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);

        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  // We use queryEqual to prevent re-renders when the query is structurally the same.
  // We stringify options because it's a simple object.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, options.snapshot, limitReached]);

  return { data, loading, error, setData };
}
