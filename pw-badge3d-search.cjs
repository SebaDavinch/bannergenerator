const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: /3D/ }).click()
  await page.waitForTimeout(400)

  await page.getByPlaceholder('Сочи, AER…').fill('Сочи')
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'pw-b3d-chips.png' })

  await page.getByRole('button', { name: 'Олимпийский парк' }).click()
  await page.waitForTimeout(6000)
  await page.screenshot({ path: 'pw-b3d-search-results.png' })

  // Click the first result to add it as a layer.
  const results = page.locator('.badge3d-result')
  const count = await results.count()
  console.log('results:', count)
  if (count > 0) {
    await results.first().click()
    await page.waitForTimeout(4000)
    await page.screenshot({ path: 'pw-b3d-search-layer.png' })
  }
  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
