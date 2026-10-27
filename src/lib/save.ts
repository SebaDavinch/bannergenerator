interface DownloadsApi { save(req: { filename: string; data: Blob }): Promise<unknown> }
type ClaudeRuntime = { use?: (name: string) => Promise<unknown> }

/**
 * Hands a generated file to the viewer. Inside a claude.ai artifact plain
 * downloads are blocked, so the `downloads` capability is used (the viewer
 * confirms); everywhere else it is a normal browser download.
 */
export async function saveFile(blob: Blob, filename: string) {
  const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude
  if (runtime?.use) {
    const downloads = (await runtime.use('downloads').catch(() => null)) as DownloadsApi | null
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob })
      } catch (e) {
        if ((e as { code?: string })?.code !== 'declined') throw e
      }
      return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
