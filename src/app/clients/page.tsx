'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Download, Send } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useFirestore, useCollection } from '@/firebase';
import { Timestamp, doc, deleteDoc, collection, query, orderBy, type Query } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { clientConverter, type Client } from '@/lib/types';


export default function ClientsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);

    const clientsQuery = useMemo<Query<Client> | null>(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'clients'), orderBy('displayName')).withConverter(clientConverter);
    }, [firestore]);

    const { data: clients, loading, setData: setClients } = useCollection<Client>(clientsQuery, {snapshot: false});
    
    const filteredClients = useMemo(() => {
        if (!clients) {
            return [];
        }
        
        const lowercasedTerm = searchTerm.toLowerCase();

        if (!lowercasedTerm) {
            return clients;
        }

        const searchTermDigits = lowercasedTerm.replace(/\D/g, '');

        return clients.filter(client => {
            // Check name (always present)
            if (client.displayName.toLowerCase().startsWith(lowercasedTerm)) {
                return true;
            }

            // Check email
            if (client.email && client.email.toLowerCase().startsWith(lowercasedTerm)) {
                return true;
            }

            // Check phone, but only if the search term contains numbers
            if (searchTermDigits.length > 0 && client.phone) {
                const clientPhoneDigits = client.phone.replace(/\D/g, '');
                if (clientPhoneDigits.includes(searchTermDigits)) {
                    return true;
                }
            }

            return false;
        });
    }, [clients, searchTerm]);

    // Limpa a seleção quando o filtro muda
    useEffect(() => {
        setSelectedClients([]);
    }, [searchTerm]);


    const formatDate = (date: any) => {
        if (!date) return 'N/A';

        let dateObj: Date | null = null;
        if (date instanceof Timestamp) {
            dateObj = date.toDate();
        } else if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            dateObj = new Date(date);
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            return format(dateObj, 'dd/MM/yyyy');
        }
        
        return 'N/A';
    }

    const exportToCSV = () => {
        const clientsToExport = selectedClients.length > 0
            ? clients?.filter(c => selectedClients.includes(c.id))
            : filteredClients;

        if (!clientsToExport || clientsToExport.length === 0) {
            toast({
                title: "Nenhum cliente para exportar",
                description: "Selecione clientes ou refine sua busca.",
            });
            return;
        }

        const headers = ['Nome', 'Email', 'Telefone', 'Data de Inscrição'];
        const csvContent = [
            headers.join(','),
            ...clientsToExport.map(client => [
                `"${client.displayName.replace(/"/g, '""')}"`,
                `"${(client.email || '').replace(/"/g, '""')}"`,
                `"${(client.phone || '').replace(/"/g, '""')}"`,
                `"${formatDate(client.joinDate)}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        link.href = URL.createObjectURL(blob);
        link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
            title: "Exportação iniciada",
            description: `${clientsToExport.length} cliente(s) sendo exportado(s).`,
        });
    }


    const handleDeleteClient = async () => {
        if (!clientToDelete || !clientToDelete.id || !firestore) return;
    
        const clientRef = doc(firestore, 'clients', clientToDelete.id);
        
        deleteDoc(clientRef)
            .then(() => {
                toast({
                    title: 'Sucesso',
                    description: `Cliente "${clientToDelete.displayName}" excluído.`,
                });
                setClients(prev => prev?.filter(c => c.id !== clientToDelete.id));
                setClientToDelete(null);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: clientRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                setClientToDelete(null);
            });
    };

    const handleSendToN8n = () => {
        if (selectedClients.length === 0) return;
        const selectedData = clients?.filter(client => selectedClients.includes(client.id));
        console.log("Dados para enviar ao n8n:", selectedData);
        toast({
            title: "Preparando para envio",
            description: `${selectedClients.length} cliente(s) pronto(s) para serem processados pelo n8n.`,
        });
        // Aqui você faria a chamada da API para o seu webhook do n8n
    };

    const numSelected = selectedClients.length;
    const numFiltered = filteredClients.length;


  return (
    <>
      <PageHeader title={<span className="text-primary">Clientes</span>} description="Gerencie os perfis dos seus clientes.">
        <Button variant="outline" onClick={exportToCSV} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Exportar {numSelected > 0 ? `${numSelected} Selecionado(s)` : 'Tudo'}
        </Button>
        <Button asChild>
          <Link href="/clients/new">Adicionar Novo Cliente</Link>
        </Button>
      </PageHeader>
      
       {numSelected > 0 && (
        <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between animate-fade-in">
            <p className="text-sm font-medium">{numSelected} de {numFiltered} cliente(s) selecionado(s)</p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSendToN8n}>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para n8n
                </Button>
                {/* Outros botões de ação em massa podem ser adicionados aqui */}
            </div>
        </div>
      )}


      <Card>
        <CardContent className="pt-6">
           <div className="py-4">
            <Input 
                placeholder="Buscar clientes por nome, e-mail ou telefone..." 
                className="max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                    <Checkbox
                        checked={numFiltered > 0 && numSelected === numFiltered}
                        onCheckedChange={(checked) => {
                            setSelectedClients(checked ? filteredClients.map(c => c.id) : [])
                        }}
                        aria-label="Selecionar todos"
                    />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Data de Inscrição</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                 ))
              ) : (
                filteredClients?.map((client) => (
                    <TableRow key={client.id} data-state={selectedClients.includes(client.id) && 'selected'}>
                    <TableCell>
                        <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={(checked) => {
                               setSelectedClients(prev => checked ? [...prev, client.id] : prev.filter(id => id !== client.id))
                            }}
                            aria-label="Selecionar cliente"
                        />
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Image
                            src={client.photoURL}
                            alt={client.displayName}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                        />
                        <div className="font-medium">
                            <Link href={`/clients/${client.id}`} className="hover:underline">
                                {client.displayName}
                            </Link>
                        </div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {client.email}
                    </TableCell>
                    <TableCell>
                        {client.phone || 'Não informado'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                        {formatDate(client.joinDate)}
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <Link href={`/clients/${client.id}`}>Ver Detalhes</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/clients/${client.id}/edit`}>Editar</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setClientToDelete(client)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
              )}
               {!loading && filteredClients?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {searchTerm ? 'Nenhum cliente encontrado para "' + searchTerm + '".' : 'Nenhum cliente cadastrado.'}
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!clientToDelete} onOpenChange={(isOpen) => !isOpen && setClientToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente <span className="font-bold">{clientToDelete?.displayName}</span> e removerá seus dados de nossos servidores.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteClient}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
