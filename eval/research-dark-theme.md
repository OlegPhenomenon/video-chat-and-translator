# Research: Добавить темную тему

## 1. Анализ текущего состояния

### Что уже есть в проекте

| Компонент | Статус | Ключевые файлы | Детали |
|---|---|---|---|
| **Frontend Stack** | DONE | `package.json` | React 19.2.4, Tailwind CSS 4.2.2, Inertia.js 3.0.0, TypeScript 6.0.2 |
| **Layout компоненты** | DONE | `app/frontend/layouts/AppLayout.tsx` | Главная layout с Header, Toast, main контентом |
| **Header компонент** | DONE | `app/frontend/components/Header.tsx` | Навигация, меню пользователя, кнопка выхода |
| **Inertia Props** | DONE | `app/controllers/application_controller.rb:8` | `current_user: -> { current_user&.as_json(...) }` |
| **User Model** | DONE | `app/models/user.rb` | Базовые поля: email, password, confirmation_token |
| **Database Schema** | DONE | `db/schema.rb` | Таблица users (17 полей) без поля для темы |
| **i18n** | DONE | `config/locales/` | Русская локализация настроена |
| **CSS Framework** | DONE | `vite.config.ts` | Tailwind CSS 4 с @tailwindcss/vite плагином |

### Чего нет в проекте

| Компонент | Причина отсутствия |
|---|---|
| **Колонка `theme` в таблице users** | Не добавлена при инициализации проекта |
| **React Context для управления темой** | Не реализована система состояния для темы |
| **ThemeProvider компонент** | Отсутствует обертка для предоставления темы всему приложению |
| **useTheme hook** | Нет хука для доступа к теме из компонентов |
| **Компонент переключателя темы** | Нет UI для выбора между light/dark/system |
| **localStorage интеграция** | Нет кэширования выбора темы на клиенте |
| **Rails контроллер для темы** | Нет endpoint'а для сохранения предпочтения пользователя |
| **Миграция БД** | Нет миграции для добавления колонки theme |
| **Tailwind dark: стили** | Текущие стили используют только light режим |

## 2. Анализ альтернатив

### Вариант A: localStorage + системная тема (без сохранения в БД)

**Описание:** Сохранять выбор темы только в localStorage браузера. Без изменения БД.

**Плюсы:**
- ✅ Минимум работы на бэке (только Inertia props)
- ✅ Нет миграций БД, не нужно обновлять существующих пользователей
- ✅ Работает offline, нет сетевых запросов при смене темы
- ✅ Быстрая реализация (~2-3 часа)

**Минусы:**
- ❌ Выбор темы НЕ синхронизируется между устройствами
- ❌ Если пользователь очистит localStorage - выбор потеряется
- ❌ Нет истории выбора, сложнее анализировать предпочтения пользователей

---

### Вариант B: БД (колонка в users) + localStorage кэш [РЕКОМЕНДУЕТСЯ]

**Описание:** Добавить колонку `theme` в таблицу users, сохранять выбор на сервере. localStorage используется как кэш для избежания FOUC (Flash of Unstyled Content).

**Плюсы:**
- ✅ Синхронизируется между всеми устройствами пользователя
- ✅ Профессиональный подход к настройкам пользователя
- ✅ Можно собирать статистику о предпочтениях
- ✅ Данные сохраняются навсегда (не теряются при очистке localStorage)
- ✅ Масштабируется: можно добавить другие темы в будущем (например, sepia, high-contrast)

**Минусы:**
- ⚠️ Требует миграция БД и обновление существующих пользователей
- ⚠️ Немного больше кода (~7-9 часов на всё)
- ⚠️ Потребуется обработка FOUC при SSR (Server-Side Rendering)

**Обоснование выбора:** Несмотря на больше кода и сложности, Вариант B дает лучший UX. Пользователь сможет выбрать тему на одном устройстве и она будет применена на всех других. Это особенно важно для образовательной платформы, где пользователи могут заходить с разных девайсов. Инвестиция в правильную архитектуру окупится удобством.

---

### Вариант C: Только системная тема (prefers-color-scheme)

**Описание:** Не давать пользователю выбор, автоматически использовать системную тему ОС (светлая/темная).

