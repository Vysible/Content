import QRCode from 'qrcode'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Partner-QR-Code – Abnehm-Institut',
}

export default async function PartnerQrPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const formUrl = `${appUrl}/partner`

  const dataUrl = await QRCode.toDataURL(formUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#7A2D42', light: '#F6F1E9' },
    errorCorrectionLevel: 'M',
  })

  return (
    <main className="min-h-screen bg-creme flex flex-col items-center justify-center px-4 gap-8">
      <div className="bg-white rounded-2xl shadow-lg border border-stone p-10 flex flex-col items-center gap-6 max-w-sm w-full">
        <h1 className="text-xl font-bold text-bordeaux">Partner werden</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="QR-Code zum Partner-Formular" width={280} height={280} className="rounded-lg" />
        <p className="text-xs text-stahlgrau text-center break-all">{formUrl}</p>
        <a
          href={dataUrl}
          download="partner-qr.png"
          className="text-xs font-semibold text-bordeaux hover:underline"
        >
          PNG herunterladen
        </a>
      </div>
    </main>
  )
}
