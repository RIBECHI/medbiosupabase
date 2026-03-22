'use client';

import { useState, useMemo } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddServiceForm } from '@/components/services/AddServiceForm';

export default function ServicesPage() {
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  const servicesQuery = useMemo<Query<Service> | null>(() => {
    if (!firestore) return null;
  }, [firestore]);


  const handleEdit = (service: Service) => {
    setServiceToEdit(service);
    setSheetOpen(true);
  };
  
  const handleAdd = () => {
    setServiceToEdit(null);
    setSheetOpen(true);
  }

  const handleDelete = (service: Service) => {
    if (!firestore || !service.id) return;
    const serviceRef = doc(firestore, 'services', service.id);
    deleteDoc(serviceRef)
      .then(() => {
        toast({
          title: 'Sucesso',
          description: `Serviço "${service.name}" excluído.`,
        });
      })
      .catch((serverError) => {
          path: serviceRef.path,
          operation: 'delete',
        });
      });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <>
      <PageHeader
        title="Serviços da Clínica"
        description="Gerencie os serviços oferecidos aos seus clientes."
      >
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Serviço
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          <div className="py-4">
            <Input placeholder="Buscar serviços..." className="max-w-sm" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Serviço</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Duração (min)</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                services?.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>{service.duration}</TableCell>
                    <TableCell>{formatCurrency(service.price)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu de ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(service)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(service)}
                            className="text-destructive focus:text-destructive"
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loading && services?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum serviço encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddServiceForm
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        serviceToEdit={serviceToEdit}
      />
    </>
  );
}