**Плюсы:**
- ✅ Очень просто реализовать (~1 час)
- ✅ Соответствует OS, привычно для пользователя
- ✅ Нет БД изменений

**Минусы:**
- ❌ Пользователь НЕ МОЖЕТ выбрать тему (очень ограничивает)
- ❌ Не решает проблему из Brief'а

**Исключен из рассмотрения:** Не решает задачу давать пользователю выбор.

---

## 3. Анализ узких мест и рисков

### Architekturnye constraints (из контекста проекта)

| Constraint | Влияние | Решение |
|---|---|---|
| **SSR с Inertia.js** | Нужно передать тему на клиент до рендера компонентов | Передать в shared props, установить класс на html в middleware |
| **Tailwind CSS 4** | Использует class-based dark mode | Установить класс `dark` на `<html>`, использовать `dark:` префиксы |
| **React 19 + TypeScript** | Нужны типизированные props | Создать интерфейсы ThemeContext, hooks, компонентов |
| **Vitest для тестов** | Нужны unit тесты компонентов | Писать тесты в согласии с project testing policy |

### Edge cases и потенциальные проблемы

| Проблема | Вероятность | Описание | Решение |
|---|---|---|---|
| **FOUC (Flash of Unstyled Content)** | Высокая | При SSR на сервер заранее не известна тема, на фронте она грузится из props — может быть мигание неправильной темы | Передать тему в Inertia props, установить класс на html ДО рендера React компонентов |
| **localStorage недоступна (private mode браузера)** | Средняя | В private mode Safari/Chrome localStorage не доступна или читается с задержкой | Обернуть в try-catch, использовать fallback на системную тему (prefers-color-scheme) |
| **Несинхронизация localStorage и БД** | Низкая | Пользователь обновил тему в одной табе, но в другой табе старое значение из localStorage | При загрузке страницы проверить что localStorage и БД совпадают |
| **Миграция существующих пользователей** | Низкая | 1000+ существующих пользователей — нужно установить дефолтное значение для них | Миграция с `default: 'system'` и `null: false` |
| **Отсутствие цветов в dark mode для всех компонентов** | Высокая | Не все стили будут иметь `dark:` версии, могут быть нечитаемые элементы | Тестировать dark режим при разработке, использовать WCAG contrast checker инструменты |
| **Совместимость Tailwind dark mode со встроенными стилями** | Низкая | Если в стилях есть inline colors, они не будут реагировать на dark mode | Использовать Tailwind классы, избегать inline styles |

## 4. Обоснованный дизайн решения

### 4.1 Архитектура

```
┌─────────────────────────────────────────────┐
│         Inertia Shared Props                │
│  ┌───────────────────────────────────────┐  │
│  │ current_user: {                       │  │
│  │   id, email, unconfirmed_email,       │  │
│  │   theme: 'light' | 'dark' | 'system' │  │ ← ДОБАВИТЬ
│  │ }                                     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ↓
        ┌─────────────────────┐
        │  React компоненты   │
        │  (AppLayout)        │
        └─────────────────────┘
                    ↓
        ┌─────────────────────┐
        │  ThemeProvider      │  ← Context обертка
        │  (устанавливает     │
        │   класс на html)    │
        └─────────────────────┘
                    ↓
        ┌─────────────────────┐
        │  Компоненты         │
        │  (Header, Toast и т.д)
        │  используют useTheme│  ← Hook для доступа
        └─────────────────────┘
```

### 4.2 Backend (Rails)

**1. Миграция БД**
```ruby
# db/migrate/[TIMESTAMP]_add_theme_to_users.rb
class AddThemeToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :theme, :string, default: 'system', null: false
  end
end
```

**2. User Model (обновить)**
```ruby
# app/models/user.rb
class User < ApplicationRecord
  devise :database_authenticatable, :registerable, :recoverable, :confirmable, :validatable
  
  # Добавить enum для типобезопасности
  enum theme: { light: 'light', dark: 'dark', system: 'system' }, _default: 'system'
  
  validates :theme, inclusion: { in: %w(light dark system) }
end
```

**3. Обновить ApplicationController (shared props)**
```ruby
# app/controllers/application_controller.rb
inertia_share current_user: -> { 
  current_user&.as_json(only: [ :id, :email, :unconfirmed_email, :theme ]) 
}
```

