const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  // Reset persisted settings so defaults apply.
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => window.localStorage.removeItem('badge3dSettingsV1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: /3D/ }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'pw-s3-default.png' })

  // Add a photo layer.
  await page.setInputFiles('input[type="file"][accept="image/*"]', 'pw-city-badge.png')
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'pw-s3-photo.png', clip: { x: 456, y: 80, width: 1030, height: 560 } })

  // Theme presets.
  await page.getByRole('button', { name: 'Золотая медаль' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'pw-s3-gold.png', clip: { x: 456, y: 80, width: 1030, height: 560 } })

  await page.getByRole('button', { name: 'Hi-Tech' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'pw-s3-hitech.png', clip: { x: 456, y: 80, width: 1030, height: 560 } })

  await page.getByRole('button', { name: 'Ретро-постер' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'pw-s3-retro.png', clip: { x: 456, y: 80, width: 1030, height: 560 } })

  // Back to chrome night + export.
  await page.getByRole('button', { name: 'Хром / Ночь' }).click()
  await page.waitForTimeout(700)
  const downloadPromise = page.waitForEvent('download')
  await page.locator('.preview-export-btn').click()
  const download = await downloadPromise
  await download.saveAs('pw-s3-export.png')

  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
