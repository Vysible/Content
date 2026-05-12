import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-center">
        <p className="text-4xl font-bold text-nachtblau mb-2">404</p>
        <p className="text-stahlgrau mb-6">Diese Seite wurde nicht gefunden.</p>
        <Link href="/" className="px-4 py-2 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau">
          Zum Dashboard
        </Link>
      </div>
    </div>
  )
}