**4. Создать контроллер для обновления темы**
```ruby
# app/controllers/users/profile/themes_controller.rb
module Users
  module Profile
    class ThemesController < ApplicationController
      def update
        current_user.update!(theme: params[:theme])
        render json: { theme: current_user.theme }, status: :ok
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors }, status: :unprocessable_entity
      end
    end
  end
end
```

**5. Route'ы**
```ruby
# config/routes.rb
namespace :users do
  namespace :profile do
    resource :theme, only: [:update]  # PATCH/PUT /users/profile/theme
  end
end
```

### 4.3 Frontend (React + TypeScript)

**1. ThemeContext**
```typescript
// app/frontend/contexts/ThemeContext.tsx
import { createContext, useContext, ReactNode } from 'react'

type ThemeValue = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: ThemeValue
  setTheme: (theme: ThemeValue) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ 
  children, 
  initialTheme 
}: { 
  children: ReactNode
  initialTheme: ThemeValue 
}) => {
  const [theme, setThemeState] = useState<ThemeValue>(initialTheme)
  const isDark = resolveTheme(theme) === 'dark'

  const setTheme = async (newTheme: ThemeValue) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    // Сохранить на сервере
    try {
      await fetch('/users/profile/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      })
    } catch (e) {
      console.error('Failed to save theme', e)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}

// Вспомогательные функции
function resolveTheme(theme: ThemeValue): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyTheme(theme: ThemeValue) {
  const resolved = resolveTheme(theme)
  const html = document.documentElement
  
  if (resolved === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}
```

**2. Обновить Inertia entrypoint**
```typescript
// app/frontend/entrypoints/inertia.tsx
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { ThemeProvider } from '../contexts/ThemeContext'

createInertiaApp({
  resolve: name => resolvePageComponent(...),
  setup({ el, App, props }) {
    const root = createRoot(el)
    const initialTheme = props.initialPage.props.current_user?.theme || 'system'
    
    root.render(
      <ThemeProvider initialTheme={initialTheme}>
        <App {...props} />
      </ThemeProvider>
    )
  },
})
```

