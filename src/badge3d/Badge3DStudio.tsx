import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ChevronDown, ChevronUp, Download, Eye, EyeOff, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import {
  BADGE3D_VIEWBOX,
  createDefaultBadge3DState,
  createPhotoLayer,
  type Badge3DShape,
  type Badge3DState,
  type ContrailVariant,
  type FrameMaterial,
  type PhotoLayer,
  type PhotoLayerBlend,
  type PhotoLayerMask,
  type RibbonPlacement,
  type TextMaterialId,
  type FlagWavePresetId,
  AUTHORED_CURVES,
  flagUrlFor,
  flagWavingUrlFor,
} from './types'
import { fetchAsDataUrl, searchAllSources, type PhotoCandidate, type PhotoSourceKeys } from './photoSearch'
import { findCityBackdrops } from './cityBackdrops'
import { BADGE_FONTS, TEXT_MATERIALS } from './fonts'
import { Text3D } from './Text3D'
import { FlagWaveBand, SideRibbon } from './FlagRibbon'
import { extractFlagStripes, type FlagStripe } from './flagStripes'
import { PlaneWithContrail, WingsEmblem, WingSeparator } from './decor'
import { THEME_PRESETS } from './presets'
import { generateVariants, type AutoVariant } from './autoGenerator'
import { ThreeFlagCanvas, type ThreeFlagCanvasHandle } from './three/ThreeFlagCanvas'
import './fonts'
import './badge3d.css'

const STORAGE_KEY = 'badge3dSettingsV2'
const KEYS_STORAGE_KEY = 'badge3dApiKeysV1'
const VB = BADGE3D_VIEWBOX
const CENTER = VB / 2

type Locale = 'ru' | 'en'

const STRINGS = {
  ru: {
    tabBanner: 'Баннер',
    tabBadge: 'Бейдж',
    tabBadge3d: '3D Бейдж',
    sectionSearch: 'Поиск фото',
    cityLabel: 'Город / IATA',
    cityPlaceholder: 'Сочи, AER…',
    queryLabel: 'Запрос',
    queryPlaceholder: 'Sochi Olympic park sunset',
    searchButton: 'Искать',
    searching: 'Ищу…',
    searchEmpty: 'Ничего не нашлось — попробуйте другой запрос или чип локации.',
    searchError: 'Поиск не удался. Проверьте сеть/ключи и попробуйте снова.',
    addingPhoto: 'Загружаю кадр…',
    apiKeysLabel: 'API-ключи фотостоков (опционально)',
    apiKeysHelp: 'Бесплатные ключи Pexels / Pixabay / Unsplash расширяют выдачу. Без них работают Wikimedia и Openverse.',
    sectionShape: 'Форма и рамка',
    sectionLayers: 'Фото-слои',
    sectionBackground: 'Фон-заливка',
    sectionText: 'Текст',
    shapeCircle: 'Круг',
    shapeRounded: 'Квадрат',
    shapeShield: 'Щит',
    shapeHexagon: 'Шестигранник',
    materialSilver: 'Серебро',
    materialGold: 'Золото',
    materialBronze: 'Бронза',
    materialNavy: 'Эмаль',
    frameAccent: 'Цвет канта',
    frameWidth: 'Толщина рамки',
    addPhoto: 'Добавить фото',
    layersEmpty: 'Пока нет фото-слоёв. Добавьте кадр — он станет фоном бейджа.',
    layerMask: 'Маска слоя',
    maskFull: 'Весь бейдж',
    maskBottom: 'Нижняя часть',
    maskTop: 'Верхняя часть',
    maskCircle: 'Круг',
    feather: 'Растушёвка краёв',
    opacity: 'Непрозрачность',
    blend: 'Наложение',
    brightness: 'Яркость',
    contrast: 'Контраст',
    saturation: 'Насыщенность',
    dragHint: 'Перетаскивайте выбранный слой мышью прямо на превью, колесо — масштаб.',
    bgTop: 'Верхний цвет',
    bgBottom: 'Нижний цвет',
    scrimOpacity: 'Затемнение под текст',
    scrimHeight: 'Высота затемнения',
    yearLabel: 'Год (крупно)',
    line2Label: 'Вторая строка',
    plateLabel: 'Текст плашки',
    flagLabel: 'Флаг (код страны, напр. ru)',
    sectionAuto: 'Автогенератор',
    autoEventLabel: 'Название ивента',
    autoEventPlaceholder: 'Winter Ops',
    autoButton: 'Собрать за меня',
    autoGenerating: 'Собираю варианты…',
    autoEmpty: 'Не удалось собрать варианты — проверьте город/сеть.',
    autoHint: 'Город + название ивента → 3–4 готовых варианта. Клик по варианту применяет его, дальше всё редактируется.',
    sectionPresets: 'Темы',
    sectionRibbon: 'Флаговая лента',
    sectionPlane: 'Самолёт и декор',
    fontLabel: 'Шрифт',
    materialLabel: 'Материал',
    sizeLabel: 'Размер',
    depthLabel: 'Глубина 3D',
    archLabel: 'Дуга',
    positionYLabel: 'Позиция по вертикали',
    wingsLabel: 'Крылья-разделители',
    ribbonNone: 'Нет',
    ribbonBottom: 'Волна снизу',
    ribbonSides: 'По краям',
    ribbonLeft: 'Слева',
    ribbonRight: 'Справа',
    amplitudeLabel: 'Амплитуда волны',
    wavesLabel: 'Число волн',
    ribbonHeightLabel: 'Высота ленты',
    planeLabel: 'Самолёт с трейлом',
    planeArc: 'Дуга',
    planeClimb: 'Набор высоты',
    planeLoop: 'Петля',
    planeScaleLabel: 'Масштаб самолёта',
    wingsTopLabel: 'Эмблема-крылья сверху',
    flagIconLabel: 'Развевающийся флаг (отрисованный)',
    flagIconScaleLabel: 'Масштаб флага',
    super3dLabel: 'Супер 3D (живая ткань)',
    super3dHint: 'Настоящая 3D-геометрия с освещением вместо плоского SVG — рендерится в браузере. Одновременно можно включить только один 3D-флаг (лента или иконка).',
    wavePresetLabel: 'Сила ветра',
    wavePresetGentle: 'Штиль',
    wavePresetMedium: 'Бриз',
    wavePresetWild: 'Шторм',
    latinOnly: 'лат.',
    exportButton: 'Скачать PNG 200×200',
    exporting: 'Экспорт…',
    previewLabel: 'Превью',
    previewTitle: '3D бейдж ивента',
    exportError: 'Не удалось экспортировать бейдж. Попробуйте ещё раз.',
  },
  en: {
    tabBanner: 'Banner',
    tabBadge: 'Badge',
    tabBadge3d: '3D Badge',
    sectionSearch: 'Photo search',
    cityLabel: 'City / IATA',
    cityPlaceholder: 'Sochi, AER…',
    queryLabel: 'Query',
    queryPlaceholder: 'Sochi Olympic park sunset',
    searchButton: 'Search',
    searching: 'Searching…',
    searchEmpty: 'Nothing found — try another query or a location chip.',
    searchError: 'Search failed. Check network/keys and try again.',
    addingPhoto: 'Downloading photo…',
    apiKeysLabel: 'Stock API keys (optional)',
    apiKeysHelp: 'Free Pexels / Pixabay / Unsplash keys widen the results. Wikimedia and Openverse work without keys.',
    sectionShape: 'Shape & frame',
    sectionLayers: 'Photo layers',
    sectionBackground: 'Background fill',
    sectionText: 'Text',
    shapeCircle: 'Circle',
    shapeRounded: 'Square',
    shapeShield: 'Shield',
    shapeHexagon: 'Hexagon',
    materialSilver: 'Silver',
    materialGold: 'Gold',
    materialBronze: 'Bronze',
    materialNavy: 'Enamel',
    frameAccent: 'Pinstripe color',
    frameWidth: 'Frame width',
    addPhoto: 'Add photo',
    layersEmpty: 'No photo layers yet. Add an image — it becomes the badge background.',
    layerMask: 'Layer mask',
    maskFull: 'Full badge',
    maskBottom: 'Bottom part',
    maskTop: 'Top part',
    maskCircle: 'Circle',
    feather: 'Edge feather',
    opacity: 'Opacity',
    blend: 'Blend',
    brightness: 'Brightness',
    contrast: 'Contrast',
    saturation: 'Saturation',
    dragHint: 'Drag the selected layer directly on the preview; mouse wheel zooms it.',
    bgTop: 'Top color',
    bgBottom: 'Bottom color',
    scrimOpacity: 'Text scrim opacity',
    scrimHeight: 'Scrim height',
    yearLabel: 'Year (large)',
    line2Label: 'Second line',
    plateLabel: 'Plate text',
    flagLabel: 'Flag (country code, e.g. ru)',
    sectionAuto: 'Auto-generator',
    autoEventLabel: 'Event name',
    autoEventPlaceholder: 'Winter Ops',
    autoButton: 'Assemble for me',
    autoGenerating: 'Assembling variants…',
    autoEmpty: 'Could not assemble variants — check city/network.',
    autoHint: 'City + event name → 3-4 ready variants. Click one to apply; everything stays editable.',
    sectionPresets: 'Themes',
    sectionRibbon: 'Flag ribbon',
    sectionPlane: 'Plane & decor',
    fontLabel: 'Font',
    materialLabel: 'Material',
    sizeLabel: 'Size',
    depthLabel: '3D depth',
    archLabel: 'Arch',
    positionYLabel: 'Vertical position',
    wingsLabel: 'Wing separators',
    ribbonNone: 'None',
    ribbonBottom: 'Bottom wave',
    ribbonSides: 'Both sides',
    ribbonLeft: 'Left',
    ribbonRight: 'Right',
    amplitudeLabel: 'Wave amplitude',
    wavesLabel: 'Wave count',
    ribbonHeightLabel: 'Ribbon height',
    planeLabel: 'Plane with contrail',
    planeArc: 'Arc',
    planeClimb: 'Climb',
    planeLoop: 'Loop',
    planeScaleLabel: 'Plane scale',
    wingsTopLabel: 'Wings emblem on top',
    flagIconLabel: 'Waving flag (pre-drawn)',
    flagIconScaleLabel: 'Flag scale',
    super3dLabel: 'Super 3D (live cloth)',
    super3dHint: 'Real 3D geometry with lighting instead of flat SVG — renders in the browser. Only one 3D flag (ribbon or icon) can be active at a time.',
    wavePresetLabel: 'Wind strength',
    wavePresetGentle: 'Calm',
    wavePresetMedium: 'Breeze',
    wavePresetWild: 'Storm',
    latinOnly: 'latin',
    exportButton: 'Download PNG 200×200',
    exporting: 'Exporting…',
    previewLabel: 'Preview',
    previewTitle: '3D event badge',
    exportError: 'Failed to export the badge. Please try again.',
  },
} satisfies Record<Locale, Record<string, string>>

