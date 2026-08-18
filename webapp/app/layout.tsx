import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Este Dia Com Deus - Painel de Controle',
  description: 'Gestão de automação devocional do WhatsApp, IA e disparos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased min-h-screen bg-[#0b0f19] text-slate-100 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