**3. Компонент переключателя темы**
```typescript
// app/frontend/components/ThemeToggle.tsx
import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light' as const, label: '☀️ Светлая' },
    { value: 'dark' as const, label: '🌙 Темная' },
    { value: 'system' as const, label: '⚙️ Система' }
  ]

  return (
    <div className="flex gap-2">
      {themes.map(t => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`px-3 py-1 rounded text-sm transition ${
            theme === t.value
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
```

**4. Обновить Header для включения переключателя**
```typescript
// app/frontend/components/Header.tsx
// Добавить ThemeToggle компонент в Header для аутентифицированного пользователя
```

### 4.4 Применение Tailwind dark mode

**В существующих компонентах добавить `dark:` префиксы:**

```typescript
// Пример: AppLayout.tsx
<div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
  <Header onLogoutError={setLogoutError} />
  <main className="flex-1 flex flex-col dark:bg-gray-900">
    {children}
  </main>
</div>
```

### 4.5 Поток выполнения

**1. При загрузке страницы:**
   - Rails контроллер передает тему пользователя в Inertia props
   - ThemeProvider читает `initialTheme` из props
   - Устанавливает класс `dark` на `<html>` до рендера компонентов (избежать FOUC)
   - Сохраняет выбор в localStorage для быстрого восстановления при следующей загрузке

**2. При смене темы пользователем:**
   - Пользователь кликает на ThemeToggle компонент
   - Вызывается `setTheme()` из useTheme hook
   - Обновляется состояние React (isDark для компонентов)
   - Отправляется PATCH запрос на `/users/profile/theme`
   - Сохраняется в localStorage для offline случаев
   - Класс `dark` добавляется/удаляется с `<html>`
   - Tailwind автоматически применит `dark:` стили

**3. При переходе на другое устройство:**
   - Пользователь логинится на другом устройстве
   - Rails контроллер передает тему из БД в Inertia props
   - ThemeProvider применяет правильную тему
   - Данные синхронизированы

## 5. Риски и митигации

| Риск | Вероятность | Severity | Митигация |
|---|---|---|---|
| **FOUC при SSR** | Высокая | Средняя | Передать тему в Inertia props, установить класс на `<html>` до рендера React (можно в middleware или в entrypoint) |
| **localStorage недоступна (private mode)** | Средняя | Низкая | Обернуть все localStorage операции в try-catch, использовать fallback на prefers-color-scheme |
| **Несогласованность между браузерами** | Низкая | Низкая | Использовать стандартный медиа-запрос prefers-color-scheme, тестировать на Chrome, Firefox, Safari |
| **Отсутствие dark: стилей в некоторых компонентах** | Высокая | Средняя | Систематически обойти все компоненты и добавить dark: версии, использовать WCAG contrast checker |
| **Контрастность текста в dark режиме** | Средняя | Высокая | Тестировать с accessibility инструментами (WAVE, axe DevTools), убедиться WCAG AA уровень |
| **Миграция существующих пользователей** | Низкая | Низкая | Миграция с `default: 'system'` — все существующие пользователи получат системную тему |
| **Использование inline styles вместо Tailwind** | Низкая | Средняя | Code review, использовать linting правила, требовать `dark:` класс если добавляется color |
| **Проблема с caching (браузер кэширует старые стили)** | Низкая | Низкая | Vite автоматически версионирует CSS, кэш будет инвалидирован при обновлении |

## 6. Тестовая стратегия

### 6.1 Backend тесты (RSpec)

**File:** `spec/controllers/users/profile/themes_controller_spec.rb`

```ruby
describe Users::Profile::ThemesController do
  subject(:request) { patch '/users/profile/theme', params: { theme: 'dark' } }

  let(:user) { create(:user, theme: 'system') }

  before { sign_in user }

  context 'with valid theme' do
    it 'updates user theme' do
      request
      expect(user.reload.theme).to eq 'dark'
    end

    it 'returns theme in response' do
      request
      expect(response.body).to include 'dark'
    end
  end

  context 'with invalid theme' do
    let(:request) { patch '/users/profile/theme', params: { theme: 'invalid' } }

    it 'returns 422 Unprocessable Entity' do
      request
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'does not update user theme' do
      expect { request }.not_to change { user.reload.theme }
    end
  end

  context 'User model validations' do
    it 'validates theme inclusion' do
      user.theme = 'invalid'
      expect(user).not_to be_valid
    end

    it 'has default theme "system"' do
      new_user = create(:user)
      expect(new_user.theme).to eq 'system'
    end
  end

  context 'Inertia props' do
    it 'includes theme in current_user prop' do
      get '/'
      props = request.env['inertia'].instance_variable_get(:@props)
      expect(props[:current_user][:theme]).to eq user.theme
    end
  end
end
```

### 6.2 Frontend тесты (Vitest)

**File:** `app/frontend/contexts/__tests__/ThemeContext.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react'
import { useTheme, ThemeProvider } from '../ThemeContext'

describe('ThemeContext', () => {
  describe('useTheme hook', () => {
    it('returns initial theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      })
      
      expect(result.current.theme).toBe('light')
    })

    it('updates theme', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      })
      
      await act(async () => {
        result.current.setTheme('dark')
      })
      
      expect(result.current.theme).toBe('dark')
    })

    it('calculates isDark correctly', () => {
      const { result: lightResult } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      })
      
      expect(lightResult.current.isDark).toBe(false)
    })

    it('saves theme to localStorage', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      })
      
      await act(async () => {
        result.current.setTheme('dark')
      })
      
      expect(localStorage.getItem('theme')).toBe('dark')
    })

    it('handles localStorage unavailable gracefully', () => {
      // Mock localStorage to throw error
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      })
      
      expect(() => {
        act(() => {
          result.current.setTheme('dark')
        })
      }).not.toThrow()
      
      spy.mockRestore()
    })
  })

  describe('ThemeToggle component', () => {
    it('renders all theme options', () => {
      const { getByText } = render(
        <ThemeProvider initialTheme="system">
          <ThemeToggle />
        </ThemeProvider>
      )
      
      expect(getByText(/Светлая/)).toBeInTheDocument()
      expect(getByText(/Темная/)).toBeInTheDocument()
      expect(getByText(/Система/)).toBeInTheDocument()
    })

    it('highlights current theme', () => {
      const { getByText } = render(
        <ThemeProvider initialTheme="dark">
          <ThemeToggle />
        </ThemeProvider>
      )
      
      const darkButton = getByText(/Темная/).closest('button')
      expect(darkButton).toHaveClass('bg-indigo-600')
    })

    it('calls setTheme on click', async () => {
      const { getByText } = render(
        <ThemeProvider initialTheme="light">
          <ThemeToggle />
        </ThemeProvider>
      )
      
      const darkButton = getByText(/Темная/)
      await userEvent.click(darkButton)
      
      expect(getByText(/Темная/).closest('button')).toHaveClass('bg-indigo-600')
    })
  })

  describe('prefers-color-scheme resolution', () => {
    it('resolves system theme to dark when OS dark mode enabled', () => {
      // Mock matchMedia
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))
      
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider initialTheme="system">{children}</ThemeProvider>
      })
      
      expect(result.current.isDark).toBe(true)
    })
  })
})
```

**File:** `app/frontend/components/__tests__/Header.test.tsx`

```typescript
it('includes ThemeToggle in authenticated header', () => {
  const { getByText } = render(
    <Header current_user={{ id: 1, email: 'test@example.com', theme: 'dark' }} />
  )
  
  expect(getByText(/Светлая|Темная|Система/)).toBeInTheDocument()
})
```

### 6.3 E2E тесты (Playwright)

**File:** `spec/features/dark_theme_spec.rb`

```ruby
feature 'Dark theme preference' do
  scenario 'User can switch to dark theme' do
    sign_in_as_user
    
    visit '/'
    expect(page).to have_css('html:not(.dark)')
    
    click_button 'Темная'
    expect(page).to have_css('html.dark')
    
    # Refresh page - theme should persist
    visit current_url
    expect(page).to have_css('html.dark')
  end

  scenario 'Theme preference syncs across tabs' do
    sign_in_as_user
    
    visit '/'
    expect(page).to have_css('html:not(.dark)')
    
    click_button 'Темная'
    expect(page).to have_css('html.dark')
    
    # Open new tab and verify theme
    page.execute_script("window.open('/')")
    sleep 1  # Wait for new tab
    
    other_window = page.driver.browser.window_handles.last
    page.driver.browser.switch_to.window(other_window)
    
    expect(page).to have_css('html.dark')
  end

  scenario 'System theme follows OS preference' do
    sign_in_as_user
    
    visit '/'
    click_button 'Система'
    
    # In test environment, we'll mock prefers-color-scheme
    page.evaluate_script("""
      window.matchMedia = (query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => {}
      })
    """)
    
    visit current_url
    expect(page).to have_css('html.dark')
  end

  scenario 'Theme persists on different device' do
    # User 1 device: sets dark theme
    sign_in_as_user(email: 'user@example.com')
    visit '/'
    click_button 'Темная'
    
    sign_out
    
    # User 1 device 2: logs in again, should get dark theme
    sign_in_as_user(email: 'user@example.com')
    visit '/'
    expect(page).to have_css('html.dark')
  end

  scenario 'Contrast is sufficient in dark mode (WCAG AA)' do
    sign_in_as_user
    
    visit '/'
    click_button 'Темная'
    
    # Check critical elements for contrast
    expect_contrast_ratio('.text-gray-900', 4.5) # Min for normal text
    expect_contrast_ratio('h1, h2, h3', 4.5)
  end
