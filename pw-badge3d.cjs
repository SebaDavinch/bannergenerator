const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: /3D/ }).click()
  await page.waitForTimeout(500)

  // Add a photo layer via the hidden file input.
  await page.setInputFiles('input[type="file"][accept="image/*"]', 'pw-city-badge.png')
  await page.waitForTimeout(600)

  // Circle shape + gold frame.
  await page.getByRole('button', { name: 'Круг' }).first().click()
  await page.getByRole('button', { name: 'Золото' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'pw-badge3d-photo.png' })

  // Bottom mask with feather on the selected layer.
  await page.getByRole('button', { name: 'Нижняя часть' }).click()
  const feather = page.locator('input[type="range"]').nth(1)
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'pw-badge3d-mask.png' })

  // Export and verify the downloaded PNG.
  const downloadPromise = page.waitForEvent('download')
  await page.locator('.preview-export-btn').click()
  const download = await downloadPromise
  await download.saveAs('pw-badge3d-export.png')

  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
