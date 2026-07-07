import * as THREE from 'three'

export type FlagWavePreset = 'gentle' | 'medium' | 'wild'

const WAVE_PRESETS: Record<FlagWavePreset, { ampA: number; ampB: number; speed: number }> = {
  gentle: { ampA: 0.09, ampB: 0.035, speed: 0.55 },
  medium: { ampA: 0.16, ampB: 0.06, speed: 0.85 },
  wild: { ampA: 0.26, ampB: 0.095, speed: 1.25 },
}

const SEGMENTS_X = 56
const SEGMENTS_Y = 18
/** World-unit height the frame is always sized to; width follows the canvas aspect ratio. */
const PLANE_HEIGHT = 2
/** Max combined flutter amplitude across presets (see WAVE_PRESETS 'wild'), for camera framing margin. */
const MAX_FLUTTER = WAVE_PRESETS.wild.ampA + WAVE_PRESETS.wild.ampB

/** Catmull-Rom interpolation through control points; t is wrapped to 0..1. */
function catmullRom(points: Array<[number, number]>, t: number): number {
  const n = points.length
  const xs = points.map((p) => p[0])
  const clamped = Math.min(1, Math.max(0, t))
  let segment = 0
  while (segment < n - 2 && clamped > xs[segment + 1]) {
    segment += 1
  }
  const p0 = points[Math.max(0, segment - 1)][1]
  const p1 = points[segment][1]
  const p2 = points[Math.min(n - 1, segment + 1)][1]
  const p3 = points[Math.min(n - 1, segment + 2)][1]
  const span = xs[segment + 1] - xs[segment] || 1
  const u = Math.min(1, Math.max(0, (clamped - xs[segment]) / span))
  const u2 = u * u
  const u3 = u2 * u
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
}

export type FlagSceneOptions = {
  canvas: HTMLCanvasElement
  pixelWidth: number
  pixelHeight: number
  countryCode: string
  wavePreset?: FlagWavePreset
  /** Rest-pose centerline (like AUTHORED_CURVES): bends the flag's base shape, not just the live flutter. */
  bendPoints?: Array<[number, number]>
  bendAmplitude?: number
}

export type FlagScene = {
  ready: Promise<void>
  setCountry(countryCode: string): void
  setWavePreset(preset: FlagWavePreset): void
  renderFrame(timeSeconds: number): void
  captureDataUrl(): string
  dispose(): void
}

/**
 * A physically-lit, vertex-displaced cloth plane textured with the country's
 * flag. Two layered sine waves drive a live flutter (recomputed per frame);
 * an optional Catmull-Rom bend shapes the rest pose to match a ribbon curve.
 * Real geometry + directional lighting produces the crest/trough shading
 * that the SVG ribbon has to fake with hand-authored gradients.
 */
export function createFlagScene(options: FlagSceneOptions): FlagScene {
  const { canvas, pixelWidth, pixelHeight } = options
  let wavePreset = options.wavePreset ?? 'medium'

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(pixelWidth, pixelHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()

  // Plane width follows the canvas aspect ratio so a wide short ribbon and a
  // near-square standalone flag both fill their frame exactly (no fixed
  // aspect mismatch, no letterboxing).
  const aspect = pixelWidth / pixelHeight
  const planeWidth = PLANE_HEIGHT * aspect
  const bendAmp = options.bendAmplitude ?? 0
  // Orthographic (not perspective) so the flag fills the frame edge-to-edge
  // regardless of aspect ratio, with a vertical margin generous enough that
  // the bend + live flutter never clip against the frame top/bottom.
  const verticalMargin = Math.abs(bendAmp) + MAX_FLUTTER + 0.06
  const halfW = planeWidth / 2
  const halfH = PLANE_HEIGHT / 2 + verticalMargin
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 20)
  camera.position.set(0, 0, 6)
  camera.lookAt(0, 0, 0)

  // Kept near-neutral (only a whisper of warmth) so flag colors read true —
  // a strong color cast reads as "dirty" on a national flag where accurate
  // color matters more than atmospheric mood.
  const keyLight = new THREE.DirectionalLight(0xfffaf2, 2.1)
  keyLight.position.set(-3, 3.2, 4.5)
  scene.add(keyLight)
  const fillLight = new THREE.DirectionalLight(0xe8f0ff, 0.7)
  fillLight.position.set(3.2, -1.4, 2.4)
  scene.add(fillLight)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.45)
  rimLight.position.set(-0.5, 1.5, -4.5)
  scene.add(rimLight)
  const ambient = new THREE.AmbientLight(0xffffff, 0.62)
  scene.add(ambient)

  const geometry = new THREE.PlaneGeometry(planeWidth, PLANE_HEIGHT, SEGMENTS_X, SEGMENTS_Y)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const vertexCount = position.count
  const baseX = new Float32Array(vertexCount)
  const baseY = new Float32Array(vertexCount)
  const bendOffset = new Float32Array(vertexCount)

  const bendPoints = options.bendPoints
  for (let i = 0; i < vertexCount; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    baseX[i] = x
    baseY[i] = y
    if (bendPoints && bendPoints.length >= 2 && bendAmp !== 0) {
      const t = x / planeWidth + 0.5
      bendOffset[i] = catmullRom(bendPoints, t) * bendAmp
    }
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.04,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  let currentTexture: THREE.Texture | null = null

  function applyTexture(texture: THREE.Texture) {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
    texture.needsUpdate = true
    const previous = currentTexture
    currentTexture = texture
    material.map = texture
    material.needsUpdate = true
    previous?.dispose()
  }

  function loadCountry(countryCode: string): Promise<void> {
    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(
        `https://flagcdn.com/w640/${countryCode}.png`,
        (texture) => {
          applyTexture(texture)
          resolve()
        },
        undefined,
        () => resolve(),
      )
    })
  }

  const ready = loadCountry(options.countryCode).then(() => {
    renderFrame(0)
  })

  function renderFrame(timeSeconds: number) {
    const preset = WAVE_PRESETS[wavePreset]
    for (let i = 0; i < vertexCount; i += 1) {
      const x = baseX[i]
      const y = baseY[i]
      const flutter =
        Math.sin(x * 2.3 + timeSeconds * preset.speed * 2 + y * 0.6) * preset.ampA +
        Math.sin(x * 5.4 - timeSeconds * preset.speed * 3.1 + y * 1.6) * preset.ampB
      position.setZ(i, flutter)
      position.setY(i, y + bendOffset[i])
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
    renderer.render(scene, camera)
  }

  return {
    ready,
    setCountry(countryCode: string) {
      void loadCountry(countryCode)
    },
    setWavePreset(preset: FlagWavePreset) {
      wavePreset = preset
    },
    renderFrame,
    captureDataUrl() {
      return renderer.domElement.toDataURL('image/png')
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      currentTexture?.dispose()
      renderer.dispose()
    },
  }
}
