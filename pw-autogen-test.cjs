const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => window.localStorage.removeItem('badge3dSettingsV1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: /3D/ }).click()
  await page.waitForTimeout(800)

  await page.getByPlaceholder('Сочи, AER…').first().fill('Сочи')
  await page.getByPlaceholder('Winter Ops').fill('Event Participant')
  await page.getByRole('button', { name: 'Собрать за меня' }).click()
  // Auto-generation downloads full photos: give it time.
  await page.waitForSelector('.badge3d-variant', { timeout: 60000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'pw-autogen-variants.png' })

  const variants = page.locator('.badge3d-variant')
  const count = await variants.count()
  console.log('variants:', count)
  if (count > 0) {
    await variants.first().click()
    await page.waitForTimeout(1500)
    await page.locator('.badge3d-preview').screenshot({ path: 'pw-autogen-applied.png' })
    if (count > 1) {
      await variants.nth(1).click()
      await page.waitForTimeout(1500)
      await page.locator('.badge3d-preview').screenshot({ path: 'pw-autogen-applied2.png' })
    }
  }
  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
