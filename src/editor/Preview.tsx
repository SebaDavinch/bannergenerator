import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { StageContext } from '../banner/context'
import { BannerStage } from '../banner/Banner'
import { STAGE_H, STAGE_W, fitBox } from '../map/projection'
import { useStore } from '../state/store'
import { UI } from '../i18n'
import { MapToolbar } from './MapToolbar'
import { activeMap } from './activeMap'

export function Preview({ stageRef, onGallerySlot }: { stageRef: RefObject<HTMLDivElement | null>; onGallerySlot?: (el: HTMLDivElement | null) => void }) {
  const { state } = useStore()
  const t = UI[state.locale]
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const [guides, setGuides] = useState(false)

  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / STAGE_W))
    ro.observe(el)
    setScale(el.clientWidth / STAGE_W)
    return () => ro.disconnect()
  }, [])

  const map = activeMap(state)
  const box = map ? fitBox(map.view.frame) : null

  return (
    <div className="preview">
      <div className="preview__head">
        <span className="preview__title">{t.preview}</span>
        <span className="preview__size">1920 × 1080</span>
        {map && <span className="preview__hint">{t.mapHint}</span>}
      </div>
      <div className="preview__frame" ref={frame} style={{ height: STAGE_H * scale }}>
        <div className="preview__scaler" style={{ transform: `scale(${scale})` }}>
          <StageContext.Provider value={{ scale, interactive: true, guides }}>
            <BannerStage ref={stageRef} editable />
          </StageContext.Provider>
        </div>
        {guides && box && (
          <div className="preview__guide" style={{
            left: box[0][0] * scale, top: box[0][1] * scale, width: (box[1][0] - box[0][0]) * scale, height: (box[1][1] - box[0][1]) * scale,
          }}>
            <span>{t.safeArea}</span>
          </div>
        )}
        <MapToolbar guides={guides} onGuides={setGuides} />
      </div>
      <div className="gallery-slot" ref={onGallerySlot} />
    </div>
  )
}