const FRAME_GRADIENTS: Record<FrameMaterial, [string, string, string, string]> = {
  silver: ['#ffffff', '#c9d2dd', '#7e8b9d', '#e9eef5'],
  gold: ['#fff6cf', '#e8bd52', '#96690f', '#f6dd8d'],
  bronze: ['#f6d3b3', '#c08049', '#6d431d', '#dda671'],
  navy: ['#2d4d80', '#16294d', '#0a1730', '#1f3a63'],
}

function shapePath(shape: Badge3DShape, inset: number): string {
  const min = inset
  const max = VB - inset
  const size = max - min
  if (shape === 'circle') {
    const r = size / 2
    return `M ${CENTER - r} ${CENTER} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`
  }
  if (shape === 'rounded-square') {
    const r = Math.max(24, 92 - inset)
    return [
      `M ${min + r} ${min}`,
      `H ${max - r}`, `A ${r} ${r} 0 0 1 ${max} ${min + r}`,
      `V ${max - r}`, `A ${r} ${r} 0 0 1 ${max - r} ${max}`,
      `H ${min + r}`, `A ${r} ${r} 0 0 1 ${min} ${max - r}`,
      `V ${min + r}`, `A ${r} ${r} 0 0 1 ${min + r} ${min}`,
      'Z',
    ].join(' ')
  }
  if (shape === 'hexagon') {
    const r = size / 2
    const points: string[] = []
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 180) * (60 * i - 90)
      points.push(`${CENTER + r * Math.cos(angle)} ${CENTER + r * Math.sin(angle)}`)
    }
    return `M ${points.join(' L ')} Z`
  }
  // Shield: rounded top corners, tapered sides, soft point at the bottom.
  const topY = min + size * 0.02
  const cornerR = size * 0.14
  const waistY = min + size * 0.62
  const tipY = max
  return [
    `M ${min + cornerR} ${topY}`,
    `H ${max - cornerR}`,
    `Q ${max} ${topY} ${max} ${topY + cornerR}`,
    `V ${waistY}`,
    `C ${max} ${waistY + size * 0.2} ${CENTER + size * 0.22} ${tipY - size * 0.12} ${CENTER} ${tipY}`,
    `C ${CENTER - size * 0.22} ${tipY - size * 0.12} ${min} ${waistY + size * 0.2} ${min} ${waistY}`,
    `V ${topY + cornerR}`,
    `Q ${min} ${topY} ${min + cornerR} ${topY}`,
    'Z',
  ].join(' ')
}

function loadStoredState(): Badge3DState {
  const fallback = createDefaultBadge3DState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return fallback
    }
    const parsed = JSON.parse(raw) as Partial<Badge3DState>
    return {
      ...fallback,
      ...parsed,
      layers: Array.isArray(parsed.layers) ? parsed.layers : [],
    }
  } catch {
    return fallback
  }
}

type Badge3DStudioProps = {
  locale: Locale
  modeTabs: React.ReactNode
  panelHeader: React.ReactNode
}

