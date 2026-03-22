
'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  DocumentReference,
  FirestoreError,
} from 'firebase/firestore';

interface UseDocOptions<T> {
  onError?: (error: FirestoreError) => void;
  initialValue?: T;
}

export function useDoc<T>(
  ref: DocumentReference<T> | null,
  options?: UseDocOptions<T>
) {
  const [data, setData] = useState<T | undefined>(options?.initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      setData(undefined);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : undefined);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
        options?.onError?.(err);
      }
    );

    return unsubscribe;
  }, [ref]);

  return { data, loading, error };
}

    