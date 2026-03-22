
'use client';

// Este layout agora é um componente pass-through simples, sem lógica.
// A lógica de autenticação e layout é tratada pelo RootLayout e AuthLayer.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