export function Badge3DStudio({ locale, modeTabs, panelHeader }: Badge3DStudioProps) {
  const t = STRINGS[locale]
  const [state, setState] = useState<Badge3DState>(loadStoredState)
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const previewRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [cityInput, setCityInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PhotoCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState<'idle' | 'empty' | 'error'>('idle')
  const [isAddingPhoto, setIsAddingPhoto] = useState(false)
  const [apiKeys, setApiKeys] = useState<PhotoSourceKeys>(() => {
    try {
      const raw = window.localStorage.getItem(KEYS_STORAGE_KEY)
      const stored = raw ? (JSON.parse(raw) as PhotoSourceKeys) : {}
      const env = import.meta.env as Record<string, string | undefined>
      return {
        pexels: stored.pexels || env.VITE_PEXELS_KEY || '',
        pixabay: stored.pixabay || env.VITE_PIXABAY_KEY || '',
        unsplash: stored.unsplash || env.VITE_UNSPLASH_KEY || '',
      }
    } catch {
      return {}
    }
  })
  const searchAbortRef = useRef<AbortController | null>(null)
  const [autoEventName, setAutoEventName] = useState('')
  const [autoVariants, setAutoVariants] = useState<AutoVariant[]>([])
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [autoStatus, setAutoStatus] = useState<'idle' | 'empty'>('idle')
  const autoAbortRef = useRef<AbortController | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; layerX: number; layerY: number } | null>(null)
  const threeRibbonRef = useRef<ThreeFlagCanvasHandle | null>(null)
  const threeIconRef = useRef<ThreeFlagCanvasHandle | null>(null)
  // While set, the SVG swaps the live Three.js canvases for a frozen <image>
  // snapshot so html-to-image captures deterministic pixels instead of
  // racing a live WebGL canvas during export.
  const [exportFreeze, setExportFreeze] = useState<{ ribbon?: string; icon?: string } | null>(null)

  useEffect(() => {
    try {
      // Layers hold data URLs which can exceed the localStorage quota; drop them on failure.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, layers: [] }))
      } catch {
        // Storage unavailable — settings simply will not persist.
      }
    }
  }, [state])

  const selectedLayer = state.layers.find((layer) => layer.id === state.selectedLayerId) ?? null
  const cityChips = useMemo(() => findCityBackdrops(cityInput), [cityInput])
  const flagUrl = state.flagCountry.length === 2 ? flagUrlFor(state.flagCountry) : null
  const [flagStripes, setFlagStripes] = useState<FlagStripe[] | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!state.flagCountry || state.flagCountry.length !== 2) {
      setFlagStripes(null)
      return
    }
    // Sample the raster render (SVG can't be pixel-read cross-origin reliably).
    void extractFlagStripes(`https://flagcdn.com/w160/${state.flagCountry}.png`).then((stripes) => {
      if (!cancelled) {
        setFlagStripes(stripes)
      }
    })
    return () => {
      cancelled = true
    }
  }, [state.flagCountry])

  function updateApiKey(key: keyof PhotoSourceKeys, value: string) {
    setApiKeys((prev) => {
      const next = { ...prev, [key]: value.trim() }
      try {
        window.localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Non-fatal: keys just will not persist.
      }
      return next
    })
  }

  async function runSearch(query: string) {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }
    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    setIsSearching(true)
    setSearchStatus('idle')
    try {
      const results = await searchAllSources(trimmed, apiKeys, controller.signal)
      if (controller.signal.aborted) {
        return
      }
      setSearchResults(results)
      setSearchStatus(results.length === 0 ? 'empty' : 'idle')
    } catch {
      if (!controller.signal.aborted) {
        setSearchResults([])
        setSearchStatus('error')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false)
      }
    }
  }

  async function runAutoGenerate() {
    if (!cityInput.trim()) {
      return
    }
    autoAbortRef.current?.abort()
    const controller = new AbortController()
    autoAbortRef.current = controller
    setIsAutoGenerating(true)
    setAutoStatus('idle')
    try {
      const variants = await generateVariants({
        city: cityInput,
        eventName: autoEventName,
        year: state.year,
        callsign: state.plateText,
        flagCountry: state.flagCountry,
        keys: apiKeys,
        signal: controller.signal,
      })
      if (!controller.signal.aborted) {
        setAutoVariants(variants)
        setAutoStatus(variants.length === 0 ? 'empty' : 'idle')
      }
    } catch {
      if (!controller.signal.aborted) {
        setAutoVariants([])
        setAutoStatus('empty')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsAutoGenerating(false)
      }
    }
  }

  async function addCandidateAsLayer(candidate: PhotoCandidate) {
    setIsAddingPhoto(true)
    try {
      let src: string
      try {
        src = await fetchAsDataUrl(candidate.fullUrl)
      } catch {
        src = await fetchAsDataUrl(candidate.thumbUrl)
      }
      const layer = createPhotoLayer(src, candidate.attribution)
      setState((prev) => ({ ...prev, layers: [...prev.layers, layer], selectedLayerId: layer.id }))
    } catch {
      setSearchStatus('error')
    } finally {
      setIsAddingPhoto(false)
    }
  }

  function update<K extends keyof Badge3DState>(key: K, value: Badge3DState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function updateLayer(id: string, patch: Partial<PhotoLayer>) {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    }))
  }

  function moveLayer(id: string, direction: -1 | 1) {
    setState((prev) => {
      const index = prev.layers.findIndex((layer) => layer.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= prev.layers.length) {
        return prev
      }
      const layers = [...prev.layers]
      const [moved] = layers.splice(index, 1)
      layers.splice(target, 0, moved)
      return { ...prev, layers }
    })
  }

  function removeLayer(id: string) {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.filter((layer) => layer.id !== id),
      selectedLayerId: prev.selectedLayerId === id ? null : prev.selectedLayerId,
    }))
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          return
        }
        const layer = createPhotoLayer(reader.result, file.name.replace(/\.[^.]+$/, ''))
        setState((prev) => ({ ...prev, layers: [...prev.layers, layer], selectedLayerId: layer.id }))
      }
      reader.readAsDataURL(file)
    })
  }

  function previewScaleFactor(): number {
    const node = previewRef.current
    if (!node) {
      return 1
    }
    return VB / node.getBoundingClientRect().width
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!selectedLayer) {
      return
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      layerX: selectedLayer.x,
      layerY: selectedLayer.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !state.selectedLayerId) {
      return
    }
    const factor = previewScaleFactor()
    updateLayer(state.selectedLayerId, {
      x: drag.layerX + (event.clientX - drag.startX) * factor,
      y: drag.layerY + (event.clientY - drag.startY) * factor,
    })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!selectedLayer || !state.selectedLayerId) {
      return
    }
    event.preventDefault()
    const next = Math.min(4, Math.max(0.4, selectedLayer.scale * (event.deltaY > 0 ? 0.94 : 1.06)))
    updateLayer(state.selectedLayerId, { scale: next })
  }

  async function exportPng() {
    const node = previewRef.current
    if (!node) {
      return
    }
    setIsExporting(true)
    setErrorMessage('')
    try {
      await document.fonts.ready
      // Freeze any live Three.js flag canvases to a static snapshot before
      // handing the DOM to html-to-image: a live WebGL canvas mid-animation
      // is a race (the exact frame captured is nondeterministic and some
      // html-to-image versions mishandle WebGL context canvases entirely).
      const freeze: { ribbon?: string; icon?: string } = {}
      if (state.ribbon3d) {
        const shot = threeRibbonRef.current?.captureDataUrl()
        if (shot) {
          freeze.ribbon = shot
        }
      }
      if (state.flagIcon3d) {
        const shot = threeIconRef.current?.captureDataUrl()
        if (shot) {
          freeze.icon = shot
        }
      }
      if (freeze.ribbon || freeze.icon) {
        setExportFreeze(freeze)
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)))
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)))
      }
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)))
      const nodeSize = node.getBoundingClientRect().width
      const dataUrl = await toPng(node, { pixelRatio: 800 / nodeSize })
      const image = new Image()
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = dataUrl
      })
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('canvas 2d context unavailable')
      }
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, 0, 0, 200, 200)
      const link = document.createElement('a')
      link.download = `badge3d-${state.year || 'event'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      setErrorMessage(t.exportError)
    } finally {
      setExportFreeze(null)
      setIsExporting(false)
    }
  }

  const outerPath = useMemo(() => shapePath(state.shape, 4), [state.shape])
  const bevelPath = useMemo(() => shapePath(state.shape, 8), [state.shape])
  const pinstripePath = useMemo(
    () => shapePath(state.shape, 4 + state.frameWidth * 0.55),
    [state.shape, state.frameWidth],
  )
  const innerPath = useMemo(
    () => shapePath(state.shape, 4 + state.frameWidth),
    [state.shape, state.frameWidth],
  )
  const metal = FRAME_GRADIENTS[state.frameMaterial]

  // Geometry for the 3D ribbon's foreignObject frame: generous vertical
  // padding so the live cloth wave never clips against the box edges.
  const ribbonFoPad = Math.max(state.ribbonAmplitude * 1.4, 24)
  const ribbonFoY = state.ribbonY - state.ribbonHeight / 2 - ribbonFoPad
  const ribbonFoHeight = state.ribbonHeight + ribbonFoPad * 2
  // World-unit bend amplitude: scales the viewBox-px ribbon amplitude by the
  // same ratio the Three.js plane's fixed world height (2) bears to this
  // foreignObject's viewBox height, so the 3D bend visually matches the SVG one.
  const ribbonBendAmplitude3d = (state.ribbonAmplitude * 2) / ribbonFoHeight
  const ribbonPixelWidth3d = 1024
  const ribbonPixelHeight3d = Math.max(1, Math.round((ribbonPixelWidth3d * ribbonFoHeight) / VB))

  const shapeOptions: Array<[Badge3DShape, string]> = [
    ['circle', t.shapeCircle],
    ['rounded-square', t.shapeRounded],
    ['shield', t.shapeShield],
    ['hexagon', t.shapeHexagon],
  ]
  const materialOptions: Array<[FrameMaterial, string]> = [
    ['silver', t.materialSilver],
    ['gold', t.materialGold],
    ['bronze', t.materialBronze],
    ['navy', t.materialNavy],
  ]
  const maskOptions: Array<[PhotoLayerMask, string]> = [
    ['full', t.maskFull],
    ['bottom', t.maskBottom],
    ['top', t.maskTop],
    ['circle', t.maskCircle],
  ]
  const blendOptions: PhotoLayerBlend[] = ['normal', 'multiply', 'screen', 'overlay', 'luminosity']

  return (
    <>
      <aside className="control-panel">
        {panelHeader}
        {modeTabs}

        <div className="panel-tab-content">
          <div className="tab-panel badge3d-panel">
            <section className="badge3d-section">
              <h3>{t.sectionAuto}</h3>
              <p className="badge3d-hint">{t.autoHint}</p>
              <div className="badge3d-two-fields">
                <label className="field">
                  <span>{t.cityLabel}</span>
                  <input
                    type="text"
                    value={cityInput}
                    placeholder={t.cityPlaceholder}
                    onChange={(e) => setCityInput(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{t.autoEventLabel}</span>
                  <input
                    type="text"
                    value={autoEventName}
                    placeholder={t.autoEventPlaceholder}
                    onChange={(e) => setAutoEventName(e.target.value)}
                  />
                </label>
              </div>
              <button
                className="badge3d-add-photo badge3d-auto-btn"
                type="button"
                disabled={isAutoGenerating || !cityInput.trim()}
                onClick={() => void runAutoGenerate()}
              >
                <Sparkles size={14} />
                <span>{isAutoGenerating ? t.autoGenerating : t.autoButton}</span>
              </button>
              {autoStatus === 'empty' ? <p className="badge3d-empty">{t.autoEmpty}</p> : null}
              {autoVariants.length > 0 ? (
                <div className="badge3d-variant-grid">
                  {autoVariants.map((variant) => (
                    <button
                      key={variant.id}
                      className="badge3d-variant"
                      type="button"
                      title={variant.attribution}
                      onClick={() => setState(variant.state)}
                    >
                      <img src={variant.photoThumb} alt="" loading="lazy" />
                      <span>{locale === 'ru' ? variant.themeLabelRu : variant.themeLabelEn}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="badge3d-section">
              <h3>{t.sectionPresets}</h3>
              <div className="badge3d-chip-row">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className="badge3d-chip"
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, ...preset.patch }))}
                  >
                    {locale === 'ru' ? preset.labelRu : preset.labelEn}
                  </button>
                ))}
              </div>
            </section>

            <section className="badge3d-section">
              <h3>{t.sectionShape}</h3>
              <div className="badge3d-choice-grid" role="group" aria-label={t.sectionShape}>
                {shapeOptions.map(([shape, label]) => (
                  <button
                    key={shape}
                    className={`badge3d-choice${state.shape === shape ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => update('shape', shape)}
                    aria-pressed={state.shape === shape}
                  >
                    <svg viewBox={`0 0 ${VB} ${VB}`} aria-hidden="true">
                      <path d={shapePath(shape, 20)} fill="currentColor" />
                    </svg>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="badge3d-choice-grid" role="group" aria-label="Material">
                {materialOptions.map(([material, label]) => (
                  <button
                    key={material}
                    className={`badge3d-choice badge3d-material-${material}${state.frameMaterial === material ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => update('frameMaterial', material)}
                    aria-pressed={state.frameMaterial === material}
                  >
                    <span className="badge3d-material-swatch" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <label className="field">
                <span>{t.frameAccent}</span>
                <input type="color" value={state.frameAccent} onChange={(e) => update('frameAccent', e.target.value)} />
              </label>
              <label className="field">
                <span>{t.frameWidth}: {state.frameWidth}px</span>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={1}
                  value={state.frameWidth}
                  onChange={(e) => update('frameWidth', Number(e.target.value))}
                />
              </label>
            </section>

            <section className="badge3d-section">
              <h3>{t.sectionSearch}</h3>
              <div className="badge3d-two-fields">
                <label className="field">
                  <span>{t.cityLabel}</span>
                  <input
                    type="text"
                    value={cityInput}
                    placeholder={t.cityPlaceholder}
                    onChange={(e) => setCityInput(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{t.queryLabel}</span>
                  <input
                    type="text"
                    value={searchQuery}
                    placeholder={t.queryPlaceholder}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void runSearch(searchQuery)
                      }
                    }}
                  />
                </label>
              </div>
              {cityChips ? (
                <div className="badge3d-chip-row">
                  {cityChips.chips.map((chip) => (
                    <button
                      key={chip.query}
                      className="badge3d-chip"
                      type="button"
                      onClick={() => {
                        setSearchQuery(chip.query)
                        void runSearch(chip.query)
                      }}
                    >
                      {locale === 'ru' ? chip.label : chip.labelEn}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                className="badge3d-add-photo"
                type="button"
                disabled={isSearching}
                onClick={() => void runSearch(searchQuery)}
              >
                <Search size={14} />
                <span>{isSearching ? t.searching : t.searchButton}</span>
              </button>
              {searchStatus === 'empty' ? <p className="badge3d-empty">{t.searchEmpty}</p> : null}
              {searchStatus === 'error' ? <p className="badge3d-empty">{t.searchError}</p> : null}
              {isAddingPhoto ? <p className="badge3d-empty">{t.addingPhoto}</p> : null}
              {searchResults.length > 0 ? (
                <div className="badge3d-results-grid">
                  {searchResults.map((candidate) => (
                    <button
                      key={candidate.id}
                      className="badge3d-result"
                      type="button"
                      title={`${candidate.title} — ${candidate.attribution}`}
                      disabled={isAddingPhoto}
                      onClick={() => void addCandidateAsLayer(candidate)}
                    >
                      <img
                        src={candidate.thumbUrl}
                        alt={candidate.title}
                        loading="lazy"
                        onError={(e) => {
                          const tile = e.currentTarget.closest('.badge3d-result') as HTMLElement | null
                          if (tile) {
                            tile.style.display = 'none'
                          }
                        }}
                      />
                      <span>{candidate.sourceLabel}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <details className="badge3d-keys">
                <summary>{t.apiKeysLabel}</summary>
                <p className="badge3d-hint">{t.apiKeysHelp}</p>
                <label className="field">
                  <span>Pexels</span>
                  <input type="text" value={apiKeys.pexels ?? ''} onChange={(e) => updateApiKey('pexels', e.target.value)} />
                </label>
                <label className="field">
                  <span>Pixabay</span>
                  <input type="text" value={apiKeys.pixabay ?? ''} onChange={(e) => updateApiKey('pixabay', e.target.value)} />
                </label>
                <label className="field">
                  <span>Unsplash</span>
                  <input type="text" value={apiKeys.unsplash ?? ''} onChange={(e) => updateApiKey('unsplash', e.target.value)} />
                </label>
              </details>
            </section>

            <section className="badge3d-section">
              <h3>{t.sectionLayers}</h3>
              <button className="badge3d-add-photo" type="button" onClick={() => fileInputRef.current?.click()}>
                <Plus size={14} />
                <span>{t.addPhoto}</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />

              {state.layers.length === 0 ? (
                <p className="badge3d-empty">{t.layersEmpty}</p>
              ) : (
                <ul className="badge3d-layer-list">
                  {[...state.layers].reverse().map((layer) => (
                    <li key={layer.id}>
                      <button
                        className={`badge3d-layer-row${layer.id === state.selectedLayerId ? ' is-active' : ''}`}
                        type="button"
                        onClick={() => update('selectedLayerId', layer.id)}
                      >
                        <img src={layer.src} alt="" />
                        <span className="badge3d-layer-name">{layer.label}</span>
                      </button>
                      <span className="badge3d-layer-tools">
                        <button type="button" onClick={() => updateLayer(layer.id, { visible: !layer.visible })} aria-label={t.opacity}>
                          {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <button type="button" onClick={() => moveLayer(layer.id, 1)} aria-label="up">
                          <ChevronUp size={13} />
                        </button>
                        <button type="button" onClick={() => moveLayer(layer.id, -1)} aria-label="down">
                          <ChevronDown size={13} />
                        </button>
                        <button type="button" onClick={() => removeLayer(layer.id)} aria-label="delete">
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {selectedLayer ? (
                <div className="badge3d-layer-settings">
                  <p className="badge3d-hint">{t.dragHint}</p>
                  <span className="badge3d-subhead">{t.layerMask}</span>
                  <div className="badge3d-choice-grid">
                    {maskOptions.map(([mask, label]) => (
                      <button
                        key={mask}
                        className={`badge3d-choice${selectedLayer.mask === mask ? ' is-active' : ''}`}
                        type="button"
                        onClick={() => updateLayer(selectedLayer.id, { mask })}
                        aria-pressed={selectedLayer.mask === mask}
                      >
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    <span>{t.feather}: {selectedLayer.feather}px</span>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={4}
                      value={selectedLayer.feather}
                      onChange={(e) => updateLayer(selectedLayer.id, { feather: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>{t.opacity}: {Math.round(selectedLayer.opacity * 100)}%</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={selectedLayer.opacity}
                      onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>{t.blend}</span>
                    <select
                      value={selectedLayer.blend}
                      onChange={(e) => updateLayer(selectedLayer.id, { blend: e.target.value as PhotoLayerBlend })}
                    >
                      {blendOptions.map((blend) => (
                        <option key={blend} value={blend}>{blend}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t.brightness}: {selectedLayer.brightness.toFixed(2)}</span>
                    <input
                      type="range"
                      min={0.4}
                      max={1.6}
                      step={0.05}
                      value={selectedLayer.brightness}
                      onChange={(e) => updateLayer(selectedLayer.id, { brightness: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>{t.contrast}: {selectedLayer.contrast.toFixed(2)}</span>
                    <input
                      type="range"
                      min={0.4}
                      max={1.6}
                      step={0.05}
                      value={selectedLayer.contrast}
                      onChange={(e) => updateLayer(selectedLayer.id, { contrast: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>{t.saturation}: {selectedLayer.saturation.toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={selectedLayer.saturation}
                      onChange={(e) => updateLayer(selectedLayer.id, { saturation: Number(e.target.value) })}
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="badge3d-section">
              <h3>{t.sectionBackground}</h3>
              <div className="badge3d-two-fields">
                <label className="field">
                  <span>{t.bgTop}</span>
                  <input type="color" value={state.bgTop} onChange={(e) => update('bgTop', e.target.value)} />
                </label>
                <label className="field">
                  <span>{t.bgBottom}</span>
                  <input type="color" value={state.bgBottom} onChange={(e) => update('bgBottom', e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>{t.scrimOpacity}: {Math.round(state.scrimOpacity * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={state.scrimOpacity}
                  onChange={(e) => update('scrimOpacity', Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span>{t.scrimHeight}: {state.scrimHeight}%</span>
                <input
                  type="range"
                  min={20}
                  max={80}
                  step={5}
                  value={state.scrimHeight}
                  onChange={(e) => update('scrimHeight', Number(e.target.value))}
                />
              </label>
            </section>

            <section className="badge3d-section">
              <h3>{t.sectionRibbon}</h3>
              <div className="badge3d-choice-grid badge3d-choice-grid-5">
                {([
                  ['none', t.ribbonNone],
                  ['bottom', t.ribbonBottom],
                  ['sides', t.ribbonSides],
                  ['left', t.ribbonLeft],
                  ['right', t.ribbonRight],
                ] as Array<[RibbonPlacement, string]>).map(([placement, label]) => (
                  <button
                    key={placement}
                    className={`badge3d-choice${state.ribbonPlacement === placement ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => update('ribbonPlacement', placement)}
                    aria-pressed={state.ribbonPlacement === placement}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <label className="field">
                <span>{t.flagLabel}</span>
                <input
                  type="text"
                  value={state.flagCountry}
                  maxLength={2}
                  onChange={(e) => update('flagCountry', e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                />
              </label>
              {state.ribbonPlacement === 'bottom' ? (
                <>
                  <div className="badge3d-choice-grid">
                    {AUTHORED_CURVES.map((curve, index) => (
                      <button
                        key={curve.id}
                        className={`badge3d-choice${(state.ribbonCurve ?? 0) === index ? ' is-active' : ''}`}
                        type="button"
                        onClick={() => update('ribbonCurve', index)}
                        aria-pressed={(state.ribbonCurve ?? 0) === index}
                      >
                        <svg viewBox="0 0 60 24" aria-hidden="true" style={{ width: 44, height: 18 }}>
                          <path
                            d={curve.points
                              .map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${(px * 60).toFixed(1)} ${(12 + py * 9).toFixed(1)}`)
                              .join(' ')}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{locale === 'ru' ? curve.labelRu : curve.labelEn}</span>
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    <span>{t.amplitudeLabel}: {state.ribbonAmplitude}</span>
                    <input type="range" min={4} max={30} step={1} value={state.ribbonAmplitude} onChange={(e) => update('ribbonAmplitude', Number(e.target.value))} />
                  </label>
                  <div className="badge3d-two-fields">
                    <label className="field">
                      <span>{t.ribbonHeightLabel}: {state.ribbonHeight}</span>
                      <input type="range" min={28} max={90} step={2} value={state.ribbonHeight} onChange={(e) => update('ribbonHeight', Number(e.target.value))} />
                    </label>
                    <label className="field">
                      <span>{t.positionYLabel}: {state.ribbonY}</span>
                      <input type="range" min={360} max={500} step={2} value={state.ribbonY} onChange={(e) => update('ribbonY', Number(e.target.value))} />
                    </label>
                  </div>
                  <label className="field badge3d-checkbox">
                    <input
                      type="checkbox"
                      checked={state.ribbon3d}
                      onChange={(e) => setState((prev) => ({ ...prev, ribbon3d: e.target.checked, flagIcon3d: e.target.checked ? false : prev.flagIcon3d }))}
                    />
                    <span>{t.super3dLabel}</span>
                  </label>
                </>
              ) : null}
              {state.ribbon3d || state.flagIcon3d ? (
                <>
                  <p className="badge3d-hint">{t.super3dHint}</p>
                  <span className="badge3d-subhead">{t.wavePresetLabel}</span>
                  <div className="badge3d-choice-grid">
                    {([
                      ['gentle', t.wavePresetGentle],
                      ['medium', t.wavePresetMedium],
                      ['wild', t.wavePresetWild],
                    ] as Array<[FlagWavePresetId, string]>).map(([preset, label]) => (
                      <button
                        key={preset}
                        className={`badge3d-choice${state.flagWavePreset === preset ? ' is-active' : ''}`}
                        type="button"
                        onClick={() => update('flagWavePreset', preset)}
                        aria-pressed={state.flagWavePreset === preset}
                      >
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </section>

            <section className="badge3d-section">
              <h3>{t.sectionPlane}</h3>
              <label className="field badge3d-checkbox">
                <input type="checkbox" checked={state.planeEnabled} onChange={(e) => update('planeEnabled', e.target.checked)} />
                <span>{t.planeLabel}</span>
              </label>
              {state.planeEnabled ? (
                <>
                  <div className="badge3d-choice-grid">
                    {([
                      ['arc', t.planeArc],
                      ['climb', t.planeClimb],
                      ['loop', t.planeLoop],
                    ] as Array<[ContrailVariant, string]>).map(([variant, label]) => (
                      <button
                        key={variant}
                        className={`badge3d-choice${state.planeVariant === variant ? ' is-active' : ''}`}
                        type="button"
                        onClick={() => update('planeVariant', variant)}
                        aria-pressed={state.planeVariant === variant}
                      >
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="badge3d-two-fields">
                    <label className="field">
                      <span>X: {state.planeX}</span>
                      <input type="range" min={80} max={470} step={4} value={state.planeX} onChange={(e) => update('planeX', Number(e.target.value))} />
                    </label>
                    <label className="field">
                      <span>Y: {state.planeY}</span>
                      <input type="range" min={40} max={220} step={4} value={state.planeY} onChange={(e) => update('planeY', Number(e.target.value))} />
                    </label>
                  </div>
                  <label className="field">
                    <span>{t.planeScaleLabel}: {state.planeScale.toFixed(2)}</span>
                    <input type="range" min={0.4} max={1.6} step={0.05} value={state.planeScale} onChange={(e) => update('planeScale', Number(e.target.value))} />
                  </label>
                </>
              ) : null}
              <label className="field badge3d-checkbox">
                <input type="checkbox" checked={state.wingsTopEnabled} onChange={(e) => update('wingsTopEnabled', e.target.checked)} />
                <span>{t.wingsTopLabel}</span>
              </label>
              <label className="field badge3d-checkbox">
                <input type="checkbox" checked={state.flagIconEnabled} onChange={(e) => update('flagIconEnabled', e.target.checked)} />
                <span>{t.flagIconLabel}</span>
              </label>
              {state.flagIconEnabled ? (
                <>
                  <div className="badge3d-two-fields">
                    <label className="field">
                      <span>X: {state.flagIconX}</span>
                      <input type="range" min={40} max={472} step={4} value={state.flagIconX} onChange={(e) => update('flagIconX', Number(e.target.value))} />
                    </label>
                    <label className="field">
                      <span>Y: {state.flagIconY}</span>
                      <input type="range" min={40} max={472} step={4} value={state.flagIconY} onChange={(e) => update('flagIconY', Number(e.target.value))} />
                    </label>
                  </div>
                  <label className="field">
                    <span>{t.flagIconScaleLabel}: {state.flagIconScale.toFixed(2)}</span>
                    <input type="range" min={0.4} max={2.2} step={0.05} value={state.flagIconScale} onChange={(e) => update('flagIconScale', Number(e.target.value))} />
                  </label>
                  <label className="field badge3d-checkbox">
                    <input
                      type="checkbox"
                      checked={state.flagIcon3d}
                      onChange={(e) => setState((prev) => ({ ...prev, flagIcon3d: e.target.checked, ribbon3d: e.target.checked ? false : prev.ribbon3d }))}
                    />
                    <span>{t.super3dLabel}</span>
                  </label>
                </>
              ) : null}
            </section>

            <section className="badge3d-section">
              <h3>{t.sectionText}</h3>
              <label className="field">
                <span>{t.yearLabel}</span>
                <input type="text" value={state.year} maxLength={8} onChange={(e) => update('year', e.target.value)} />
              </label>
              <div className="badge3d-two-fields">
                <label className="field">
                  <span>{t.fontLabel}</span>
                  <select value={state.yearFont} onChange={(e) => update('yearFont', e.target.value)}>
                    {BADGE_FONTS.map((font) => (
                      <option key={font.family} value={font.family}>
                        {font.label}{font.cyrillic ? '' : ` (${t.latinOnly})`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t.materialLabel}</span>
                  <select value={state.yearMaterial} onChange={(e) => update('yearMaterial', e.target.value as TextMaterialId)}>
                    {TEXT_MATERIALS.map((material) => (
                      <option key={material.id} value={material.id}>
                        {locale === 'ru' ? material.labelRu : material.labelEn}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>{t.sizeLabel}: {state.yearSize}px</span>
                <input type="range" min={60} max={180} step={2} value={state.yearSize} onChange={(e) => update('yearSize', Number(e.target.value))} />
              </label>
              <div className="badge3d-two-fields">
                <label className="field">
                  <span>{t.depthLabel}: {state.yearDepth}</span>
                  <input type="range" min={0} max={16} step={1} value={state.yearDepth} onChange={(e) => update('yearDepth', Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>{t.archLabel}: {state.yearArch}</span>
                  <input type="range" min={0} max={24} step={1} value={state.yearArch} onChange={(e) => update('yearArch', Number(e.target.value))} />
                </label>
              </div>
              <label className="field">
                <span>{t.positionYLabel}: {state.yearY}</span>
                <input type="range" min={140} max={420} step={2} value={state.yearY} onChange={(e) => update('yearY', Number(e.target.value))} />
              </label>
              <label className="field">
                <span>{t.line2Label}</span>
                <input type="text" value={state.line2} maxLength={26} onChange={(e) => update('line2', e.target.value)} />
              </label>
              <div className="badge3d-two-fields">
                <label className="field">
                  <span>{t.fontLabel}</span>
                  <select value={state.line2Font} onChange={(e) => update('line2Font', e.target.value)}>
                    {BADGE_FONTS.map((font) => (
                      <option key={font.family} value={font.family}>
                        {font.label}{font.cyrillic ? '' : ` (${t.latinOnly})`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t.materialLabel}</span>
                  <select value={state.line2Material} onChange={(e) => update('line2Material', e.target.value as TextMaterialId)}>
                    {TEXT_MATERIALS.map((material) => (
                      <option key={material.id} value={material.id}>
                        {locale === 'ru' ? material.labelRu : material.labelEn}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="badge3d-two-fields">
                <label className="field">
                  <span>{t.sizeLabel}: {state.line2Size}px</span>
                  <input type="range" min={16} max={56} step={1} value={state.line2Size} onChange={(e) => update('line2Size', Number(e.target.value))} />
                </label>
                <label className="field badge3d-checkbox">
                  <input type="checkbox" checked={state.line2Wings} onChange={(e) => update('line2Wings', e.target.checked)} />
                  <span>{t.wingsLabel}</span>
                </label>
              </div>
              <label className="field">
                <span>{t.plateLabel}</span>
                <input type="text" value={state.plateText} maxLength={12} onChange={(e) => update('plateText', e.target.value)} />
              </label>
            </section>
          </div>
        </div>
      </aside>

      <main className="preview-panel">
        <div className="preview-header">
          <div>
            <span className="preview-label">{t.previewLabel}</span>
            <h2>{t.previewTitle}</h2>
          </div>
          <div className="preview-header-right">
            <span className="resolution-chip">200×200</span>
            <button
              className="preview-export-btn"
              type="button"
              onClick={() => void exportPng()}
              disabled={isExporting}
              aria-label={t.exportButton}
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        <div className="preview-frame badge3d-preview-frame">
          <div
            ref={previewRef}
            className="badge3d-preview"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%" role="img" aria-label={t.previewTitle}>
              <defs>
                <linearGradient id="b3d-metal" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={metal[0]} />
                  <stop offset="0.35" stopColor={metal[1]} />
                  <stop offset="0.7" stopColor={metal[2]} />
                  <stop offset="1" stopColor={metal[3]} />
                </linearGradient>
                <linearGradient id="b3d-bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={state.bgTop} />
                  <stop offset="1" stopColor={state.bgBottom} />
                </linearGradient>
                <linearGradient id="b3d-scrim" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#04101f" stopOpacity="0" />
                  <stop offset="0.45" stopColor="#04101f" stopOpacity={state.scrimOpacity * 0.65} />
                  <stop offset="1" stopColor="#04101f" stopOpacity={state.scrimOpacity} />
                </linearGradient>
                {/* A mask instead of clipPath: html-to-image drops clip-path url() refs during export. */}
                <mask id="b3d-content-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={VB} height={VB}>
                  <path d={innerPath} fill="#ffffff" />
                </mask>
                <filter id="b3d-shadow" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#020a14" floodOpacity="0.5" />
                </filter>
                {/* Sheen sweeping across the metal frame ring. */}
                <linearGradient id="b3d-frame-sheen" x1="0" y1="0" x2="0.6" y2="1">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
                  <stop offset="0.28" stopColor="#ffffff" stopOpacity="0.1" />
                  <stop offset="0.55" stopColor="#000000" stopOpacity="0.12" />
                  <stop offset="0.8" stopColor="#ffffff" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
                </linearGradient>
                {/* Ring-only mask: outer shape minus content window. */}
                <mask id="b3d-frame-ring" maskUnits="userSpaceOnUse" x="0" y="0" width={VB} height={VB}>
                  <path d={outerPath} fill="#ffffff" />
                  <path d={innerPath} fill="#000000" />
                </mask>
                {/* Inner shadow so the photo sits "inside" the frame. */}
                <linearGradient id="b3d-inner-shade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#020a14" stopOpacity="0.55" />
                  <stop offset="0.12" stopColor="#020a14" stopOpacity="0" />
                  <stop offset="0.86" stopColor="#020a14" stopOpacity="0" />
                  <stop offset="1" stopColor="#020a14" stopOpacity="0.4" />
                </linearGradient>
                {state.layers.map((layer) => {
                  if (layer.mask === 'full') {
                    return null
                  }
                  const featherRatio = Math.min(0.45, layer.feather / VB)
                  if (layer.mask === 'circle') {
                    return (
                      <radialGradient key={layer.id} id={`b3d-maskgrad-${layer.id}`} cx="0.5" cy="0.5" r="0.5">
                        <stop offset={Math.max(0, 0.98 - featherRatio * 2.2)} stopColor="#ffffff" />
                        <stop offset="1" stopColor="#000000" />
                      </radialGradient>
                    )
                  }
                  const from = layer.mask === 'bottom' ? 0.42 : 0.58
                  const stops = layer.mask === 'bottom'
                    ? [
                        <stop key="a" offset={Math.max(0, from - featherRatio)} stopColor="#000000" />,
                        <stop key="b" offset={Math.min(1, from + featherRatio)} stopColor="#ffffff" />,
                      ]
                    : [
                        <stop key="a" offset={Math.max(0, from - featherRatio)} stopColor="#ffffff" />,
                        <stop key="b" offset={Math.min(1, from + featherRatio)} stopColor="#000000" />,
                      ]
                  return (
                    <linearGradient key={layer.id} id={`b3d-maskgrad-${layer.id}`} x1="0" y1="0" x2="0" y2="1">
                      {stops}
                    </linearGradient>
                  )
                })}
                {state.layers.map((layer) => (
                  layer.mask === 'full' ? null : (
                    <mask key={layer.id} id={`b3d-mask-${layer.id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={VB} height={VB}>
                      <rect x="0" y="0" width={VB} height={VB} fill={`url(#b3d-maskgrad-${layer.id})`} />
                    </mask>
                  )
                ))}
              </defs>

              <g filter="url(#b3d-shadow)">
                <path d={outerPath} fill="url(#b3d-metal)" stroke="#0a1526" strokeWidth="2" />
                {/* Directional sheen across the ring only. */}
                <rect x="0" y="0" width={VB} height={VB} fill="url(#b3d-frame-sheen)" mask="url(#b3d-frame-ring)" />
                <path d={bevelPath} fill="none" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="2" />
                <path d={pinstripePath} fill="none" stroke={state.frameAccent} strokeWidth="3.5" />
                <path d={pinstripePath} fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" transform="translate(0 -1.2)" />

                <g mask="url(#b3d-content-mask)">
                  <rect x="0" y="0" width={VB} height={VB} fill="url(#b3d-bg)" />
                  {state.layers.map((layer) => {
                    if (!layer.visible) {
                      return null
                    }
                    const size = VB * layer.scale
                    return (
                      <g
                        key={layer.id}
                        mask={layer.mask === 'full' ? undefined : `url(#b3d-mask-${layer.id})`}
                        opacity={layer.opacity}
                        style={{ mixBlendMode: layer.blend === 'normal' ? undefined : layer.blend }}
                      >
                        <image
                          href={layer.src}
                          x={CENTER - size / 2 + layer.x}
                          y={CENTER - size / 2 + layer.y}
                          width={size}
                          height={size}
                          preserveAspectRatio="xMidYMid slice"
                          style={{
                            filter: `brightness(${layer.brightness}) contrast(${layer.contrast}) saturate(${layer.saturation})`,
                          }}
                        />
                      </g>
                    )
                  })}
                  <rect
                    x="0"
                    y={VB - (VB * state.scrimHeight) / 100}
                    width={VB}
                    height={(VB * state.scrimHeight) / 100}
                    fill="url(#b3d-scrim)"
                  />
                  {/* Inner shadow: content recessed behind the frame. */}
                  <rect x="0" y="0" width={VB} height={VB} fill="url(#b3d-inner-shade)" />
                </g>

                {/* Plane with contrail (above photos, below text). */}
                {state.planeEnabled ? (
                  <g mask="url(#b3d-content-mask)">
                    <g transform={`translate(${state.planeX} ${state.planeY}) scale(${state.planeScale})`}>
                      <PlaneWithContrail variant={state.planeVariant} idSuffix="main" />
                    </g>
                  </g>
                ) : null}

                {/* Flag ribbons: bottom wave is masked to the badge content;
                    side ribbons intentionally overlap the frame for depth. */}
                {flagUrl && state.ribbonPlacement === 'bottom' ? (
                  <g mask="url(#b3d-content-mask)">
                    {state.ribbon3d ? (
                      exportFreeze?.ribbon ? (
                        <image
                          href={exportFreeze.ribbon}
                          x={0}
                          y={ribbonFoY}
                          width={VB}
                          height={ribbonFoHeight}
                          preserveAspectRatio="none"
                        />
                      ) : (
                        <foreignObject x={0} y={ribbonFoY} width={VB} height={ribbonFoHeight}>
                          <div className="badge3d-three-host">
                            <ThreeFlagCanvas
                              ref={threeRibbonRef}
                              countryCode={state.flagCountry}
                              wavePreset={state.flagWavePreset}
                              pixelWidth={ribbonPixelWidth3d}
                              pixelHeight={ribbonPixelHeight3d}
                              bendPoints={AUTHORED_CURVES[state.ribbonCurve]?.points}
                              bendAmplitude={ribbonBendAmplitude3d}
                              className="badge3d-three-canvas"
                            />
                          </div>
                        </foreignObject>
                      )
                    ) : (
                      <FlagWaveBand
                        flagUrl={flagUrl}
                        cy={state.ribbonY}
                        height={state.ribbonHeight}
                        amplitude={state.ribbonAmplitude}
                        waves={state.ribbonWaves}
                        idSuffix="bottom"
                        stripes={flagStripes}
                        curveIndex={state.ribbonCurve}
                      />
                    )}
                  </g>
                ) : null}
                {flagUrl && (state.ribbonPlacement === 'sides' || state.ribbonPlacement === 'left') ? (
                  <SideRibbon flagUrl={flagUrl} side="left" idSuffix="left" stripes={flagStripes} />
                ) : null}
                {flagUrl && (state.ribbonPlacement === 'sides' || state.ribbonPlacement === 'right') ? (
                  <SideRibbon flagUrl={flagUrl} side="right" idSuffix="right" stripes={flagStripes} />
                ) : null}

                {/* Standalone waving flag: pre-drawn Flagpedia artwork, or a
                    live-lit Three.js cloth render in 3D mode. */}
                {state.flagIconEnabled && state.flagCountry.length === 2 ? (
                  <g transform={`translate(${state.flagIconX} ${state.flagIconY}) scale(${state.flagIconScale})`}>
                    {state.flagIcon3d ? (
                      exportFreeze?.icon ? (
                        <image
                          href={exportFreeze.icon}
                          x={-64}
                          y={-48}
                          width={128}
                          height={96}
                          style={{ filter: 'drop-shadow(0 5px 6px rgba(2,10,20,0.55))' }}
                        />
                      ) : (
                        <foreignObject x={-64} y={-48} width={128} height={96} style={{ overflow: 'visible' }}>
                          <div className="badge3d-three-host badge3d-three-host-shadow">
                            <ThreeFlagCanvas
                              ref={threeIconRef}
                              countryCode={state.flagCountry}
                              wavePreset={state.flagWavePreset}
                              pixelWidth={480}
                              pixelHeight={360}
                              className="badge3d-three-canvas"
                            />
                          </div>
                        </foreignObject>
                      )
                    ) : (
                      <image
                        href={flagWavingUrlFor(state.flagCountry)}
                        x={-64}
                        y={-48}
                        width={128}
                        height={96}
                        style={{ filter: 'drop-shadow(0 5px 6px rgba(2,10,20,0.55))' }}
                      />
                    )}
                  </g>
                ) : null}

                {/* Wings emblem at the top. */}
                {state.wingsTopEnabled ? (
                  <g transform={`translate(${CENTER} 58) scale(1.15)`}>
                    <WingsEmblem idSuffix="top" />
                  </g>
                ) : null}

                {/* 3D year. */}
                <Text3D
                  text={state.year}
                  x={CENTER}
                  y={state.yearY}
                  size={state.yearSize}
                  fontFamily={state.yearFont}
                  material={state.yearMaterial}
                  depth={state.yearDepth}
                  arch={state.yearArch}
                  idSuffix="year"
                />

                {/* Second line with optional wing separators. */}
                {state.line2 ? (
                  <g>
                    <Text3D
                      text={state.line2}
                      x={CENTER}
                      y={state.yearY + state.yearSize * 0.42}
                      size={state.line2Size}
                      fontFamily={state.line2Font}
                      material={state.line2Material}
                      depth={Math.min(3, Math.round(state.yearDepth / 3))}
                      letterSpacing={3}
                      idSuffix="line2"
                    />
                    {state.line2Wings ? (
                      <>
                        <g transform={`translate(${CENTER - state.line2.length * state.line2Size * 0.34 - 20} ${state.yearY + state.yearSize * 0.42 - state.line2Size * 0.3})`}>
                          <WingSeparator side="left" />
                        </g>
                        <g transform={`translate(${CENTER + state.line2.length * state.line2Size * 0.34 + 20} ${state.yearY + state.yearSize * 0.42 - state.line2Size * 0.3})`}>
                          <WingSeparator side="right" />
                        </g>
                      </>
                    ) : null}
                  </g>
                ) : null}

                {/* Plate with callsign + flag chip: metal bezel, inner glow,
                    screws, glass sheen. */}
                {state.plateText ? (
                  <g>
                    <defs>
                      <linearGradient id="b3d-plate-face" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#1a3157" />
                        <stop offset="0.5" stopColor="#101f3c" />
                        <stop offset="1" stopColor="#0a1630" />
                      </linearGradient>
                      <linearGradient id="b3d-plate-sheen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
                        <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.02" />
                        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Drop shadow under the plate. */}
                    <rect x={CENTER - 118} y={CENTER + 127} width="236" height="60" rx="16" fill="#020a14" opacity="0.45" />
                    {/* Metal bezel. */}
                    <rect x={CENTER - 122} y={CENTER + 120} width="244" height="64" rx="18" fill="url(#b3d-metal)" stroke="#0a1526" strokeWidth="1.5" />
                    {/* Face. */}
                    <rect x={CENTER - 115} y={CENTER + 127} width="230" height="50" rx="13" fill="url(#b3d-plate-face)" />
                    {/* Inner accent line. */}
                    <rect x={CENTER - 111} y={CENTER + 131} width="222" height="42" rx="10" fill="none" stroke={state.frameAccent} strokeOpacity="0.5" strokeWidth="1.2" />
                    {/* Screws. */}
                    {[-104, 104].map((dx) => (
                      <g key={dx} transform={`translate(${CENTER + dx} ${CENTER + 152})`}>
                        <circle r="4" fill="url(#b3d-metal)" stroke="#0a1526" strokeWidth="0.8" />
                        <line x1="-2" y1="0" x2="2" y2="0" stroke="#0a1526" strokeWidth="1" transform={`rotate(${dx > 0 ? 60 : -30})`} />
                      </g>
                    ))}
                    <text
                      x={state.flagCountry ? CENTER - 24 : CENTER}
                      y={CENTER + 166}
                      fontFamily="'Oswald', sans-serif"
                      fontSize="38"
                      fontWeight="700"
                      letterSpacing="3"
                      textAnchor="middle"
                      fill="#f5f8ff"
                    >
                      {state.plateText}
                    </text>
                    {state.flagCountry ? (
                      <image
                        href={flagWavingUrlFor(state.flagCountry)}
                        x={CENTER + 46}
                        y={CENTER + 130}
                        width="62"
                        height="46"
                        style={{ filter: 'drop-shadow(0 2px 3px rgba(2,10,20,0.6))' }}
                      />
                    ) : null}
                    {/* Glass sheen on the upper half. */}
                    <rect x={CENTER - 115} y={CENTER + 127} width="230" height="24" rx="12" fill="url(#b3d-plate-sheen)" />
                  </g>
                ) : null}
              </g>
            </svg>
          </div>
        </div>
        {errorMessage ? <p className="badge3d-error">{errorMessage}</p> : null}
      </main>
    </>
  )
}
