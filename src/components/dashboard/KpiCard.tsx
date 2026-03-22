import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Kpi } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

export function KpiCard({
  label,
  value,
  change,
  changeType,
  description,
}: Kpi) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span
              className={cn(
                'flex items-center gap-1',
                changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {changeType === 'increase' ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {change}
            </span>
            {description}
          </p>
        )}
         {!change && description && (
           <p className="text-xs text-muted-foreground">{description}</p>
         )}
      </CardContent>
    </Card>
  );
}
