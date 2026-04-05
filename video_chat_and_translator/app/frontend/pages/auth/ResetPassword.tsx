import { Head, useForm, usePage } from '@inertiajs/react'
import AuthLayout from './AuthLayout'

interface ResetPasswordTranslations {
  title: string
  password_label: string
  password_confirmation_label: string
  submit: string
  token_invalid: string
  request_again_hint: string
}

interface ResetPasswordProps {
  translations: ResetPasswordTranslations
  token_state: 'valid' | 'invalid'
  reset_password_token?: string
  forgot_password_url?: string
  errors?: Record<string, string[]>
}

interface SharedProps {
  flash?: {
    notice?: string
    alert?: string
  }
  [key: string]: unknown
}

export default function ResetPassword({ translations, token_state, reset_password_token, forgot_password_url, errors = {} }: ResetPasswordProps) {
  const { flash } = usePage<SharedProps>().props

  const { data, setData, patch, processing } = useForm({
    user: {
      password: '',
      password_confirmation: '',
      reset_password_token: reset_password_token ?? '',
    }
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    patch('/users/password')
  }

  function fieldClass(field: string) {
    return `w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      errors[field] ? 'border-red-500' : 'border-gray-300'
    }`
  }

  return (
    <AuthLayout>
      <Head title={translations.title} />

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{translations.title}</h1>

      {flash?.notice && (
        <div className="mb-4 px-4 py-3 rounded-md bg-green-500 text-white text-sm">
          {flash.notice}
        </div>
      )}

      {flash?.alert && (
        <div className="mb-4 px-4 py-3 rounded-md bg-red-500 text-white text-sm">
          {flash.alert}
        </div>
      )}

      {token_state === 'invalid' ? (
        <div className="space-y-4">
          <p className="text-sm text-red-600">{translations.token_invalid}</p>
          <div className="text-center">
            <a href={forgot_password_url} className="text-indigo-600 hover:underline text-sm">
              {translations.request_again_hint}
            </a>
          </div>
        </div>
      ) : (
        <>
          {processing ? (
            <div className="flex justify-center items-center py-12">
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {translations.password_label}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={data.user.password}
                  onChange={e => setData('user', { ...data.user, password: e.target.value })}
                  className={fieldClass('password')}
                  required
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1">
                  {translations.password_confirmation_label}
                </label>
                <input
                  id="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={data.user.password_confirmation}
                  onChange={e => setData('user', { ...data.user, password_confirmation: e.target.value })}
                  className={fieldClass('password_confirmation')}
                  required
                />
                {errors.password_confirmation && (
                  <p className="mt-1 text-xs text-red-600">{errors.password_confirmation[0]}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {translations.submit}
              </button>
            </form>
          )}
        </>
      )}
    </AuthLayout>
  )
}
