
'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { N8nLogViewer } from '@/components/settings/N8nLogViewer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FirestoreReadMonitor } from '@/components/settings/FirestoreReadMonitor';


const settingsSchema = z.object({
    logoUrl: z.string().url().optional().or(z.literal('')),
    n8nTrainingWebhookUrl: z.string().url("URL inválida.").optional().or(z.literal('')),
});

function GeneralSettingsForm() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const settingsRef = useMemo(() => {
        if (!firestore) return null;
    }, [firestore]);


    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            logoUrl: '',
            n8nTrainingWebhookUrl: '',
        }
    });

    useEffect(() => {
        if (settings) {
            form.reset({
                logoUrl: settings.logoUrl || '',
                n8nTrainingWebhookUrl: settings.n8nTrainingWebhookUrl || '',
            });
        }
    }, [settings, form]);
    
    const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
        if (!settingsRef) return;
        setIsSubmitting(true);
        setDoc(settingsRef, values, { merge: true })
            .then(() => {
                toast({ title: 'Sucesso', description: 'Configurações salvas.' });
            })
            .catch((err) => {
                    path: settingsRef.path,
                    operation: 'update',
                    requestResourceData: values,
                });
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL do Logotipo</FormLabel>
                            <FormControl>
                                <Input placeholder="https://exemplo.com/logo.png" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="n8nTrainingWebhookUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL do Webhook de Treinamento (n8n)</FormLabel>
                            <FormControl>
                                <Input placeholder="Cole a URL do seu webhook do n8n aqui" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {isSubmitting ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

function N8nLogManager() {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);
    
    const logsQuery = useMemo(() => {
        if (!firestore) return null;
        // Limitamos a 500 para não estourar o limite de batch do Firestore
    }, [firestore?.app.name]);

    
    const handleClearLogs = async () => {
        if (!firestore || !logs || logs.length === 0) return;
        setIsDeleting(true);
        setAlertOpen(false);

        const batch = writeBatch(firestore);
        logs.forEach(log => {
            const docRef = doc(firestore, 'n8n_logs', log.id);
            batch.delete(docRef);
        });

        try {
            await batch.commit();
            toast({
                title: 'Sucesso!',
                description: 'Os logs de diagnóstico foram limpos. Suas conversas permanecem intactas.',
            });
        } catch (error) {
            console.error("Failed to clear n8n logs:", error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível limpar os logs. Verifique suas permissões.',
            });
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Logs de Diagnóstico (n8n)</CardTitle>
                        <CardDescription>Dados brutos recebidos para depuração. A limpeza destes logs NÃO afeta suas conversas.</CardDescription>
                    </div>
                    <Button variant="destructive" onClick={() => setAlertOpen(true)} disabled={isDeleting || !logs || logs.length === 0}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4"/>}
                        Limpar Logs
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <N8nLogViewer />
            </CardContent>
             <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Limpar histórico de logs?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação removerá apenas os registros brutos de diagnóstico. Suas conversas e mensagens salvas <strong>não serão excluídas</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearLogs}>Sim, limpar diagnóstico</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações e integrações da sua clínica."
      />
      <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Configurações Gerais e Integrações</CardTitle>
                <CardDescription>
                    Configure informações essenciais da clínica, como o logotipo e status de integrações.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <GeneralSettingsForm />
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento do Sistema</CardTitle>
            <CardDescription>
              Gerencie usuários, etapas do funil de vendas e outras configurações centrais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/settings/system-users">
              <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-semibold">Usuários do Sistema</p>
                    <p className="text-sm text-muted-foreground">
                      Adicione ou remova usuários que podem acessar o CRM.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/settings/sales-funnel">
              <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-semibold">Funil de Vendas</p>
                    <p className="text-sm text-muted-foreground">
                      Personalize as etapas do seu funil de vendas.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Monitor de Requisições do Firestore</CardTitle>
                <CardDescription>
                    Acompanhe o número de leituras do banco de dados para depuração de performance.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <FirestoreReadMonitor />
            </CardContent>
        </Card>

        <N8nLogManager />
        
        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
                Gerencie como você recebe notificações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="email-notifications" className="font-semibold">
                  Notificações por E-mail
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações por e-mail para novas consultas e mensagens de clientes.
                </p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
