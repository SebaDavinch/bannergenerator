import { createContext } from 'react'

/** Element under the preview where the active photo picker shows its suggestions. */
export const GallerySlot = createContext<HTMLElement | null>(null)
