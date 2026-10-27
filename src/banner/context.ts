import { createContext, useContext } from 'react'

/** Preview → stage scale (stage is always 1920×1080) and whether pointer editing is on. */
export const StageContext = createContext<{ scale: number; interactive: boolean; guides: boolean }>({ scale: 1, interactive: false, guides: false })

export const useStage = () => useContext(StageContext)
