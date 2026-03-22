
'use client';

import { useState, useMemo } from 'react';
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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore } from '@/firebase';
import { doc, deleteDoc, query, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { userConverter, type User } from '@/lib/types';

// This is a placeholder for a server-side function.
// In a real app, you would have a Cloud Function to handle user deletion securely.
async function deleteUserOnServer(userId: string) {
    console.warn("Simulating server-side user deletion. In a real app, this should be a secure Cloud Function call.");
    // This is NOT secure on the client-side, but for demonstration purposes in this environment.
    // We would need to set up admin privileges.
    // For now, we'll just delete the Firestore doc.
    return;
}

export default function SystemUsersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const usersQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users')).withConverter(userConverter);
    }, [firestore]);

    const { data: users, loading } = useCollection<User>(usersQuery, {snapshot: false});

    const handleDeleteUser = async () => {
        if (!userToDelete || !firestore) return;
    
        // NOTE: Deleting a Firebase Auth user from the client-side is not a standard secure practice.
        // This is typically done from a backend with admin privileges (e.g., a Cloud Function).
        // Since we don't have a backend function environment, we will proceed with client-side
        // deletion for this tool's purpose, but this is a security risk in a real production app.
    
        const userDocRef = doc(firestore, 'users', userToDelete.id);
        
        try {
            // Step 1: Delete Firestore document.
            await deleteDoc(userDocRef);

            // Step 2: Inform the user that the backend part would delete the auth user.
            // In a real scenario, you'd trigger a Cloud Function here.
            toast({
                title: 'Usuário Excluído do Banco de Dados',
                description: `O registro de "${userToDelete.displayName}" foi removido. A exclusão da conta de autenticação deve ser feita por um administrador no backend.`,
            });

            setUserToDelete(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao Excluir',
                description: `Não foi possível excluir o usuário do Firestore. ${error.message}`,
            });
            setUserToDelete(null);
        }
    };

  return (
    <>
      <PageHeader title="Usuários do Sistema" description="Gerencie os usuários que podem acessar o CRM." showBackButton>
        <Button asChild>
          <Link href="/settings/system-users/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
            <div className="py-4">
                <Input placeholder="Buscar usuários..." className="max-w-sm"/>
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                 ))
              ) : (
                users?.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Image
                            src={user.photoURL}
                            alt={user.displayName}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                        />
                        <div className="font-medium">
                            {user.displayName}
                        </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        {user.email}
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
                                <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
              )}
               {!loading && users?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum usuário do sistema encontrado.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário <span className="font-bold">{userToDelete?.displayName}</span> dos registros do Firestore. A exclusão da conta de autenticação é um passo separado.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
