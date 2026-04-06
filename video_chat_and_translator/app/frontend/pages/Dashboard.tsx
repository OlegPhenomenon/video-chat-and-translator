import { Head, Link } from '@inertiajs/react'

export default function Dashboard() {
  return (
    <>
      <Head title="Dashboard" />
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Видеотека</h2>
            <p className="text-sm text-gray-500 mb-4">Загружайте и просматривайте видео прямо в браузере.</p>
            <Link
              href="/videos"
              className="inline-block px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Загрузить видео
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
