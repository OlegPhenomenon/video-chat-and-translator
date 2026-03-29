import { Head } from '@inertiajs/react'

interface LandingProps {
  app_name: string
}

export default function Landing({ app_name }: LandingProps) {
  return (
    <>
      <Head title={app_name} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-2xl px-6">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            {app_name}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered educational platform with real-time video translation
            and dubbing — all running locally in your browser.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800">
              Rails 8
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              React + Inertia.js
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-sky-100 text-sky-800">
              TypeScript
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-cyan-100 text-cyan-800">
              Tailwind CSS
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
