import { Link, router, usePage } from '@inertiajs/react'
import { useState } from 'react'

interface SharedProps {
  current_user?: { id: number; email: string }
  [key: string]: unknown
}

interface HeaderProps {
  onLogoutError?: (message: string) => void
}

export default function Header({ onLogoutError }: HeaderProps) {
  const page = usePage<SharedProps>()
  const { current_user } = page.props
  const currentPath = page.url
  const [loggingOut, setLoggingOut] = useState(false)

  function handleLogout() {
    setLoggingOut(true)
    router.delete('/users/sign_out', {
      onSuccess: () => {
        setLoggingOut(false)
      },
      onError: () => {
        setLoggingOut(false)
        onLogoutError?.('Ошибка выхода из системы. Попробуйте ещё раз.')
      },
      onFinish: () => {
        setLoggingOut(false)
      },
    })
  }

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors hover:text-indigo-600 ${
      currentPath === path ? 'text-indigo-600 font-semibold' : 'text-gray-600'
    }`

  return (
    <header
      data-testid="header"
      className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6"
    >
      <nav className="w-full flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/" className="text-base font-bold text-gray-900 hover:text-indigo-600 transition-colors">
            VideoChat
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {current_user ? (
            <>
              <Link
                href="/"
                data-testid="menu-home-auth"
                className={linkClass('/')}
              >
                Главная
              </Link>
              <Link
                href="/dashboard"
                data-testid="menu-dashboard"
                className={linkClass('/dashboard')}
              >
                Дашборд
              </Link>
              <Link
                href="/users/profile"
                data-testid="menu-profile"
                className={linkClass('/users/profile')}
              >
                Профиль
              </Link>
              <button
                data-testid="menu-logout"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors disabled:opacity-50"
              >
                {loggingOut ? 'Выход...' : 'Выйти'}
              </button>
            </>
          ) : (
            <>
              {currentPath !== '/' && (
                <Link
                  href="/"
                  data-testid="menu-home"
                  className={linkClass('/')}
                >
                  Главная
                </Link>
              )}
              <Link
                href="/users/sign_up"
                data-testid="menu-signup"
                className={linkClass('/users/sign_up')}
              >
                Зарегистрироваться
              </Link>
              <Link
                href="/users/sign_in"
                data-testid="menu-signin"
                className={linkClass('/users/sign_in')}
              >
                Авторизоваться
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
