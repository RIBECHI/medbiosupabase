'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { initializeApp, FirebaseError, deleteApp } from 'firebase/app';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  displayName: z
    .string()
    .min(2, 'O nome de exibição deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type NewUserFormData = z.infer<typeof formSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const mainApp = useFirebaseApp(); // Renomeado para clareza
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<NewUserFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: NewUserFormData) {
    if (!firestore || !mainApp) return;
    setIsSubmitting(true);

    const secondaryAppName = `secondary-auth-${Date.now()}`;
    const secondaryApp = initializeApp(mainApp.options, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1. Criar o usuário na Autenticação Firebase com a instância secundária
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // 2. Atualizar o perfil do novo usuário (nome de exibição e foto)
      const photoURL = `https://picsum.photos/seed/${user.uid}/100/100`;
      await updateProfile(user, {
        displayName: values.displayName,
        photoURL: photoURL,
      });

      // 3. Criar o documento do usuário no Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userData = {
        displayName: values.displayName,
        email: values.email,
        photoURL: photoURL,
      };

      await setDoc(userDocRef, userData);

      toast({
        title: 'Sucesso!',
        description: `Usuário "${values.displayName}" criado com sucesso.`,
      });
      router.push('/settings/system-users');

    } catch (error: any) {
      console.error('Erro ao criar novo usuário:', error);
      
      let description = 'Não foi possível criar o usuário.';
      if (error instanceof FirebaseError) {
         switch (error.code) {
             case 'auth/email-already-in-use':
                 description = 'Este e-mail já está em uso por outra conta.';
                 break;
             case 'auth/invalid-email':
                 description = 'O e-mail fornecido não é válido.';
                 break;
             case 'auth/weak-password':
                description = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                break;
             default:
                description = error.message;
         }
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: description,
      });
    } finally {
      // Limpa a instância secundária do Firebase para evitar vazamentos de memória
      await deleteApp(secondaryApp);
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Adicionar Novo Usuário"
        description="Crie uma nova conta para um membro da equipe acessar o CRM."
        showBackButton
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Detalhes do Usuário</CardTitle>
          <CardDescription>
            A senha será usada para o primeiro login. O usuário poderá alterá-la
            posteriormente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Exibição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail de Login</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Ex: joao.silva@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Provisória</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
