'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Download, Send } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/lib/supabase/types';

export default function ClientsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('display_name');
    if (data) setClients(data);
    if (error) console.error(error);
    setLoading(false);
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { setSelectedClients([]); }, [searchTerm]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    const digits = term.replace(/\D/g, '');
    return clients.filter(c => {
      if (c.display_name.toLowerCase().startsWith(term)) return true;
      if (c.email?.toLowerCase().startsWith(term)) return true;
      if (digits && c.phone?.replace(/\D/g, '').includes(digits)) return true;
      return false;
    });
  }, [clients, searchTerm]);

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    try { return format(new Date(date), 'dd/MM/yyyy'); } catch { return 'N/A'; }
  };

  const exportToCSV = () => {
    const toExport = selectedClients.length > 0
      ? clients.filter(c => selectedClients.includes(c.id))
      : filteredClients;
    if (!toExport.length) {
      toast({ title: 'Nenhum cliente para exportar' });
      return;
    }
    const csv = [
      ['Nome', 'Email', 'Telefone', 'Data de Inscrição'].join(','),
      ...toExport.map(c => [
        `"${c.display_name}"`, `"${c.email || ''}"`,
        `"${c.phone || ''}"`, `"${formatDate(c.join_date)}"`
      ].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'Exportação iniciada', description: `${toExport.length} cliente(s).` });
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    const { error } = await supabase.from('clients').delete().eq('id', clientToDelete.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir o cliente.' });
    } else {
      toast({ title: 'Sucesso', description: `Cliente "${clientToDelete.display_name}" excluído.` });
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
    }
    setClientToDelete(null);
  };

  return (
    <>
      <PageHeader title={<span className="text-primary">Clientes</span>} description="Gerencie os perfis dos seus clientes.">
        <Button variant="outline" onClick={exportToCSV} disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          Exportar {selectedClients.length > 0 ? `${selectedClients.length} Selecionado(s)` : 'Tudo'}
        </Button>
        <Button asChild><Link href="/clients/new">Adicionar Novo Cliente</Link></Button>
      </PageHeader>

      {selectedClients.length > 0 && (
        <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
          <p className="text-sm font-medium">{selectedClients.length} de {filteredClients.length} selecionado(s)</p>
          <Button variant="outline" size="sm">
            <Send className="mr-2 h-4 w-4" />Enviar para n8n
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="py-4">
            <Input placeholder="Buscar por nome, e-mail ou telefone..." className="max-w-sm"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={filteredClients.length > 0 && selectedClients.length === filteredClients.length}
                    onCheckedChange={checked => setSelectedClients(checked ? filteredClients.map(c => c.id) : [])}
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Data de Inscrição</TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredClients.map(client => (
                <TableRow key={client.id} data-state={selectedClients.includes(client.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox checked={selectedClients.includes(client.id)}
                      onCheckedChange={checked => setSelectedClients(prev => checked ? [...prev, client.id] : prev.filter(id => id !== client.id))} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Image src={client.photo_url || `https://picsum.photos/seed/${client.id}/100/100`}
                        alt={client.display_name} width={40} height={40} className="rounded-full object-cover" />
                      <Link href={`/clients/${client.id}`} className="font-medium hover:underline">{client.display_name}</Link>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                  <TableCell>{client.phone || 'Não informado'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDate(client.join_date)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem asChild><Link href={`/clients/${client.id}`}>Ver Detalhes</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/clients/${client.id}/edit`}>Editar</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setClientToDelete(client)} className="text-destructive">Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {searchTerm ? `Nenhum cliente encontrado para "${searchTerm}".` : 'Nenhum cliente cadastrado.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!clientToDelete} onOpenChange={open => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente <strong>{clientToDelete?.display_name}</strong> será excluído permanentemente.
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
