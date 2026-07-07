import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createFlagScene, type FlagScene, type FlagWavePreset } from './flagScene'

export type ThreeFlagCanvasHandle = {
  /** Renders one fresh frame and returns a PNG data URL, or null if not ready yet. */
  captureDataUrl(): string | null
}

type ThreeFlagCanvasProps = {
  countryCode: string
  wavePreset: FlagWavePreset
  pixelWidth: number
  pixelHeight: number
  bendPoints?: Array<[number, number]>
  bendAmplitude?: number
  className?: string
}

/**
 * Mounts a live-animated Three.js flag scene onto a plain <canvas>. The
 * canvas is a normal DOM element (not a WebGL context html-to-image has to
 * special-case) — export code captures a data URL via the ref and swaps in
 * a static <image> before rasterizing, so this component only ever needs to
 * render correctly on screen, not survive export serialization itself.
 */
export const ThreeFlagCanvas = forwardRef<ThreeFlagCanvasHandle, ThreeFlagCanvasProps>(function ThreeFlagCanvas(
  { countryCode, wavePreset, pixelWidth, pixelHeight, bendPoints, bendAmplitude, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<FlagScene | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    let disposed = false
    let rafId = 0
    const start = performance.now()
    const scene = createFlagScene({
      canvas,
      pixelWidth,
      pixelHeight,
      countryCode,
      wavePreset,
      bendPoints,
      bendAmplitude,
    })
    sceneRef.current = scene

    function loop(now: number) {
      if (disposed) {
        return
      }
      scene.renderFrame((now - start) / 1000)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      scene.dispose()
      sceneRef.current = null
    }
    // bendPoints/bendAmplitude reshape the rest pose and require a full
    // geometry rebuild; countryCode/wavePreset are handled via imperative
    // setters below without tearing down the WebGL context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelWidth, pixelHeight, bendPoints, bendAmplitude])

  useEffect(() => {
    sceneRef.current?.setCountry(countryCode)
  }, [countryCode])

  useEffect(() => {
    sceneRef.current?.setWavePreset(wavePreset)
  }, [wavePreset])

  useImperativeHandle(
    ref,
    () => ({
      captureDataUrl: () => {
        const scene = sceneRef.current
        if (!scene) {
          return null
        }
        scene.renderFrame(performance.now() / 1000)
        return scene.captureDataUrl()
      },
    }),
    [],
  )

  return <canvas ref={canvasRef} className={className} />
})
