import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, PlusCircle } from 'lucide-react';

export default function InventoryPage() {
  return (
    <>
      <PageHeader title="Estoque" description="Acompanhe os níveis de estoque dos produtos.">
        <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4"/>
            Adicionar Produto
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>Gerenciamento de Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
              <Info className="w-8 h-8 mb-2" />
              <p>O gerenciamento de estoque ainda não foi implementado.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
