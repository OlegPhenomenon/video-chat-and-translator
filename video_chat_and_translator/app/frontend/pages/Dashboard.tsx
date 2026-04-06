import { Head } from '@inertiajs/react'

export default function Dashboard() {
  return (
    <>
      <Head title="Dashboard" />
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>
        </div>
      </div>
    </>
  )
}
