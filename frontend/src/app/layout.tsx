import type { Metadata } from 'next';
import { ClientLayout } from './client-layout';

// Import wallet adapter styles (ZKescrow pattern)
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css';
import './globals.css';

// Next.js Metadata API (proper SSR metadata handling)
export const metadata: Metadata = {
  title: 'Duskfall - Privacy-Preserving Inheritance on Aleo',
  description: 'Secure your digital legacy with zero-knowledge proofs on Aleo blockchain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
