/** URL of a file in public/, relative to the app base (works under a sub-path or a sandboxed host). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