end
```

### 6.4 Coverage targets

- **Backend:** ≥80% покрытие тестами (особенно контроллер, валидации модели)
- **Frontend:** ≥70% покрытие компонентов (Context, hooks, компоненты)
- **E2E:** ≥60% критических сценариев (смена темы, синхронизация, persistence)

### 6.5 Инструменты для проверки качества

| Инструмент | Область | Команда |
|---|---|---|
| **RSpec** | Backend тесты | `bin/rails spec` |
| **Vitest** | Frontend unit тесты | `npm test` |
| **WCAG Contrast Checker** | Доступность | WebAIM, axe DevTools браузер расширение |
| **Lighthouse** | Performance | Chrome DevTools |
| **Playwright** | E2E тесты | `npx playwright test` |

## 7. Итоговая рекомендация

### ✅ Что делаем

1. **Backend (Rails):**
   - ✅ Добавить миграцию: колонка `theme` в таблицу users с дефолтом 'system'
   - ✅ Обновить User model с enum и валидацией
   - ✅ Создать контроллер `Users::Profile::ThemesController` для обновления темы
   - ✅ Обновить ApplicationController: добавить `theme` в Inertia shared props
   - ✅ Добавить route для `/users/profile/theme`

2. **Frontend (React):**
   - ✅ Создать `ThemeContext` с `ThemeProvider` и `useTheme` hook
   - ✅ Обновить Inertia entrypoint для инициализации ThemeProvider с `initialTheme`
   - ✅ Создать компонент `ThemeToggle` для переключения темы
   - ✅ Обновить `Header` компонент: добавить ThemeToggle в аутентифицированное меню
   - ✅ Обновить `AppLayout`: обернуть в ThemeProvider

3. **Tailwind dark mode:**
   - ✅ Обновить все компоненты: добавить `dark:` префиксы для стилей
   - ✅ Начать с критических компонентов: Header, AppLayout, Toast
   - ✅ Проверить контрастность с WCAG инструментами

4. **Тестирование:**
   - ✅ Backend: RSpec тесты для контроллера и модели
   - ✅ Frontend: Vitest тесты для Context, hooks, компонентов
   - ✅ E2E: Playwright тесты для пользовательских сценариев
   - ✅ A11y: Проверить WCAG AA контрастность

### ❌ Что НЕ делаем

- ❌ Вариант A (только localStorage): потеряется при очистке браузера
- ❌ Вариант C (только системная тема): не даст пользователю выбор
- ❌ Сложные анимации при смене темы: может быть раздражающе
- ❌ Автоматическую смену темы в зависимости от времени суток: потом можно добавить
- ❌ Другие темы (sepia, high-contrast и т.п.): только light/dark/system на MVP

### 📦 Зависимости

| Зависимость | Статус | Причина |
|---|---|---|
| **React 19** | ✅ Есть | Используется для Context API |
| **Tailwind CSS 4** | ✅ Есть | Встроенная поддержка dark mode (class-based) |
| **Inertia.js 3** | ✅ Есть | Передача props из Rails на фронт |
| **TypeScript 6** | ✅ Есть | Типизация Context, hooks |
| **Vitest 3** | ✅ Есть | Frontend unit тесты |
| **RSpec** | ✅ Есть | Backend unit тесты |
| **Devise** | ✅ Есть | Управление user сессией |
| **PostgreSQL 17** | ✅ Есть | Сохранение theme в users таблице |

**Новые гемы/пакеты:** Не требуются! Все функциональность реализуется встроенными инструментами.

### ⏱️ Оценка объема работы

| Компонент | Часы | Детали |
|---|---|---|
| **Backend (Rails)** | 3-4 | Миграция (0.5ч) + Model (0.5ч) + Controller (1.5ч) + Tests (1.5ч) |
| **Frontend Context** | 2-3 | ThemeContext (1.5ч) + Tests (1.5ч) |
| **Frontend Components** | 3-4 | ThemeToggle (1ч) + обновить Header (0.5ч) + AppLayout (0.5ч) + Tests (1.5ч) |
| **Tailwind dark: стили** | 2-3 | Обойти компоненты и добавить dark: классы |
| **E2E тесты** | 1-2 | Сценарии синхронизации, FOUC, prefers-color-scheme |
| **Code review + polish** | 1-2 | Accessibility проверки, final testing |
| **Итого** | **12-18 часов** | ~2-3 рабочих дня для 1 разработчика |

### 🎯 Критерии успеха

- ✅ Пользователь может выбрать light/dark/system тему
- ✅ Выбор сохраняется в БД (синхронизируется между устройствами)
- ✅ Нет FOUC при загрузке страницы
- ✅ localStorage работает как кэш для быстроты
- ✅ Все стили имеют dark: версии (≥90% покрытие)
- ✅ WCAG AA контрастность в dark режиме
- ✅ Tests: ≥80% backend, ≥70% frontend, ≥5 E2E сценариев
- ✅ Works offline (используется localStorage)
- ✅ Миграция существующих пользователей (theme='system' по умолчанию)

---

## Источники и ссылки

- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [React Context API](https://react.dev/reference/react/useContext)
- [Inertia.js Shared Data](https://inertiajs.com/shared-data)
- [prefers-color-scheme CSS Media Query](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [WCAG Color Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/articles/contrast/)
