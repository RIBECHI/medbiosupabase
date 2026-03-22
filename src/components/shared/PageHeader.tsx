
'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  showBackButton?: boolean;
};

export function PageHeader({ title, description, children, showBackButton = false }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        {showBackButton && (
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar</span>
            </Button>
        )}
        <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl font-headline text-accent-foreground">
            {title}
            </h1>
            {description && (
            <p className="mt-1 text-muted-foreground">{description}</p>
            )}
        </div>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
