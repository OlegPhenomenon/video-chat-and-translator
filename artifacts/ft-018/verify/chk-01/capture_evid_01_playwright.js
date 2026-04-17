// NOTE: `playwright-cli run-code --filename=...` expects the file to contain
// an expression like `async page => { ... }` (not a CommonJS module).
async page => {
  const VIDEO_FILE = '/Users/oleghasjanov/Documents/projects/video-chat-and-translator/.playwright-cli/sample.mp4'
  const OUT_01 = '/Users/oleghasjanov/Documents/projects/video-chat-and-translator/artifacts/ft-018/verify/chk-01/01-in-progress.png'
  const OUT_02 = '/Users/oleghasjanov/Documents/projects/video-chat-and-translator/artifacts/ft-018/verify/chk-01/02-success.png'
  const OUT_03 = '/Users/oleghasjanov/Documents/projects/video-chat-and-translator/artifacts/ft-018/verify/chk-01/03-error.png'

  const EMAIL = 'ft018+1776444881@example.com'
  const PASSWORD = 'Password123!'

  const delay = (ms) => page.waitForTimeout(ms)

  async function ensureLoggedIn() {
    await page.goto('http://localhost:3100/videos', { waitUntil: 'domcontentloaded' })
    if (page.url().includes('/users/sign_in')) {
      await page.getByRole('textbox', { name: 'Электронная почта' }).fill(EMAIL)
      await page.getByRole('textbox', { name: 'Пароль' }).fill(PASSWORD)
      await page.getByRole('button', { name: 'Войти' }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    }
  }

  async function uploadVideoAndOpenShow() {
    await page.goto('http://localhost:3100/videos', { waitUntil: 'domcontentloaded' })
    await page.setInputFiles('input[type="file"][accept="video/*"]', VIDEO_FILE)
    await page.waitForURL(/\/videos\/[^/]+$/, { timeout: 30_000 })
  }

  async function mockTranscriptionSuccess() {
    const body = 'WEBVTT\n\n00:00.000 --> 00:00.500\nHello\n'
    const headers = { 'content-type': 'text/vtt; charset=utf-8' }

    await page.unroute('https://api.openai.com/v1/audio/transcriptions').catch(() => {})
    await page.unroute('https://api.groq.com/openai/v1/audio/transcriptions').catch(() => {})

    await page.route('https://api.openai.com/v1/audio/transcriptions', async (route) => {
      await delay(1500)
      await route.fulfill({ status: 200, headers, body })
    })
    await page.route('https://api.groq.com/openai/v1/audio/transcriptions', async (route) => {
      await delay(1500)
      await route.fulfill({ status: 200, headers, body })
    })
  }

  async function mockTranscription401() {
    await page.unroute('https://api.openai.com/v1/audio/transcriptions').catch(() => {})
    await page.unroute('https://api.groq.com/openai/v1/audio/transcriptions').catch(() => {})

    await page.route('https://api.openai.com/v1/audio/transcriptions', async (route) => {
      await delay(300)
      await route.fulfill({ status: 401, contentType: 'text/plain', body: 'unauthorized' })
    })
    await page.route('https://api.groq.com/openai/v1/audio/transcriptions', async (route) => {
      await delay(300)
      await route.fulfill({ status: 401, contentType: 'text/plain', body: 'unauthorized' })
    })
  }

  async function startTranscription() {
    await page.getByRole('textbox', { name: 'API key' }).fill('test-key')
    await page.getByRole('button', { name: 'Транскрибировать в .vtt' }).click()
  }

  await ensureLoggedIn()
  await uploadVideoAndOpenShow()

  // 1) In-progress + success (mocked)
  await mockTranscriptionSuccess()
  await startTranscription()
  await delay(250)
  await page.screenshot({ path: OUT_01, fullPage: true })

  await page.getByText('Готово: субтитры сохранены.').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: OUT_02, fullPage: true })

  // 2) Error (mocked 401)
  // Enable overwrite, otherwise the UI will stop at validation_failed due to existing subtitles.
  const overwrite = page.getByRole('checkbox', { name: 'Перезаписать существующие субтитры' })
  if (await overwrite.count()) await overwrite.check()

  await mockTranscription401()
  await startTranscription()
  await page.getByText('Ошибка').first().waitFor({ timeout: 30_000 })
  await page.screenshot({ path: OUT_03, fullPage: true })
}

