import QRCode from 'qrcode'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Partner-QR-Code – Abnehm-Institut',
}

export default async function PartnerQrPage() {
  const formUrl = 'https://abnehm-institut.com/partner'

  const svg = await QRCode.toString(formUrl, {
    type: 'svg',
    margin: 2,
    color: { dark: '#7A2D42', light: '#F6F1E9' },
    errorCorrectionLevel: 'M',
    width: 300,
  })

  return (
    <main className="min-h-screen bg-creme flex flex-col items-center justify-center px-4 gap-8">
      <div className="bg-white rounded-2xl shadow-lg border border-stone p-10 flex flex-col items-center gap-6 max-w-sm w-full">
        <h1 className="text-xl font-bold text-bordeaux">Partner werden</h1>
        <div
          className="rounded-lg overflow-hidden"
          style={{ width: 260, height: 260 }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-xs text-stahlgrau text-center break-all">{formUrl}</p>
        <p className="text-xs text-stahlgrau text-center">
          QR-Code scannen → Formular öffnet sich
        </p>
      </div>
    </main>
  )
}
