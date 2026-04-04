import { Head, useForm, usePage } from '@inertiajs/react'
import AuthLayout from './AuthLayout'

interface ForgotPasswordTranslations {
  title: string
  email_label: string
  submit: string
  request_accepted: string
  back_to_login: string
}

interface ForgotPasswordProps {
  translations: ForgotPasswordTranslations
  login_url: string
  errors?: Record<string, string[]>
}

interface SharedProps {
  flash?: {
    notice?: string
    alert?: string
  }
  [key: string]: unknown
}

export default function ForgotPassword({ translations, login_url, errors = {} }: ForgotPasswordProps) {
  const { flash } = usePage<SharedProps>().props

  const { data, setData, post, processing } = useForm({
    user: {
      email: '',
    }
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post('/users/password')
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {translations.email_label}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={data.user.email}
              onChange={e => setData('user', { ...data.user, email: e.target.value })}
              className={fieldClass('email')}
              required
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {translations.submit}
          </button>

          <div className="text-center text-sm text-gray-500">
            <a href={login_url} className="text-indigo-600 hover:underline">
              {translations.back_to_login}
            </a>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
