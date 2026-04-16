import React from 'react'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Register from '@/pages/auth/Register'

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
  useForm: () => ({
    data: {
      user: {
        email: '',
        password: '',
        password_confirmation: '',
      },
    },
    setData: vi.fn(),
    post: vi.fn(),
    processing: false,
  }),
}))

const translations = {
  title: 'Регистрация',
  email: 'Электронная почта',
  password: 'Пароль',
  password_confirmation: 'Подтверждение пароля',
  submit: 'Зарегистрироваться',
  have_account: 'Уже есть аккаунт?',
  login_link: 'Войти',
  success_heading: 'Регистрация прошла успешно',
  success_check_email: 'Для завершения регистрации проверьте вашу почту и подтвердите email по ссылке из письма.',
  success_login_link: 'Перейти на страницу входа',
}

afterEach(() => {
  cleanup()
})

describe('Register', () => {
  it('renders the success placeholder instead of the form', () => {
    render(<Register translations={translations} registration_success errors={{}} />)

    expect(screen.getByRole('heading', { name: translations.success_heading })).toBeInTheDocument()
    expect(screen.getByText(translations.success_check_email)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: translations.success_login_link })).toHaveAttribute('href', '/users/sign_in')
    expect(screen.queryByLabelText(translations.email)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: translations.submit })).not.toBeInTheDocument()
  })

  it('renders the registration form when success flag is false', () => {
    render(<Register translations={translations} registration_success={false} errors={{}} />)

    expect(screen.getByRole('heading', { name: translations.title })).toBeInTheDocument()
    expect(screen.getByLabelText(translations.email)).toBeInTheDocument()
    expect(screen.getByLabelText(translations.password)).toBeInTheDocument()
    expect(screen.getByLabelText(translations.password_confirmation)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: translations.submit })).toBeInTheDocument()
    expect(screen.queryByText(translations.success_check_email)).not.toBeInTheDocument()
  })
})
