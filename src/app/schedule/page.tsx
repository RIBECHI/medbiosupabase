

'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentList } from '@/components/schedule/AppointmentList';
import { AddAppointmentForm } from '@/components/schedule/AddAppointmentForm';

export default function SchedulePage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isSheetOpen, setSheetOpen] = useState(false);
    
    return (
        <>
            <PageHeader title="Agenda de Consultas" description="Gerencie e agende consultas de clientes.">
                <Button onClick={() => setSheetOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Consulta
                </Button>
            </PageHeader>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <CardContent className="p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="w-full"
                                locale={ptBR}
                                classNames={{
                                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-4",
                                    caption_label: "text-lg font-medium",
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {date ? `Consultas para ${format(date, 'PPP', { locale: ptBR })}` : 'Selecione uma data'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <AppointmentList selectedDate={date} />
                        </CardContent>
                    </Card>
                </div>
            </div>
            <AddAppointmentForm
                isOpen={isSheetOpen}
                onOpenChange={setSheetOpen}
                selectedDate={date}
            />
        </>
    );
}
