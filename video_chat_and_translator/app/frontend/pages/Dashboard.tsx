import { Head, Link, router } from '@inertiajs/react'

export default function Dashboard() {

  function handleSignOut() {
    router.delete('/users/sign_out')
  }

  return (
    <>
      <Head title="Dashboard" />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>

          <nav className="flex gap-4">
            <Link
              href="/users/profile"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors"
            >
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-md transition-colors"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </main>
    </>
  )
}
