import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vibecraft Music | Premium Player',
  description: 'A premium, high-fidelity music experience powered by YouTube.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}