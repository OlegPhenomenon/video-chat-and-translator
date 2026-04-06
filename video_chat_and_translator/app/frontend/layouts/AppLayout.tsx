import { useState } from 'react'
import Header from '../components/Header'
import Toast from '../components/Toast'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [logoutError, setLogoutError] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onLogoutError={setLogoutError} />
      <Toast error={logoutError} />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
