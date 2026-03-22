'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import '@/app/globals.css';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent,
  SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarInset, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, Users, Calendar, Archive, Settings, Filter,
  LogOut, Loader2, FileText, MessageSquare, BrainCircuit,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Painel', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  { href: '/leads', icon: Filter, label: 'Funil de Vendas', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  { href: '/clients', icon: Users, label: 'Clientes', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { href: '/schedule', icon: Calendar, label: 'Agenda', color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  { href: '/quotes', icon: FileText, label: 'Orçamentos', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { href: '/services', icon: Archive, label: 'Serviços', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { href: '/inventory', icon: Archive, label: 'Estoque', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  { href: '/conversations', icon: MessageSquare, label: 'Conversas', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  { href: '/whatsapp', icon: MessageSquare, label: 'Novos Contatos', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { href: '/ai-training', icon: BrainCircuit, label: 'Treinamento IA', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { href: '/settings', icon: Settings, label: 'Configurações', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
];

function AuthLayer({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') router.push('/login');
    if (user && pathname === '/login') router.push('/');
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!user && pathname === '/login') return <>{children}</>;
  if (user && pathname !== '/login') return <>{children}</>;
  return null;
}

function NavMenu() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
              <SidebarMenuButton isActive={isActive} className="w-full">
                <Icon className={cn('size-5', isActive ? 'text-primary' : item.color)} />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function MainAppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const supabase = createClient();
  const [logoUrl, setLogoUrl] = React.useState('https://placehold.co/32x32/B8E7C9/156A55?text=M');

  React.useEffect(() => {
    supabase.from('settings').select('logo_url').eq('id', 'general').single()
      .then(({ data }) => { if (data?.logo_url) setLogoUrl(data.logo_url); });
  }, []);

  const pageTitle = React.useMemo(() => {
    const item = navItems.find(i => pathname.startsWith(i.href) && (i.href !== '/' || pathname === '/'));
    return item?.label || '';
  }, [pathname]);

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Image src={logoUrl} alt="Logo" width={32} height={32} className="rounded-md" />
            <h1 className="text-xl font-semibold">MEDBIO</h1>
          </div>
        </SidebarHeader>
        <SidebarContent><NavMenu /></SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ''} />
                  <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-left overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b px-4 shrink-0">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AuthLayer>
            {pathname === '/login' ? children : <MainAppLayout>{children}</MainAppLayout>}
          </AuthLayer>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
