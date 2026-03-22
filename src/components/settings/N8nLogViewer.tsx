'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';


export function N8nLogViewer() {

    const logsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'n8n_logs'), 
            orderBy('receivedAt', 'desc'),
            limit(50)
    }, [firestore]);


    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        if (date instanceof Timestamp) {
            return format(date.toDate(), 'yyyy-MM-dd HH:mm:ss');
        }
        return String(date);
    }
    
    return (
        <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Recebido em</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Payload</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            </TableRow>
                        ))
                    ) : (
                        logs?.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="font-medium whitespace-nowrap">{formatDate(log.receivedAt)}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {log.data?.senderPhone || log.data?.clientPhone || '-'}
                                </TableCell>
                                <TableCell>
                                    <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-all">
                                        {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                    {!loading && logs?.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                Nenhum log encontrado
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
