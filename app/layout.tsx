import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vysible – KI-Content-Automationsplattform',
  description: 'Content-Marketing-Pakete für Arzt- und Zahnarztpraxen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="font-body antialiased bg-creme text-anthrazit">
        {children}
      </body>
    </html>
  )
}
