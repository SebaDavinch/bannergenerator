const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => window.localStorage.removeItem('badge3dSettingsV1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: /3D/ }).click()
  await page.waitForTimeout(800)
  await page.setInputFiles('input[type="file"][accept="image/*"]', 'pw-city-badge.png')
  await page.waitForTimeout(600)

  const curveNames = ['S-изгиб', 'Чаша', 'Гребень', 'Двойная']
  for (const name of curveNames) {
    await page.getByRole('button', { name }).click()
    await page.waitForTimeout(500)
    await page.locator('.badge3d-preview').screenshot({ path: `pw-curve-${name}.png` })
  }

  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
