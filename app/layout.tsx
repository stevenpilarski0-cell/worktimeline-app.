import type { Metadata } from 'next';
import '../style.css';

export const metadata: Metadata = {
  title: 'WorkTimeline Pattera Workspace',
  description: 'Secure, chronological evidence management and intake platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
