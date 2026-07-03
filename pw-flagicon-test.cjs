const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => window.localStorage.removeItem('badge3dSettingsV1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: /3D/ }).click()
  await page.waitForTimeout(1200)
  await page.setInputFiles('input[type="file"][accept="image/*"]', 'pw-city-badge.png')
  await page.waitForTimeout(600)
  // Enable the pre-drawn waving flag element.
  await page.getByText('Развевающийся флаг (отрисованный)').click()
  await page.waitForTimeout(1200)
  await page.locator('.badge3d-preview').screenshot({ path: 'pw-flagicon.png' })
  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
