import { type ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo'
import { toPng } from 'html-to-image'
import countries from 'i18n-iso-countries'
import { feature } from 'topojson-client'
import './App.css'
import airportsData from 'airports-data/airports.json'
import worldLandAtlas from 'world-atlas/land-110m.json'
import defaultBackgroundAsset from './assets/saint-petersburg-default.jpg'
import enLocale from 'i18n-iso-countries/langs/en.json'

countries.registerLocale(enLocale)

type Locale = 'ru' | 'en'

const brandSourceMap = {
  nordwind: 'vnws',
  rag: 'rag',
} as const

type EventType =
  | 'focus-airport'
  | 'tour'
  | 'roster'
  | 'curated-roster'
  | 'community-challenge'
  | 'community-goal'

type RouteEventType = 'tour' | 'roster' | 'curated-roster'

type CommunityEventType = 'community-challenge' | 'community-goal'

type ChallengeCountType = 'passengers' | 'freight' | 'flights' | 'distance' | 'flight-time'

type BrandKey = 'nordwind' | 'rag'

type AircraftSource = 'vnws' | 'rag'

type BonusField =
  | 'focusBonusPoints'
  | 'tourBonusPoints'
  | 'rosterBonusPoints'
  | 'curatedRosterBonusPoints'
  | 'challengeBonusPoints'
  | 'communityGoalBonusPoints'

type RegistrationField =
  | 'focusRegistrationRequired'
  | 'tourRegistrationRequired'
  | 'rosterRegistrationRequired'
  | 'curatedRosterRegistrationRequired'
  | 'challengeRegistrationRequired'
  | 'communityGoalRegistrationRequired'

type AircraftEnabledField = 'rosterAircraftEnabled' | 'curatedRosterAircraftEnabled'

type AircraftSearchField = 'rosterAircraftSearch' | 'curatedRosterAircraftSearch'

type AircraftSourceField = 'rosterAircraftSource' | 'curatedRosterAircraftSource'

type AircraftIdField = 'rosterAircraftId' | 'curatedRosterAircraftId'

type AircraftNameField = 'rosterAircraftName' | 'curatedRosterAircraftName'

type AircraftRegistrationField = 'rosterAircraftRegistration' | 'curatedRosterAircraftRegistration'

type AircraftPhotoUrlField = 'rosterAircraftPhotoUrl' | 'curatedRosterAircraftPhotoUrl'

type AircraftPhotoAttributionField = 'rosterAircraftPhotoAttribution' | 'curatedRosterAircraftPhotoAttribution'

type AircraftPhotoLinkbackField = 'rosterAircraftPhotoLinkback' | 'curatedRosterAircraftPhotoLinkback'

type BannerFormState = {
  city: string
  countryCode: string
  icao: string
  airportName: string
  focusBonusPoints: string
  focusRegistrationRequired: boolean
  tourTitle: string
  tourLegs: string
  tourDescription: string
  tourBonusPoints: string
  tourRegistrationRequired: boolean
  rosterTitle: string
  rosterLegs: string
  rosterDescription: string
  rosterBonusPoints: string
  rosterRegistrationRequired: boolean
  rosterAircraftEnabled: boolean
  rosterAircraftSearch: string
  rosterAircraftSource: string
  rosterAircraftId: string
  rosterAircraftName: string
  rosterAircraftRegistration: string
  rosterAircraftPhotoUrl: string
  rosterAircraftPhotoAttribution: string
  rosterAircraftPhotoLinkback: string
  curatedRosterTitle: string
  curatedRosterLegs: string
  curatedRosterDescription: string
  curatedRosterBonusPoints: string
  curatedRosterRegistrationRequired: boolean
  curatedRosterAircraftEnabled: boolean
  curatedRosterAircraftSearch: string
  curatedRosterAircraftSource: string
  curatedRosterAircraftId: string
  curatedRosterAircraftName: string
  curatedRosterAircraftRegistration: string
  curatedRosterAircraftPhotoUrl: string
  curatedRosterAircraftPhotoAttribution: string
  curatedRosterAircraftPhotoLinkback: string
  challengeName: string
  challengeBonusPoints: string
  challengeRegistrationRequired: boolean
  communityGoalName: string
  communityGoalCountType: ChallengeCountType
  communityGoalTargetAmount: string
  communityGoalBonusPoints: string
  communityGoalRegistrationRequired: boolean
}

type CommunityTeam = {
  id: number
  name: string
  countType: ChallengeCountType
  targetAmount: string
}

type InterfaceCopy = {
  appTitle: string
  appDescription: string
  projectLabel: string
  backgroundSuggestionsLabel: string
  backgroundRandomizeButton: string
  backgroundRegenerateButton: string
  backgroundSaveFavoriteButton: string
  backgroundFavoritesLabel: string
  backgroundFavoritesEmptyLabel: string
  backgroundRemoveFavoriteButton: string
  backgroundFavoriteLoadError: string
  eventTypeLabel: string
  focusAirportEventName: string
  tourEventName: string
  rosterEventName: string
  curatedRosterEventName: string
  communityChallengeEventName: string
  communityGoalEventName: string
  interfaceLanguageLabel: string
  bannerSettingsTitle: string
  cityLabel: string
  countryCodeLabel: string
  icaoLabel: string
  bonusPointsLabel: string
  airportNameLabel: string
  tourTitleLabel: string
  tourTitlePlaceholder: string
  tourLegsLabel: string
  tourStopsLabel: string
  tourLegsHelp: string
  tourLegsPlaceholder: string
  tourDescriptionLabel: string
  tourDescriptionHelp: string
  tourDescriptionPlaceholder: string
  tourPreviewIntro: string
  rosterTitleLabel: string
  rosterTitlePlaceholder: string
  rosterDescriptionLabel: string
  rosterDescriptionHelp: string
  rosterDescriptionPlaceholder: string
  curatedRosterTitleLabel: string
  curatedRosterTitlePlaceholder: string
  curatedRosterDescriptionLabel: string
  curatedRosterDescriptionHelp: string
  curatedRosterDescriptionPlaceholder: string
  aircraftAssignmentLabel: string
  aircraftAssignmentHelp: string
  aircraftSearchLabel: string
  aircraftSearchPlaceholder: string
  aircraftSearchHelp: string
  aircraftListLabel: string
  aircraftListEmpty: string
  aircraftNameLabel: string
  aircraftRegistrationLabel: string
  aircraftPhotoLabel: string
  aircraftPhotoHelp: string
  aircraftPhotoEmpty: string
  aircraftPhotoAttributionPrefix: string
  tourVisualLabel: string
  tourVisualHelp: string
  tourAutoVisualDisplay: string
  challengeNameLabel: string
  challengeNamePlaceholder: string
  communityTeamsTitle: string
  communityTeamsHelp: string
  communityTeamLabel: string
  communityTeamFallbackName: string
  communityTeamNameLabel: string
  communityTeamCountTypeLabel: string
  communityTeamTargetLabel: string
  communityAddTeamButton: string
  communityRemoveTeamButton: string
  communityGoalNameLabel: string
  communityGoalNamePlaceholder: string
  communityGoalCountTypeLabel: string
  communityGoalTargetLabel: string
  communityGoalHelp: string
  communityVisualLabel: string
  communityVisualHelp: string
  communityAutoVisualDisplay: string
  imagesTitle: string
  cityPhotoLabel: string
  cityPhotoHelp: string
  choosePhotoButton: string
  defaultBackgroundDisplay: string
  restoreDefaultBackgroundButton: string
  autoBackgroundLoadingLabel: string
  autoBackgroundDisplayPrefix: string
  autoBackgroundEmptyLabel: string
  autoBackgroundErrorLabel: string
  logoLabel: string
  logoHelp: string
  defaultLogoDisplayPrefix: string
  exportTitle: string
  exportHelp: string
  exportPngButton: string
  exportingButton: string
  previewLabel: string
  previewTitle: string
  resolutionChip: string
  rewardLabel: string
  rewardPrefix: string
  rewardSuffix: string
  registrationRequiredLabel: string
  registrationRequiredHelp: string
  registrationRequiredBadge: string
  tourPreviewLabel: string
  tourPreviewEmpty: string
  rosterPreviewLabel: string
  rosterPreviewEmpty: string
  curatedRosterPreviewLabel: string
  curatedRosterPreviewEmpty: string
  communityPreviewLabel: string
  communityPreviewIntro: string
  communityPreviewEmpty: string
  communityGoalPreviewLabel: string
  communityGoalPreviewIntro: string
  logoAriaLabel: string
  logoOverlayLabel: string
  logoOverlayHelp: string
  exportError: string
}

const aircraftCatalogSources: AircraftSource[] = ['vnws', 'rag']

const defaultTourDescription: Record<Locale, string> = {
  ru: 'Маршрут размещается на векторной карте мира по координатам аэропортов из введённых легов.',
  en: 'The route is placed on a vector world map using the airport coordinates from the legs you enter.',
}

const defaultRosterDescription: Record<Locale, string> = {
  ru: 'Roster-ивент использует опубликованную последовательность легов. Участнику нужно выполнить маршрут в указанном порядке.',
  en: 'A roster event uses a published sequence of legs. Participants complete the route in the listed order.',
}

const defaultCuratedRosterDescription: Record<Locale, string> = {
  ru: 'Curated roster оформляет персональный план смены: маршрут, логика перелётов и короткий briefing по выполнению.',
  en: 'A curated roster acts like a personal shift plan: route sequence, flow, and a short briefing for how to fly it.',
}

const bannerSettingsStorageKey = 'banner-generator-settings-v2'

type StoredBannerSettings = {
  form?: Partial<BannerFormState>
  communityTeams?: CommunityTeam[]
}

type RouteEventFormConfig = {
  titleField: 'tourTitle' | 'rosterTitle' | 'curatedRosterTitle'
  legsField: 'tourLegs' | 'rosterLegs' | 'curatedRosterLegs'
  descriptionField: 'tourDescription' | 'rosterDescription' | 'curatedRosterDescription'
  bonusField: 'tourBonusPoints' | 'rosterBonusPoints' | 'curatedRosterBonusPoints'
  registrationField: 'tourRegistrationRequired' | 'rosterRegistrationRequired' | 'curatedRosterRegistrationRequired'
  titleLabel: string
  titlePlaceholder: string
  descriptionLabel: string
  descriptionHelp: string
  descriptionPlaceholder: string
  previewLabel: string
  previewEmpty: string
}

type AircraftFieldConfig = {
  enabledField: AircraftEnabledField
  searchField: AircraftSearchField
  sourceField: AircraftSourceField
  idField: AircraftIdField
  nameField: AircraftNameField
  registrationField: AircraftRegistrationField
  photoUrlField: AircraftPhotoUrlField
  photoAttributionField: AircraftPhotoAttributionField
  photoLinkbackField: AircraftPhotoLinkbackField
}

type AircraftCatalogItem = {
  source: string
  aircraft_id: number | null
  fleet_id: number | null
  registration: string
  name: string
  fleet_name: string | null
  fleet_code: string | null
  fleet_type: string | null
  image_url: string | null
  image_attribution: string | null
  image_linkback: string | null
  passengers: number | null
  cargo: number | null
  is_hidden: boolean
  tags: string[]
}

type AircraftPhotoOption = {
  provider: string
  image_url: string
  thumbnail_url: string | null
  attribution: string | null
  linkback: string | null
}

type CreationGalleryItem = {
  id: string
  event_type: string
  brand: string
  title: string
  description: string | null
  image_url: string | null
  created_at: string
}

type GuideCopy = {
  title: string
  close: string
  intro: string
  focusAirport: string
  tour: string
  roster: string
  curatedRoster: string
  communityChallenge: string
  communityGoal: string
  archiveTitle: string
  archiveEmpty: string
  archiveLoadError: string
}

function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return '/api'
  }

  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

  if (configuredBaseUrl) {
    return configuredBaseUrl
  }

  const isViteDevPort = window.location.port === '5173' || window.location.port === '5174'
  return isViteDevPort ? '/api' : 'http://127.0.0.1:8000/api'
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'ru'
  }

  return window.localStorage.getItem('banner-generator-locale') === 'en' ? 'en' : 'ru'
}

function createDefaultFormState(locale: Locale): BannerFormState {
  return {
    city: 'Saint Petersburg',
    countryCode: 'RU',
    icao: 'ULLI',
    airportName: 'Pulkovo',
    focusBonusPoints: '350',
    focusRegistrationRequired: false,
    tourTitle: 'Northern Cross Tour',
    tourLegs: 'ULLI - UUEE\nUUEE - URSS\nURSS - ULLI',
    tourDescription: defaultTourDescription[locale],
    tourBonusPoints: '350',
    tourRegistrationRequired: false,
    rosterTitle: 'April Route Roster',
    rosterLegs: 'UUEE - ULLI\nULLI - UUEE\nUUEE - URSS',
    rosterDescription: defaultRosterDescription[locale],
    rosterBonusPoints: '350',
    rosterRegistrationRequired: false,
    rosterAircraftEnabled: false,
    rosterAircraftSearch: '',
    rosterAircraftSource: '',
    rosterAircraftId: '',
    rosterAircraftName: '',
    rosterAircraftRegistration: '',
    rosterAircraftPhotoUrl: '',
    rosterAircraftPhotoAttribution: '',
    rosterAircraftPhotoLinkback: '',
    curatedRosterTitle: 'Northern Shift Plan',
    curatedRosterLegs: 'UUEE - USRR\nUSRR - ULLI\nULLI - UUEE',
    curatedRosterDescription: defaultCuratedRosterDescription[locale],
    curatedRosterBonusPoints: '350',
    curatedRosterRegistrationRequired: false,
    curatedRosterAircraftEnabled: false,
    curatedRosterAircraftSearch: '',
    curatedRosterAircraftSource: '',
    curatedRosterAircraftId: '',
    curatedRosterAircraftName: '',
    curatedRosterAircraftRegistration: '',
    curatedRosterAircraftPhotoUrl: '',
    curatedRosterAircraftPhotoAttribution: '',
    curatedRosterAircraftPhotoLinkback: '',
    challengeName: 'Spring Community Challenge',
    challengeBonusPoints: '350',
    challengeRegistrationRequired: false,
    communityGoalName: 'April Community Goal',
    communityGoalCountType: 'flights',
    communityGoalTargetAmount: '1200',
    communityGoalBonusPoints: '350',
    communityGoalRegistrationRequired: false,
  }
}

const defaultCommunityTeams: CommunityTeam[] = [
  {
    id: 1,
    name: 'Team North Star',
    countType: 'flights',
    targetAmount: '150',
  },
  {
    id: 2,
    name: 'Team Meridian',
    countType: 'distance',
    targetAmount: '85000',
  },
  {
    id: 3,
    name: 'Team Horizon',
    countType: 'passengers',
    targetAmount: '5000',
  },
]

function cloneDefaultCommunityTeams() {
  return defaultCommunityTeams.map((team) => ({ ...team }))
}

function sanitizeStoredCommunityTeams(value: unknown) {
  if (!Array.isArray(value)) {
    return cloneDefaultCommunityTeams()
  }

  const normalizedTeams = value
    .map((team, index) => {
      if (!team || typeof team !== 'object') {
        return null
      }

      const teamRecord = team as Partial<CommunityTeam>

      return {
        id: typeof teamRecord.id === 'number' ? teamRecord.id : index + 1,
        name: typeof teamRecord.name === 'string' ? teamRecord.name : '',
        countType:
          teamRecord.countType && communityCountTypeOrder.includes(teamRecord.countType)
            ? teamRecord.countType
            : 'flights',
        targetAmount: typeof teamRecord.targetAmount === 'string' ? teamRecord.targetAmount : '',
      }
    })
    .filter((team): team is CommunityTeam => team !== null)

  return normalizedTeams.length > 0 ? normalizedTeams : cloneDefaultCommunityTeams()
}

function loadStoredBannerSettings(locale: Locale) {
  const defaultState = {
    form: createDefaultFormState(locale),
    communityTeams: cloneDefaultCommunityTeams(),
  }

  if (typeof window === 'undefined') {
    return defaultState
  }

  const rawValue = window.localStorage.getItem(bannerSettingsStorageKey)

  if (!rawValue) {
    return defaultState
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredBannerSettings
    const defaultForm = createDefaultFormState(locale)
    const storedForm = parsedValue?.form && typeof parsedValue.form === 'object' ? parsedValue.form : {}
    const normalizedForm: BannerFormState = { ...defaultForm }
    const mutableNormalizedForm = normalizedForm as Record<keyof BannerFormState, BannerFormState[keyof BannerFormState]>

    for (const [field, fallbackValue] of Object.entries(defaultForm) as [keyof BannerFormState, BannerFormState[keyof BannerFormState]][]) {
      const nextValue = storedForm[field]

      if (typeof fallbackValue === 'boolean') {
        if (typeof nextValue === 'boolean') {
          mutableNormalizedForm[field] = nextValue
        }
      } else if (typeof nextValue === 'string') {
        mutableNormalizedForm[field] = nextValue
      }
    }

    return {
      form: normalizedForm,
      communityTeams: sanitizeStoredCommunityTeams(parsedValue?.communityTeams),
    }
  } catch {
    return defaultState
  }
}

const maxCommunityTeams = 4

const communityCountTypeOrder: ChallengeCountType[] = ['passengers', 'freight', 'flights', 'distance', 'flight-time']

const communityCountTypeLabels: Record<
  Locale,
  Record<ChallengeCountType, { label: string; unit: string }>
> = {
  ru: {
    passengers: { label: 'Пассажиры', unit: 'pax' },
    freight: { label: 'Груз', unit: 'lbs' },
    flights: { label: 'Рейсы', unit: 'PIREPs' },
    distance: { label: 'Дистанция', unit: 'nm' },
    'flight-time': { label: 'Налёт', unit: 'ч' },
  },
  en: {
    passengers: { label: 'Passengers', unit: 'pax' },
    freight: { label: 'Freight', unit: 'lbs' },
    flights: { label: 'Flights', unit: 'PIREPs' },
    distance: { label: 'Distance', unit: 'nm' },
    'flight-time': { label: 'Flight Time', unit: 'hrs' },
  },
}

const interfaceCopy: Record<Locale, InterfaceCopy> = {
  ru: {
    appTitle: 'Генератор VAC-баннеров',
    appDescription:
      'Единая платформа VAC-баннеров для Focus Airport, туров, roster, curated roster, Community Challenge и Community Goal для Nordwind Virtual и Russian Airways Group. Выберите проект, настройте тип ивента, проверьте превью и экспортируйте PNG 1920×1080.',
    projectLabel: 'Проект ВАК',
    backgroundSuggestionsLabel: 'Варианты от системы',
    backgroundRandomizeButton: 'Случайный вариант',
    backgroundRegenerateButton: 'Перегенерировать',
    backgroundSaveFavoriteButton: 'В избранное',
    backgroundFavoritesLabel: 'Избранное',
    backgroundFavoritesEmptyLabel: 'Сохранённые фоны появятся здесь.',
    backgroundRemoveFavoriteButton: 'Убрать',
    backgroundFavoriteLoadError: 'Не удалось загрузить сохранённый фон. Попробуйте ещё раз.',
    eventTypeLabel: 'Тип ивента',
    focusAirportEventName: 'Focus Airport',
    tourEventName: 'Тур',
    rosterEventName: 'Roster',
    curatedRosterEventName: 'Curated Roster',
    communityChallengeEventName: 'Community Challenge',
    communityGoalEventName: 'Community Goal',
    interfaceLanguageLabel: 'Язык интерфейса',
    bannerSettingsTitle: 'Параметры баннера',
    cityLabel: 'Город',
    countryCodeLabel: 'Код страны',
    icaoLabel: 'ICAO',
    bonusPointsLabel: 'Бонусные баллы',
    airportNameLabel: 'Название аэропорта',
    tourTitleLabel: 'Название тура',
    tourTitlePlaceholder: 'Northern Cross Tour',
    tourLegsLabel: 'Леги',
    tourStopsLabel: 'Точки',
    tourLegsHelp: 'По одному легу на строку. Пример: ULLI - UUEE',
    tourLegsPlaceholder: 'ULLI - UUEE\nUUEE - URSS\nURSS - ULLI',
    tourDescriptionLabel: 'Описание тура',
    tourDescriptionHelp: 'Этот текст выводится прямо в превью. Его можно использовать как короткое описание маршрута.',
    tourDescriptionPlaceholder: defaultTourDescription.ru,
    tourPreviewIntro: defaultTourDescription.ru,
    rosterTitleLabel: 'Название roster',
    rosterTitlePlaceholder: 'April Route Roster',
    rosterDescriptionLabel: 'Описание roster',
    rosterDescriptionHelp: 'Roster используется для простого выполнения набора легов без персонального сценария.',
    rosterDescriptionPlaceholder: defaultRosterDescription.ru,
    curatedRosterTitleLabel: 'Название curated roster',
    curatedRosterTitlePlaceholder: 'Northern Shift Plan',
    curatedRosterDescriptionLabel: 'Описание curated roster',
    curatedRosterDescriptionHelp: 'Используйте это поле как briefing: как слетать смену, в каком темпе и с какой идеей маршрута.',
    curatedRosterDescriptionPlaceholder: defaultCuratedRosterDescription.ru,
    aircraftAssignmentLabel: 'Конкретный самолёт',
    aircraftAssignmentHelp: 'Для roster и curated roster можно подтягивать самолёты из объединённой базы RAG и vNWS: по типу ВС, по регистрации или прямым выбором из общего списка.',
    aircraftSearchLabel: 'Тип ВС или регистрация',
    aircraftSearchPlaceholder: 'B738, Boeing 737-800 или RA-73280',
    aircraftSearchHelp: 'Введите тип ВС, модель или регистрацию. Если поле пустое, ниже показывается общий список бортов из RAG и vNWS.',
    aircraftListLabel: 'Общий список RAG + vNWS',
    aircraftListEmpty: 'База бортов пока пуста или по запросу ничего не найдено.',
    aircraftNameLabel: 'Название самолёта',
    aircraftRegistrationLabel: 'Бортовая регистрация',
    aircraftPhotoLabel: 'Фото самолёта',
    aircraftPhotoHelp: 'Если указан конкретный борт, сервис подтягивает фото по регистрации и совмещает его с картой маршрута.',
    aircraftPhotoEmpty: 'Подходящие фото самолёта пока не найдены.',
    aircraftPhotoAttributionPrefix: 'Фото: ',
    tourVisualLabel: 'Карта маршрута',
    tourVisualHelp:
      'Для route-ивентов по умолчанию используется встроенная векторная карта мира, а точки маршрута ставятся по координатам аэропортов из введённых легов. При необходимости можно загрузить свой фон.',
    tourAutoVisualDisplay: 'Встроенная карта маршрута',
    challengeNameLabel: 'Название челленджа',
    challengeNamePlaceholder: 'Spring Community Challenge',
    communityTeamsTitle: 'Команды',
    communityTeamsHelp: 'Для баннера отображаются первые 4 команды. У каждой команды свой тип цели и целевое значение.',
    communityTeamLabel: 'Команда',
    communityTeamFallbackName: 'Команда',
    communityTeamNameLabel: 'Название команды',
    communityTeamCountTypeLabel: 'Что считаем',
    communityTeamTargetLabel: 'Цель',
    communityAddTeamButton: 'Добавить команду',
    communityRemoveTeamButton: 'Удалить',
    communityGoalNameLabel: 'Название общей цели',
    communityGoalNamePlaceholder: 'April Community Goal',
    communityGoalCountTypeLabel: 'Что считаем',
    communityGoalTargetLabel: 'Общая цель',
    communityGoalHelp: 'Это общий счётчик для всей комьюнити без разделения на команды.',
    communityVisualLabel: 'Фон баннера',
    communityVisualHelp:
      'Для community-ивентов по умолчанию используется встроенный фон баннера. При необходимости можно загрузить свой арт.',
    communityAutoVisualDisplay: 'Встроенный фон ивента',
    imagesTitle: 'Изображения',
    cityPhotoLabel: 'Фото города',
    cityPhotoHelp:
      'Генератор предлагает 3-4 варианта с видами города из Wikimedia Commons. Кадры аэропорта используются только как запасной fallback. Если ни один вариант не подходит, загрузите свой кадр.',
    choosePhotoButton: 'Загрузить своё фото',
    defaultBackgroundDisplay: 'Встроенный запасной фон',
    restoreDefaultBackgroundButton: 'Вернуть автоподбор',
    autoBackgroundLoadingLabel: 'Подбираем фон автоматически...',
    autoBackgroundDisplayPrefix: 'Авто: ',
    autoBackgroundEmptyLabel: 'Автоподбор не нашёл подходящий кадр, используется запасной фон',
    autoBackgroundErrorLabel: 'Автоподбор недоступен, используется запасной фон',
    logoLabel: 'Логотип проекта',
    logoHelp: 'Логотип выбранного проекта встроен и автоматически используется в превью и экспорте.',
    defaultLogoDisplayPrefix: 'Встроенный логотип: ',
    exportTitle: 'Экспорт',
    exportHelp: 'PNG 1920×1080. В экспорт автоматически подставляется логотип выбранного проекта.',
    exportPngButton: 'Экспорт PNG',
    exportingButton: 'Экспортируем…',
    previewLabel: 'Превью',
    previewTitle: 'Превью баннера / 1920×1080',
    resolutionChip: 'PNG • 16:9',
    rewardLabel: 'Награда ивента',
    rewardPrefix: 'Получите дополнительно',
    rewardSuffix: 'бонусных баллов',
    registrationRequiredLabel: 'Registration Required',
    registrationRequiredHelp: 'Если включено, на баннере появится заметка о том, что для участия нужна предварительная регистрация.',
    registrationRequiredBadge: 'Требуется регистрация',
    tourPreviewLabel: 'Леги тура',
    tourPreviewEmpty: 'Добавьте хотя бы один лег',
    rosterPreviewLabel: 'Леги roster',
    rosterPreviewEmpty: 'Добавьте хотя бы один leg в roster',
    curatedRosterPreviewLabel: 'Curated legs',
    curatedRosterPreviewEmpty: 'Добавьте хотя бы один leg в curated roster',
    communityPreviewLabel: 'Команды челленджа',
    communityPreviewIntro: 'Выберите команду и помогите ей первой выполнить общую цель.',
    communityPreviewEmpty: 'Добавьте хотя бы одну команду',
    communityGoalPreviewLabel: 'Общая цель',
    communityGoalPreviewIntro: 'Вся комьюнити летает в один общий счётчик до достижения цели.',
    logoAriaLabel: 'Логотип проекта',
    logoOverlayLabel: 'Затемнение за логотипом',
    logoOverlayHelp: 'Управляет прозрачностью тени под логотипом.',
    exportError: 'Не удалось экспортировать PNG. Проверьте загруженные изображения и попробуйте еще раз.',
  },
  en: {
    appTitle: 'VA Banner Generator',
    appDescription:
      'One banner platform for Focus Airport, tour events, roster events, curated rosters, Community Challenge banners, and Community Goal banners for Nordwind Virtual and Russian Airways Group. Select the project, choose the event type, review the live preview, and export a 1920×1080 PNG.',
    projectLabel: 'VA Project',
    backgroundSuggestionsLabel: 'System Picks',
    backgroundRandomizeButton: 'Randomize',
    backgroundRegenerateButton: 'Regenerate',
    backgroundSaveFavoriteButton: 'Save to Favorites',
    backgroundFavoritesLabel: 'Favorites',
    backgroundFavoritesEmptyLabel: 'Saved backgrounds will appear here.',
    backgroundRemoveFavoriteButton: 'Remove',
    backgroundFavoriteLoadError: 'Failed to load the saved background. Try again.',
    eventTypeLabel: 'Event Type',
    focusAirportEventName: 'Focus Airport',
    tourEventName: 'Tour',
    rosterEventName: 'Roster',
    curatedRosterEventName: 'Curated Roster',
    communityChallengeEventName: 'Community Challenge',
    communityGoalEventName: 'Community Goal',
    interfaceLanguageLabel: 'Interface language',
    bannerSettingsTitle: 'Banner Settings',
    cityLabel: 'City',
    countryCodeLabel: 'Country Code',
    icaoLabel: 'ICAO',
    bonusPointsLabel: 'Bonus Points',
    airportNameLabel: 'Airport Name',
    tourTitleLabel: 'Tour Title',
    tourTitlePlaceholder: 'Northern Cross Tour',
    tourLegsLabel: 'Legs',
    tourStopsLabel: 'Stops',
    tourLegsHelp: 'One leg per line. Example: ULLI - UUEE',
    tourLegsPlaceholder: 'ULLI - UUEE\nUUEE - URSS\nURSS - ULLI',
    tourDescriptionLabel: 'Tour Description',
    tourDescriptionHelp: 'This text is shown directly in the preview. Use it as a short route description or event note.',
    tourDescriptionPlaceholder: defaultTourDescription.en,
    tourPreviewIntro: defaultTourDescription.en,
    rosterTitleLabel: 'Roster Title',
    rosterTitlePlaceholder: 'April Route Roster',
    rosterDescriptionLabel: 'Roster Description',
    rosterDescriptionHelp: 'Use roster mode for a straightforward legs-only activity with no personal shift narrative.',
    rosterDescriptionPlaceholder: defaultRosterDescription.en,
    curatedRosterTitleLabel: 'Curated Roster Title',
    curatedRosterTitlePlaceholder: 'Northern Shift Plan',
    curatedRosterDescriptionLabel: 'Curated Briefing',
    curatedRosterDescriptionHelp: 'Use this as a personal shift note: how to fly the sequence, what the shift is about, and what to focus on.',
    curatedRosterDescriptionPlaceholder: defaultCuratedRosterDescription.en,
    aircraftAssignmentLabel: 'Specific aircraft',
    aircraftAssignmentHelp: 'Roster and Curated Roster can pull aircraft from the merged RAG and vNWS catalog by aircraft type, registration, or direct selection from the full list.',
    aircraftSearchLabel: 'Aircraft type or registration',
    aircraftSearchPlaceholder: 'B738, Boeing 737-800, or RA-73280',
    aircraftSearchHelp: 'Enter an aircraft type, model, or registration. If the field is empty, the full combined RAG and vNWS list is shown below.',
    aircraftListLabel: 'Combined RAG + vNWS aircraft list',
    aircraftListEmpty: 'No aircraft were loaded yet or nothing matched the current query.',
    aircraftNameLabel: 'Aircraft name',
    aircraftRegistrationLabel: 'Aircraft registration',
    aircraftPhotoLabel: 'Aircraft photo',
    aircraftPhotoHelp: 'When a specific airframe is set, the service looks up aircraft photos by registration and blends them with the route map.',
    aircraftPhotoEmpty: 'No suitable aircraft photos were found yet.',
    aircraftPhotoAttributionPrefix: 'Photo: ',
    tourVisualLabel: 'Route Map',
    tourVisualHelp:
      'Route-based banners use a built-in vector world map by default, and route points are placed using the airport coordinates from the legs you enter. You can still upload a custom background if needed.',
    tourAutoVisualDisplay: 'Built-in route map',
    challengeNameLabel: 'Challenge Name',
    challengeNamePlaceholder: 'Spring Community Challenge',
    communityTeamsTitle: 'Teams',
    communityTeamsHelp: 'The banner shows the first 4 teams. Each team has its own goal type and target amount.',
    communityTeamLabel: 'Team',
    communityTeamFallbackName: 'Team',
    communityTeamNameLabel: 'Team Name',
    communityTeamCountTypeLabel: 'Count Type',
    communityTeamTargetLabel: 'Target Amount',
    communityAddTeamButton: 'Add Team',
    communityRemoveTeamButton: 'Remove',
    communityGoalNameLabel: 'Shared Goal Name',
    communityGoalNamePlaceholder: 'April Community Goal',
    communityGoalCountTypeLabel: 'Count Type',
    communityGoalTargetLabel: 'Shared Target',
    communityGoalHelp: 'This is one shared counter for the whole community with no team split.',
    communityVisualLabel: 'Banner Background',
    communityVisualHelp:
      'Community events use a built-in banner background by default. Upload your own artwork only if you need a custom visual.',
    communityAutoVisualDisplay: 'Built-in event background',
    imagesTitle: 'Images',
    cityPhotoLabel: 'City Photo',
    cityPhotoHelp:
      'The generator offers 3-4 city-view background suggestions from Wikimedia Commons. Airport shots are used only as a fallback. If none of them fit, upload your own image.',
    choosePhotoButton: 'Upload Your Photo',
    defaultBackgroundDisplay: 'Built-in fallback background',
    restoreDefaultBackgroundButton: 'Restore Auto Background',
    autoBackgroundLoadingLabel: 'Selecting background automatically...',
    autoBackgroundDisplayPrefix: 'Auto: ',
    autoBackgroundEmptyLabel: 'Auto selection found no suitable image, using the fallback background',
    autoBackgroundErrorLabel: 'Auto selection is unavailable, using the fallback background',
    logoLabel: 'Project Logo',
    logoHelp: 'The selected project logo is built in and used automatically in preview and export.',
    defaultLogoDisplayPrefix: 'Built-in logo: ',
    exportTitle: 'Export',
    exportHelp: 'PNG 1920×1080. The selected project logo is used automatically for export.',
    exportPngButton: 'Export PNG',
    exportingButton: 'Exporting…',
    previewLabel: 'Live Preview',
    previewTitle: 'Banner Preview / 1920×1080',
    resolutionChip: 'PNG • 16:9',
    rewardLabel: 'Event reward',
    rewardPrefix: 'Earn additional',
    rewardSuffix: 'bonus points',
    registrationRequiredLabel: 'Registration Required',
    registrationRequiredHelp: 'When enabled, the banner shows a visible note that event registration is required.',
    registrationRequiredBadge: 'Registration required',
    tourPreviewLabel: 'Tour legs',
    tourPreviewEmpty: 'Add at least one leg',
    rosterPreviewLabel: 'Roster legs',
    rosterPreviewEmpty: 'Add at least one roster leg',
    curatedRosterPreviewLabel: 'Curated legs',
    curatedRosterPreviewEmpty: 'Add at least one curated leg',
    communityPreviewLabel: 'Challenge teams',
    communityPreviewIntro: 'Pick a team and help it reach the shared target first.',
    communityPreviewEmpty: 'Add at least one team',
    communityGoalPreviewLabel: 'Shared target',
    communityGoalPreviewIntro: 'The whole community flies toward one shared counter until the goal is reached.',
    logoAriaLabel: 'Project logo',
    logoOverlayLabel: 'Logo background dimming',
    logoOverlayHelp: 'Controls the opacity of the shadow behind the logo.',
    exportError: 'PNG export failed. Check uploaded images and try again.',
  },
}

const guideCopy: Record<Locale, GuideCopy> = {
  ru: {
    title: 'Как пользоваться сервисом',
    close: 'Закрыть',
    intro:
      'Сервис собирает баннеры под несколько форматов ивентов. Язык интерфейса и язык текста на баннере разделены: RU/EN меняет только controls, а язык баннера выбирается отдельно.',
    focusAirport: 'Focus Airport: классический баннер по городу и аэропорту с акцентом на визуал направления.',
    tour: 'Tour: маршрутная история на карте мира, где важны леги и последовательность точек.',
    roster: 'Roster: опубликованный список легов. Можно привязать ивент к конкретному самолёту и подтянуть фото борта.',
    curatedRoster: 'Curated Roster: персональный маршрут смены с briefing-логикой и привязкой к конкретному самолёту.',
    communityChallenge: 'Community Challenge: командный ивент, где команды соревнуются по выбранной метрике.',
    communityGoal: 'Community Goal: общий счётчик для всей комьюнити без разделения на команды.',
    archiveTitle: 'Архив созданий',
    archiveEmpty: 'Архив пока пуст. Он начнет заполняться после экспорта баннеров.',
    archiveLoadError: 'Не удалось загрузить архив созданий.',
  },
  en: {
    title: 'How To Use The Service',
    close: 'Close',
    intro:
      'This service builds banners for several event formats. Interface language and banner language are now separate: RU/EN changes the controls only, while banner text language is selected independently.',
    focusAirport: 'Focus Airport: the classic city-and-airport banner with a strong destination visual.',
    tour: 'Tour: a route-driven story on the world map where leg order and stop sequence matter.',
    roster: 'Roster: a published sequence of legs. It can be tied to a specific aircraft and enriched with an aircraft photo.',
    curatedRoster: 'Curated Roster: a personal shift plan with briefing-style text and a specific airframe.',
    communityChallenge: 'Community Challenge: a team-based format where multiple teams compete on a selected metric.',
    communityGoal: 'Community Goal: one shared community-wide target with no team split.',
    archiveTitle: 'Creation Archive',
    archiveEmpty: 'The archive is empty for now. It will start filling up after banner exports.',
    archiveLoadError: 'Failed to load the creation archive.',
  },
}

type EventDefinition = {
  key: EventType
  shortName: string
  exportSlug: string
}

const eventOrder: EventType[] = [
  'focus-airport',
  'tour',
  'roster',
  'curated-roster',
  'community-challenge',
  'community-goal',
]

const eventDefinitions: Record<EventType, EventDefinition> = {
  'focus-airport': {
    key: 'focus-airport',
    shortName: 'FA',
    exportSlug: 'focus-airport',
  },
  tour: {
    key: 'tour',
    shortName: 'TOUR',
    exportSlug: 'tour',
  },
  roster: {
    key: 'roster',
    shortName: 'RST',
    exportSlug: 'roster',
  },
  'curated-roster': {
    key: 'curated-roster',
    shortName: 'CUR',
    exportSlug: 'curated-roster',
  },
  'community-challenge': {
    key: 'community-challenge',
    shortName: 'CC',
    exportSlug: 'community-challenge',
  },
  'community-goal': {
    key: 'community-goal',
    shortName: 'CG',
    exportSlug: 'community-goal',
  },
}

type BrandDefinition = {
  key: BrandKey
  fullName: string
  shortName: string
  exportSlug: string
}

const brandOrder: BrandKey[] = ['nordwind', 'rag']

const brandDefinitions: Record<BrandKey, BrandDefinition> = {
  nordwind: {
    key: 'nordwind',
    fullName: 'Nordwind Virtual',
    shortName: 'vNWS',
    exportSlug: 'nordwind-virtual',
  },
  rag: {
    key: 'rag',
    fullName: 'Russian Airways Group',
    shortName: 'RAG',
    exportSlug: 'russian-airways-group',
  },
}

type BackgroundInfo =
  | { kind: 'fallback' }
  | { kind: 'manual'; label: string }
  | { kind: 'auto'; label: string }
  | { kind: 'auto-empty' }
  | { kind: 'auto-error' }

type AutoBackgroundOption = {
  key: string
  objectUrl: string
  label: string
  sourceUrl: string
}

type CachedAutoBackground = {
  options: AutoBackgroundOption[]
}

type FavoriteBackground = {
  key: string
  label: string
  sourceUrl: string
  createdAt: number
}

type WikimediaCandidate = {
  title: string
  thumbUrl: string
  width: number
  height: number
}

type TourLegPair = {
  from: string
  to: string
}

type AirportCoordinateRecord = {
  iata?: string | null
  icao?: string | null
  latitude?: number | null
  longitude?: number | null
}

type AirportCoordinate = {
  latitude: number
  longitude: number
}

type TourMapPoint = {
  code: string
  latitude: number
  longitude: number
  x: number
  y: number
}

type TourMapSegment = {
  key: string
  path: string
}

type TourMapViewport = {
  scale: number
  translateX: number
  translateY: number
}

const autoBackgroundSelectionLimit = 4
const autoBackgroundTopCandidateWindow = 10
const favoriteBackgroundsStorageKey = 'banner-generator-favorite-backgrounds'
const maxFavoriteBackgrounds = 12

const tourMapViewBox = {
  width: 1180,
  height: 620,
}

const tourMapLandFeature = feature(
  worldLandAtlas as any,
  (worldLandAtlas as any).objects.land,
)
const tourMapProjection = geoNaturalEarth1().fitExtent(
  [
    [42, 34],
    [tourMapViewBox.width - 42, tourMapViewBox.height - 34],
  ],
  tourMapLandFeature,
)
const tourMapPath = geoPath(tourMapProjection)
const tourMapLandPath = tourMapPath(tourMapLandFeature) ?? ''
const tourMapGraticulePath = tourMapPath(geoGraticule10()) ?? ''
const airportCoordinateLookup = createAirportCoordinateLookup(airportsData as AirportCoordinateRecord[])

function NordwindVirtualLogo({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div className="built-in-logo is-nordwind" aria-label={ariaLabel}>
      <svg className="built-in-logo-svg" viewBox="0 0 1823 416" aria-hidden="true">
        <path d="M25 280L145 51H500L621 280H378L283 102L173 280H25Z" fill="#ff1018" />
        <path d="M475 280L694 51H977L774 280H475Z" fill="#ff1018" />
        <text
          x="1006"
          y="252"
          fill="#ffffff"
          fontFamily="Manrope, 'Segoe UI', sans-serif"
          fontSize="206"
          fontWeight="300"
          letterSpacing="-8"
        >
          v
        </text>
        <text
          x="1132"
          y="252"
          fill="#ffffff"
          fontFamily="Manrope, 'Segoe UI', sans-serif"
          fontSize="286"
          fontWeight="300"
          letterSpacing="-10"
        >
          NWS
        </text>
        <text
          x="28"
          y="380"
          fill="#ffffff"
          fontFamily="Manrope, 'Segoe UI', sans-serif"
          fontSize="88"
          fontWeight="400"
          letterSpacing="20"
          opacity="0.98"
        >
          Nordwind Virtual Group
        </text>
      </svg>
    </div>
  )
}

function RussianAirwaysGroupLogo({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div className="built-in-logo is-rag" aria-label={ariaLabel}>
      <svg className="built-in-logo-svg" viewBox="0 0 2340 420" aria-hidden="true">
        <defs>
          <clipPath id="rag-flag-clip">
            <path d="M36 92C118 52 176 56 254 44C328 32 386 8 446 0V314C384 336 324 362 232 362C156 362 98 376 36 410V92Z" />
          </clipPath>
        </defs>

        <g clipPath="url(#rag-flag-clip)">
          <path d="M0 28C124 28 184 8 280 2C352 -2 412 12 470 44V132C414 98 356 88 282 96C184 108 122 132 0 132V28Z" fill="#ffffff" />
          <path d="M0 110C112 110 180 90 276 84C350 80 410 94 470 126V216C410 182 350 172 276 178C180 186 114 212 0 212V110Z" fill="#33289c" />
          <path d="M0 188C116 188 182 168 278 160C350 154 410 168 470 202V316C408 282 348 274 274 282C176 292 114 318 0 318V188Z" fill="#d10000" />
        </g>

        <path
          d="M40 94C118 54 176 58 254 46C328 34 384 10 442 2"
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M40 410C102 378 158 364 232 364C324 364 382 338 442 316"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        <text
          x="504"
          y="278"
          fill="#ffffff"
          fontFamily="Manrope, 'Segoe UI', sans-serif"
          fontSize="300"
          fontWeight="300"
          letterSpacing="-18"
        >
          RAG
        </text>

        <line x1="1432" y1="214" x2="2300" y2="214" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" />
        <circle cx="1610" cy="214" r="78" fill="#bfd845" />
        <circle cx="1844" cy="214" r="78" fill="#a759d5" />
        <circle cx="2078" cy="214" r="78" fill="#43bbd1" />
        <circle cx="2288" cy="214" r="78" fill="#4735ea" />
      </svg>
    </div>
  )
}

function ProjectLogo({ brandKey, ariaLabel }: { brandKey: BrandKey; ariaLabel: string }) {
  if (brandKey === 'rag') {
    return <RussianAirwaysGroupLogo ariaLabel={ariaLabel} />
  }

  return <NordwindVirtualLogo ariaLabel={ariaLabel} />
}

function splitHeadline(city: string) {
  const normalizedCity = city.trim()

  if (!normalizedCity) {
    return ['City']
  }

  const words = normalizedCity.split(/\s+/)

  if (words.length === 1) {
    return words
  }

  if (words.length === 2) {
    return [words[0], words[1]]
  }

  const midpoint = Math.ceil(words.length / 2)
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')]
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function shuffleArray<T>(items: T[]) {
  const shuffledItems = [...items]

  for (let itemIndex = shuffledItems.length - 1; itemIndex > 0; itemIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (itemIndex + 1))
    ;[shuffledItems[itemIndex], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[itemIndex]]
  }

  return shuffledItems
}

function loadFavoriteBackgrounds() {
  if (typeof window === 'undefined') {
    return [] as FavoriteBackground[]
  }

  try {
    const rawValue = window.localStorage.getItem(favoriteBackgroundsStorageKey)

    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue) as unknown

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.flatMap((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.key !== 'string' ||
        typeof item.label !== 'string' ||
        typeof item.sourceUrl !== 'string' ||
        typeof item.createdAt !== 'number'
      ) {
        return []
      }

      return [item as FavoriteBackground]
    })
  } catch {
    return []
  }
}

function getFlagAssetCode(countryCode: string | undefined) {
  const normalizedCountryCode = (countryCode ?? '').trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    return null
  }

  return normalizedCountryCode.toLowerCase()
}

const ICAO_PREFIX_TO_COUNTRY: Record<string, string> = {
  // Russia
  UU: 'RU', UL: 'RU', US: 'RU', UR: 'RU', UW: 'RU',
  UI: 'RU', UO: 'RU', UH: 'RU', UE: 'RU',
  // Former Soviet Union
  UB: 'AZ', UC: 'KG', UD: 'AM', UG: 'GE',
  UK: 'UA', UM: 'BY', UA: 'KZ', UN: 'KZ', UT: 'TM',
  // Northern / Eastern Europe
  EG: 'GB', EK: 'DK', EF: 'FI', EE: 'EE',
  EV: 'LV', EY: 'LT', EB: 'BE', EH: 'NL',
  EI: 'IE', EP: 'PL', ED: 'DE',
  // Southern / Central Europe
  LK: 'CZ', LF: 'FR', LI: 'IT', LS: 'CH',
  LD: 'HR', LJ: 'SI', LO: 'AT', LP: 'PT',
  LR: 'RO', LH: 'HU', LB: 'BG', LG: 'GR',
  LT: 'TR', LY: 'RS', LZ: 'SK', LQ: 'BA',
  LW: 'MK', LN: 'MC', LM: 'MT',
  // Nordic
  EN: 'NO', ES: 'SE',
  // Middle East / Central Asia
  OI: 'IR', OJ: 'JO', OK: 'KW', OL: 'LB', OM: 'AE',
  OO: 'SA', OP: 'PK', OR: 'IQ', OS: 'SY', OT: 'QA',
  // Asia
  ZB: 'CN', ZG: 'CN', ZH: 'CN', ZJ: 'CN', ZL: 'CN',
  ZP: 'CN', ZS: 'CN', ZU: 'CN', ZW: 'CN', ZY: 'CN',
  RJ: 'JP', RK: 'KR',
  VH: 'AU', NZ: 'NZ',
}

function getIcaoCountryCode(icao: string): string | null {
  const code = icao.trim().toUpperCase()
  if (code.length < 2) return null
  const prefix2 = code.substring(0, 2)
  if (ICAO_PREFIX_TO_COUNTRY[prefix2]) return ICAO_PREFIX_TO_COUNTRY[prefix2]
  // Single-letter fallbacks
  const prefix1 = code.charAt(0)
  if (prefix1 === 'K' || prefix1 === 'P') return 'US'
  if (prefix1 === 'Y') return 'AU'
  if (prefix1 === 'Z') return 'CN'
  return null
}

function getCountryDisplayName(countryCode: string | undefined) {
  const normalizedCountryCode = (countryCode ?? '').trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    return ''
  }

  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(normalizedCountryCode) ?? ''
  } catch {
    return ''
  }
}

function cleanWikimediaTitle(title: string) {
  return title
    .replace(/^File:/i, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildCityViewQueries(form: BannerFormState) {
  const city = form.city.trim()
  const countryName = getCountryDisplayName(form.countryCode)
  const withCountryName = countryName ? ` ${countryName}` : ''

  return Array.from(
    new Set(
      [
        city ? `${city} skyline${withCountryName}` : '',
        city ? `${city} panorama${withCountryName}` : '',
        city ? `${city} cityscape${withCountryName}` : '',
        city ? `${city} aerial view${withCountryName}` : '',
        city ? `${city} waterfront${withCountryName}` : '',
        city ? `${city} downtown${withCountryName}` : '',
      ].filter(Boolean),
    ),
  )
}

function buildAirportFallbackQueries(form: BannerFormState) {
  const city = form.city.trim()
  const airportName = form.airportName.trim()
  const countryName = getCountryDisplayName(form.countryCode)
  const withCountryName = countryName ? ` ${countryName}` : ''

  return Array.from(
    new Set(
      [
        airportName && city ? `${airportName} airport ${city}${withCountryName}` : '',
        airportName ? `${airportName} airport${withCountryName}` : '',
      ].filter(Boolean),
    ),
  )
}

function getSearchTerms(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 2),
    ),
  )
}

function scoreWikimediaCandidate(
  candidate: WikimediaCandidate,
  searchTerms: string[],
  mode: 'city-view' | 'airport-fallback',
) {
  const normalizedTitle = candidate.title.toLowerCase()

  if (/(map|flag|locator|logo|diagram|route|coat|arms|emblem|rail|metro|station)/i.test(normalizedTitle)) {
    return -1000
  }

  if (mode === 'city-view' && /(airport|terminal|runway|airfield|apron|taxiway|boeing|airbus|aircraft|plane|airliner|landing|takeoff|pobeda|aeroflot|rossiya)/i.test(normalizedTitle)) {
    return -1000
  }

  let score = 0

  const ratio = candidate.width > 0 && candidate.height > 0 ? candidate.width / candidate.height : 16 / 9
  score -= Math.abs(ratio - 16 / 9) * 40

  if (candidate.width >= 1600) {
    score += 18
  }

   if (candidate.width >= 2200) {
    score += 12
  }

  if (/(skyline|panorama|cityscape|view|aerial|waterfront|river|embankment|downtown|historic|old town|harbor|harbour|night)/i.test(normalizedTitle)) {
    score += mode === 'city-view' ? 34 : 18
  }

  if (mode === 'airport-fallback' && /(airport|terminal|runway|airfield|apron|taxiway)/i.test(normalizedTitle)) {
    score += 10
  }

  for (const term of searchTerms) {
    if (normalizedTitle.includes(term)) {
      score += mode === 'city-view' ? 10 : 7
    }
  }

  return score
}

async function searchWikimediaCommons(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|size',
    iiurlwidth: '1920',
    format: 'json',
    origin: '*',
  })

  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, { signal })

  if (!response.ok) {
    throw new Error('Wikimedia search request failed')
  }

  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title: string
          imageinfo?: Array<{
            thumburl?: string
            url?: string
            thumbwidth?: number
            thumbheight?: number
            width?: number
            height?: number
          }>
        }
      >
    }
  }

  return Object.values(data.query?.pages ?? {}).flatMap((page) => {
    const info = page.imageinfo?.[0]

    if (!info) {
      return []
    }

    const thumbUrl = info.thumburl ?? info.url

    if (!thumbUrl) {
      return []
    }

    return [
      {
        title: page.title,
        thumbUrl,
        width: info.thumbwidth ?? info.width ?? 0,
        height: info.thumbheight ?? info.height ?? 0,
      },
    ]
  })
}

async function fetchAutoBackgroundCandidates(form: BannerFormState, signal: AbortSignal) {
  const cityViewQueries = buildCityViewQueries(form)
  const airportFallbackQueries = buildAirportFallbackQueries(form)
  const citySearchTerms = getSearchTerms(`${form.city} ${getCountryDisplayName(form.countryCode)}`)
  const airportSearchTerms = getSearchTerms(`${form.airportName} ${form.city}`)
  const candidateMap = new Map<
    string,
    WikimediaCandidate & {
      score: number
    }
  >()

  async function collectCandidates(
    queries: string[],
    searchTerms: string[],
    mode: 'city-view' | 'airport-fallback',
  ) {
    for (const query of queries) {
      const candidates = await searchWikimediaCommons(query, signal)

      for (const candidate of candidates) {
        const score = scoreWikimediaCandidate(candidate, searchTerms, mode)

        if (score <= -40) {
          continue
        }

        const key = candidate.title.toLowerCase()
        const existingCandidate = candidateMap.get(key)

        if (!existingCandidate || score > existingCandidate.score) {
          candidateMap.set(key, {
            ...candidate,
            score,
          })
        }
      }
    }
  }

  await collectCandidates(cityViewQueries, citySearchTerms, 'city-view')

  if (candidateMap.size < autoBackgroundSelectionLimit) {
    await collectCandidates(airportFallbackQueries, airportSearchTerms, 'airport-fallback')
  }

  const sortedCandidates = [...candidateMap.values()].sort((left, right) => right.score - left.score)

  return shuffleArray(sortedCandidates.slice(0, autoBackgroundTopCandidateWindow)).slice(0, autoBackgroundSelectionLimit)
}

function getAircraftSourceLabel(source: string) {
  if (source.toLowerCase() === 'vnws') {
    return 'vNWS'
  }

  if (source.toLowerCase() === 'rag') {
    return 'RAG'
  }

  return source.toUpperCase()
}

function getAircraftTypeLabel(aircraft: AircraftCatalogItem) {
  return aircraft.fleet_code?.trim().toUpperCase() || aircraft.fleet_name?.trim() || aircraft.fleet_type?.trim().toUpperCase() || ''
}

async function fetchAircraftCatalog(query: string, sources: AircraftSource[], signal: AbortSignal, limit: number) {
  const apiBaseUrl = getApiBaseUrl()
  const params = new URLSearchParams()

  if (query.trim()) {
    params.set('query', query.trim())
  }

  params.set('limit', String(limit))

  for (const source of sources) {
    params.append('sources', source)
  }

  const response = await fetch(`${apiBaseUrl}/aircraft?${params.toString()}`, { signal })

  if (!response.ok) {
    throw new Error('Aircraft catalog request failed')
  }

  const payload = (await response.json()) as {
    items?: AircraftCatalogItem[]
  }

  return payload.items ?? []
}

async function syncAircraftCatalog(source: string) {
  const apiBaseUrl = getApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/aircraft/sync/${source}?limit=500`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Aircraft sync request failed')
  }
}

async function syncAircraftCatalogs(sources: AircraftSource[]) {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      await syncAircraftCatalog(source)
      return source
    }),
  )

  return results.map((result, index) => ({
    source: sources[index],
    ok: result.status === 'fulfilled',
  }))
}

async function fetchAircraftPhotoOptions(registration: string, source: string, aircraftId?: string) {
  const apiBaseUrl = getApiBaseUrl()
  const params = new URLSearchParams({
    source,
    limit: '6',
  })

  if (aircraftId) {
    params.set('aircraft_id', aircraftId)
  }

  const response = await fetch(`${apiBaseUrl}/aircraft/photos/${encodeURIComponent(registration)}?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Aircraft photo request failed')
  }

  const payload = (await response.json()) as {
    items?: AircraftPhotoOption[]
  }

  return payload.items ?? []
}

async function archiveCreation(payload: {
  eventType: EventType
  brand: BrandKey
  title: string
  description: string | null
  imageDataUrl: string
  metadata: Record<string, unknown>
}) {
  const apiBaseUrl = getApiBaseUrl()

  await fetch(`${apiBaseUrl}/creations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: payload.eventType,
      brand: payload.brand,
      title: payload.title,
      description: payload.description,
      image_data_url: payload.imageDataUrl,
      metadata: payload.metadata,
    }),
  })
}

async function fetchCreationArchive() {
  const apiBaseUrl = getApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/creations`)

  if (!response.ok) {
    throw new Error('Creation archive request failed')
  }

  const payload = (await response.json()) as {
    items?: CreationGalleryItem[]
  }

  return (payload.items ?? []).map((item) => ({
    ...item,
    image_url: item.image_url ? `${apiBaseUrl}${item.image_url}` : null,
  }))
}

function getAutoBackgroundSearchKey(form: BannerFormState, eventType: EventType) {
  return [
    eventType,
    form.city.trim().toLowerCase(),
    form.airportName.trim().toLowerCase(),
    (form.countryCode ?? '').trim().toUpperCase(),
  ].join('|')
}

function isRouteEvent(eventType: EventType): eventType is RouteEventType {
  return eventType === 'tour' || eventType === 'roster' || eventType === 'curated-roster'
}

function isCommunityEvent(eventType: EventType): eventType is CommunityEventType {
  return eventType === 'community-challenge' || eventType === 'community-goal'
}

function getRouteEventFormConfig(eventType: RouteEventType, strings: InterfaceCopy): RouteEventFormConfig {
  if (eventType === 'roster') {
    return {
      titleField: 'rosterTitle',
      legsField: 'rosterLegs',
      descriptionField: 'rosterDescription',
      bonusField: 'rosterBonusPoints',
      registrationField: 'rosterRegistrationRequired',
      titleLabel: strings.rosterTitleLabel,
      titlePlaceholder: strings.rosterTitlePlaceholder,
      descriptionLabel: strings.rosterDescriptionLabel,
      descriptionHelp: strings.rosterDescriptionHelp,
      descriptionPlaceholder: strings.rosterDescriptionPlaceholder,
      previewLabel: strings.rosterPreviewLabel,
      previewEmpty: strings.rosterPreviewEmpty,
    }
  }

  if (eventType === 'curated-roster') {
    return {
      titleField: 'curatedRosterTitle',
      legsField: 'curatedRosterLegs',
      descriptionField: 'curatedRosterDescription',
      bonusField: 'curatedRosterBonusPoints',
      registrationField: 'curatedRosterRegistrationRequired',
      titleLabel: strings.curatedRosterTitleLabel,
      titlePlaceholder: strings.curatedRosterTitlePlaceholder,
      descriptionLabel: strings.curatedRosterDescriptionLabel,
      descriptionHelp: strings.curatedRosterDescriptionHelp,
      descriptionPlaceholder: strings.curatedRosterDescriptionPlaceholder,
      previewLabel: strings.curatedRosterPreviewLabel,
      previewEmpty: strings.curatedRosterPreviewEmpty,
    }
  }

  return {
    titleField: 'tourTitle',
    legsField: 'tourLegs',
    descriptionField: 'tourDescription',
    bonusField: 'tourBonusPoints',
    registrationField: 'tourRegistrationRequired',
    titleLabel: strings.tourTitleLabel,
    titlePlaceholder: strings.tourTitlePlaceholder,
    descriptionLabel: strings.tourDescriptionLabel,
    descriptionHelp: strings.tourDescriptionHelp,
    descriptionPlaceholder: strings.tourDescriptionPlaceholder,
    previewLabel: strings.tourPreviewLabel,
    previewEmpty: strings.tourPreviewEmpty,
  }
}

function getAircraftFieldConfig(eventType: EventType): AircraftFieldConfig | null {
  if (eventType === 'roster') {
    return {
      enabledField: 'rosterAircraftEnabled',
      searchField: 'rosterAircraftSearch',
      sourceField: 'rosterAircraftSource',
      idField: 'rosterAircraftId',
      nameField: 'rosterAircraftName',
      registrationField: 'rosterAircraftRegistration',
      photoUrlField: 'rosterAircraftPhotoUrl',
      photoAttributionField: 'rosterAircraftPhotoAttribution',
      photoLinkbackField: 'rosterAircraftPhotoLinkback',
    }
  }

  if (eventType === 'curated-roster') {
    return {
      enabledField: 'curatedRosterAircraftEnabled',
      searchField: 'curatedRosterAircraftSearch',
      sourceField: 'curatedRosterAircraftSource',
      idField: 'curatedRosterAircraftId',
      nameField: 'curatedRosterAircraftName',
      registrationField: 'curatedRosterAircraftRegistration',
      photoUrlField: 'curatedRosterAircraftPhotoUrl',
      photoAttributionField: 'curatedRosterAircraftPhotoAttribution',
      photoLinkbackField: 'curatedRosterAircraftPhotoLinkback',
    }
  }

  return null
}

function getEventBonusPointsField(eventType: EventType): BonusField {
  switch (eventType) {
    case 'tour':
      return 'tourBonusPoints'
    case 'roster':
      return 'rosterBonusPoints'
    case 'curated-roster':
      return 'curatedRosterBonusPoints'
    case 'community-challenge':
      return 'challengeBonusPoints'
    case 'community-goal':
      return 'communityGoalBonusPoints'
    default:
      return 'focusBonusPoints'
  }
}

function getEventRegistrationField(eventType: EventType): RegistrationField {
  switch (eventType) {
    case 'tour':
      return 'tourRegistrationRequired'
    case 'roster':
      return 'rosterRegistrationRequired'
    case 'curated-roster':
      return 'curatedRosterRegistrationRequired'
    case 'community-challenge':
      return 'challengeRegistrationRequired'
    case 'community-goal':
      return 'communityGoalRegistrationRequired'
    default:
      return 'focusRegistrationRequired'
  }
}

function getDisplayedBackgroundName(
  backgroundInfo: BackgroundInfo,
  strings: InterfaceCopy,
  isAutoSelectingBackground: boolean,
  eventType: EventType,
  backgroundMode: 'auto' | 'manual',
) {
  if (backgroundMode === 'auto' && isRouteEvent(eventType)) {
    return strings.tourAutoVisualDisplay
  }

  if (backgroundMode === 'auto' && isCommunityEvent(eventType)) {
    return strings.communityAutoVisualDisplay
  }

  if (isAutoSelectingBackground) {
    return strings.autoBackgroundLoadingLabel
  }

  switch (backgroundInfo.kind) {
    case 'auto':
      return `${strings.autoBackgroundDisplayPrefix}${backgroundInfo.label}`
    case 'manual':
      return backgroundInfo.label
    case 'auto-empty':
      return strings.autoBackgroundEmptyLabel
    case 'auto-error':
      return strings.autoBackgroundErrorLabel
    case 'fallback':
    default:
      return strings.defaultBackgroundDisplay
  }
}

function getVisualSectionCopy(eventType: EventType, strings: InterfaceCopy) {
  if (isRouteEvent(eventType)) {
    return {
      label: strings.tourVisualLabel,
      help: strings.tourVisualHelp,
    }
  }

  if (isCommunityEvent(eventType)) {
    return {
      label: strings.communityVisualLabel,
      help: strings.communityVisualHelp,
    }
  }

  return {
    label: strings.cityPhotoLabel,
    help: strings.cityPhotoHelp,
  }
}

function getEventName(eventType: EventType, strings: InterfaceCopy) {
  if (eventType === 'tour') {
    return strings.tourEventName
  }

  if (eventType === 'roster') {
    return strings.rosterEventName
  }

  if (eventType === 'curated-roster') {
    return strings.curatedRosterEventName
  }

  if (eventType === 'community-challenge') {
    return strings.communityChallengeEventName
  }

  if (eventType === 'community-goal') {
    return strings.communityGoalEventName
  }

  return strings.focusAirportEventName
}

function parseTourLegs(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((leg) => leg.trim())
    .filter(Boolean)
    .map((leg) => leg.replace(/\s*(?:->|→|[-–—])\s*/g, ' - ').replace(/\s+/g, ' ').toUpperCase())
}

function parseTourLegPairs(value: string) {
  return parseTourLegs(value).flatMap((leg) => {
    const [from, to] = leg.split(' - ').map((segment) => segment.trim())

    if (!from || !to) {
      return []
    }

    return [
      {
        from,
        to,
      },
    ]
  })
}

function getTourStops(legs: TourLegPair[]) {
  const stops: string[] = []

  for (const leg of legs) {
    if (stops[stops.length - 1] !== leg.from) {
      stops.push(leg.from)
    }

    if (stops[stops.length - 1] !== leg.to) {
      stops.push(leg.to)
    }
  }

  return stops
}

function createAirportCoordinateLookup(records: AirportCoordinateRecord[]) {
  const lookup = new Map<string, AirportCoordinate>()

  for (const record of records) {
    if (typeof record.latitude !== 'number' || typeof record.longitude !== 'number') {
      continue
    }

    const coordinate = {
      latitude: record.latitude,
      longitude: record.longitude,
    }
    const normalizedIcao = record.icao?.trim().toUpperCase()
    const normalizedIata = record.iata?.trim().toUpperCase()

    if (normalizedIcao && !lookup.has(normalizedIcao)) {
      lookup.set(normalizedIcao, coordinate)
    }

    if (normalizedIata && !lookup.has(normalizedIata)) {
      lookup.set(normalizedIata, coordinate)
    }
  }

  return lookup
}

function getTourMapPoint(code: string) {
  const normalizedCode = code.trim().toUpperCase()
  const airportCoordinate = airportCoordinateLookup.get(normalizedCode)

  if (!airportCoordinate) {
    return null
  }

  const projectedPoint = tourMapProjection([airportCoordinate.longitude, airportCoordinate.latitude])

  if (!projectedPoint) {
    return null
  }

  return {
    code: normalizedCode,
    latitude: airportCoordinate.latitude,
    longitude: airportCoordinate.longitude,
    x: projectedPoint[0],
    y: projectedPoint[1],
  }
}

function buildTourSegmentPath(fromPoint: TourMapPoint, toPoint: TourMapPoint) {
  const interpolate = geoInterpolate(
    [fromPoint.longitude, fromPoint.latitude],
    [toPoint.longitude, toPoint.latitude],
  )
  const segments = Math.max(24, Math.ceil(Math.hypot(fromPoint.x - toPoint.x, fromPoint.y - toPoint.y) / 20))
  let path = ''

  for (let segmentIndex = 0; segmentIndex <= segments; segmentIndex += 1) {
    const interpolatedPoint = interpolate(segmentIndex / segments)
    const projectedPoint = tourMapProjection(interpolatedPoint)

    if (!projectedPoint) {
      continue
    }

    path += `${segmentIndex === 0 ? 'M' : 'L'} ${projectedPoint[0].toFixed(1)} ${projectedPoint[1].toFixed(1)} `
  }

  return path.trim()
}

function getTourMapData(legs: TourLegPair[]) {
  const pointsByCode = new Map<string, TourMapPoint>()
  const points: TourMapPoint[] = []
  const segments: TourMapSegment[] = []

  for (const code of getTourStops(legs)) {
    const point = getTourMapPoint(code)

    if (!point) {
      continue
    }

    pointsByCode.set(code, point)
    points.push(point)
  }

  legs.forEach((leg, index) => {
    const fromPoint = pointsByCode.get(leg.from)
    const toPoint = pointsByCode.get(leg.to)

    if (!fromPoint || !toPoint) {
      return
    }

    segments.push({
      key: `${leg.from}-${leg.to}-${index}`,
      path: buildTourSegmentPath(fromPoint, toPoint),
    })
  })

  return {
    points,
    segments,
  }
}

function getTourMapViewport(points: TourMapPoint[]): TourMapViewport {
  if (points.length === 0) {
    return {
      scale: 1,
      translateX: 0,
      translateY: 0,
    }
  }

  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const routeWidth = Math.max(maxX - minX, tourMapViewBox.width * 0.06)
  const routeHeight = Math.max(maxY - minY, tourMapViewBox.height * 0.06)
  const contextPaddingX = Math.max(96, routeWidth * 1.12)
  const contextPaddingY = Math.max(82, routeHeight * 1.26)
  const viewportMinX = clamp(minX - contextPaddingX, 0, tourMapViewBox.width)
  const viewportMaxX = clamp(maxX + contextPaddingX, 0, tourMapViewBox.width)
  const viewportMinY = clamp(minY - contextPaddingY, 0, tourMapViewBox.height)
  const viewportMaxY = clamp(maxY + contextPaddingY, 0, tourMapViewBox.height)
  const viewportWidth = Math.max(viewportMaxX - viewportMinX, tourMapViewBox.width * 0.21)
  const viewportHeight = Math.max(viewportMaxY - viewportMinY, tourMapViewBox.height * 0.24)
  const scale = clamp(
    Math.min(tourMapViewBox.width / viewportWidth, tourMapViewBox.height / viewportHeight),
    1,
    4.25,
  )
  const viewportCenterX = (viewportMinX + viewportMaxX) / 2
  const viewportCenterY = (viewportMinY + viewportMaxY) / 2
  const targetCenterX = tourMapViewBox.width * 0.63
  const targetCenterY = tourMapViewBox.height * 0.53

  return {
    scale,
    translateX: targetCenterX - viewportCenterX * scale,
    translateY: targetCenterY - viewportCenterY * scale,
  }
}

function getViewportPoint(point: TourMapPoint, viewport: TourMapViewport) {
  return {
    x: point.x * viewport.scale + viewport.translateX,
    y: point.y * viewport.scale + viewport.translateY,
  }
}

function getTourMapLabelPosition(point: { x: number; y: number }) {
  const textAnchor: 'start' | 'middle' | 'end' =
    point.x < 120 ? 'start' : point.x > tourMapViewBox.width - 120 ? 'end' : 'middle'

  return {
    textAnchor,
    x: textAnchor === 'start' ? 7 : textAnchor === 'end' ? -7 : 0,
    y: point.y > tourMapViewBox.height - 124 ? -9 : -12,
  }
}

function TourRouteMap({ legs }: { legs: TourLegPair[] }) {
  const { points, segments } = getTourMapData(legs)
  const viewport = getTourMapViewport(points)

  return (
    <div className="banner-tour-map" aria-hidden="true">
      <svg
        className="banner-tour-map-svg"
        viewBox={`0 0 ${tourMapViewBox.width} ${tourMapViewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="tour-route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
            <stop offset="34%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
          </linearGradient>
        </defs>

        <g transform={`translate(${viewport.translateX.toFixed(1)} ${viewport.translateY.toFixed(1)}) scale(${viewport.scale.toFixed(3)})`}>
          <path className="banner-tour-map-graticule" d={tourMapGraticulePath} vectorEffect="non-scaling-stroke" />
          <path className="banner-tour-map-land" d={tourMapLandPath} vectorEffect="non-scaling-stroke" />

          {segments.map((segment) => (
            <path key={segment.key} className="banner-tour-map-route" d={segment.path} vectorEffect="non-scaling-stroke" />
          ))}
        </g>

        {points.map((point, index) => {
          const isEndpoint = index === 0 || index === points.length - 1
          const displayPoint = getViewportPoint(point, viewport)
          const labelPosition = getTourMapLabelPosition(displayPoint)

          return (
            <g key={`${point.code}-${index}`} transform={`translate(${displayPoint.x} ${displayPoint.y})`}>
              <circle className="banner-tour-map-node-ring" r={isEndpoint ? 9.5 : 8} />
              <circle className={`banner-tour-map-node-core${isEndpoint ? ' is-endpoint' : ''}`} r={isEndpoint ? 3.5 : 2.8} />
              <text
                className="banner-tour-map-label"
                x={labelPosition.x}
                y={labelPosition.y}
                textAnchor={labelPosition.textAnchor}
              >
                {point.code}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function getCommunityCountTypeMeta(locale: Locale, countType: ChallengeCountType) {
  return communityCountTypeLabels[locale][countType]
}

function formatTargetAmount(value: string, locale: Locale) {
  const normalizedValue = value.trim().replace(',', '.')

  if (!normalizedValue) {
    return '0'
  }

  const parsedValue = Number(normalizedValue)

  if (!Number.isFinite(parsedValue)) {
    return value.trim()
  }

  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(parsedValue)
}

function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const [eventType, setEventType] = useState<EventType>(() => {
    if (typeof window === 'undefined') {
      return 'focus-airport'
    }

    const storedEventType = window.localStorage.getItem('banner-generator-event-type')

    if (
      storedEventType === 'tour' ||
      storedEventType === 'roster' ||
      storedEventType === 'curated-roster' ||
      storedEventType === 'community-challenge' ||
      storedEventType === 'community-goal'
    ) {
      return storedEventType
    }

    return 'focus-airport'
  })
  const [brandKey, setBrandKey] = useState<BrandKey>(() => {
    if (typeof window === 'undefined') {
      return 'nordwind'
    }

    return window.localStorage.getItem('banner-generator-brand') === 'rag' ? 'rag' : 'nordwind'
  })
  const [initialStoredSettings] = useState(() => loadStoredBannerSettings(getInitialLocale()))
  const [form, setForm] = useState<BannerFormState>(initialStoredSettings.form)
  const [backgroundMode, setBackgroundMode] = useState<'auto' | 'manual'>('auto')
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(defaultBackgroundAsset)
  const [logoOverlayOpacity, setLogoOverlayOpacity] = useState<number>(1)
  const [backgroundInfo, setBackgroundInfo] = useState<BackgroundInfo>({ kind: 'fallback' })
  const [autoBackgroundOptions, setAutoBackgroundOptions] = useState<AutoBackgroundOption[]>([])
  const [favoriteBackgrounds, setFavoriteBackgrounds] = useState<FavoriteBackground[]>(loadFavoriteBackgrounds)
  const [activeFavoriteKey, setActiveFavoriteKey] = useState<string | null>(null)
  const [autoBackgroundRefreshVersion, setAutoBackgroundRefreshVersion] = useState(0)
  const [isApplyingFavoriteBackground, setIsApplyingFavoriteBackground] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isAutoSelectingBackground, setIsAutoSelectingBackground] = useState(false)
  const [isSyncingAircraftCatalog, setIsSyncingAircraftCatalog] = useState(false)
  const [aircraftOptions, setAircraftOptions] = useState<AircraftCatalogItem[]>([])
  const [isLoadingAircraftOptions, setIsLoadingAircraftOptions] = useState(false)
  const [aircraftPhotoOptions, setAircraftPhotoOptions] = useState<AircraftPhotoOption[]>([])
  const [isLoadingAircraftPhotos, setIsLoadingAircraftPhotos] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [archiveItems, setArchiveItems] = useState<CreationGalleryItem[]>([])
  const [archiveError, setArchiveError] = useState('')
  const [previewScale, setPreviewScale] = useState(0.5)
  const [communityTeams, setCommunityTeams] = useState<CommunityTeam[]>(initialStoredSettings.communityTeams)

  const previewRef = useRef<HTMLDivElement | null>(null)
  const previewViewportRef = useRef<HTMLDivElement | null>(null)
  const uploadedBackgroundUrlRef = useRef<string | null>(null)
  const autoBackgroundCacheRef = useRef<Map<string, CachedAutoBackground>>(new Map())
  const favoriteBackgroundAssetUrlsRef = useRef<Map<string, string>>(new Map())
  const aircraftSyncAttemptedSourcesRef = useRef<Set<AircraftSource>>(new Set())
  const strings = interfaceCopy[locale]
  const guideStrings = guideCopy[locale]
  const activeEvent = eventDefinitions[eventType]
  const activeEventName = getEventName(eventType, strings)
  const activeBrand = brandDefinitions[brandKey]
  const activeBrandSource = brandSourceMap[brandKey]
  const visualSectionCopy = getVisualSectionCopy(eventType, strings)
  const aircraftFieldConfig = getAircraftFieldConfig(eventType)
  const displayedBackgroundName = getDisplayedBackgroundName(
    backgroundInfo,
    strings,
    isAutoSelectingBackground,
    eventType,
    backgroundMode,
  )
  const displayedLogoName = `${strings.defaultLogoDisplayPrefix}${activeBrand.fullName}`
  const logoAriaLabel = `${activeBrand.fullName} ${strings.logoAriaLabel.toLowerCase()}`
  const selectedAutoBackgroundOption =
    autoBackgroundOptions.find((option) => option.objectUrl === backgroundUrl) ??
    autoBackgroundOptions.find((option) => backgroundInfo.kind === 'auto' && option.label === backgroundInfo.label) ??
    null
  const isFavoriteBackgroundSaved = !!selectedAutoBackgroundOption?.sourceUrl && favoriteBackgrounds.some(
    (favoriteBackground) => favoriteBackground.sourceUrl === selectedAutoBackgroundOption.sourceUrl,
  )
  const currentSearchKey = getAutoBackgroundSearchKey(form, eventType)
  const activeAircraftSearch = aircraftFieldConfig ? form[aircraftFieldConfig.searchField].trim() : ''
  const activeAircraftEnabled = aircraftFieldConfig ? form[aircraftFieldConfig.enabledField] : false
  const activeAircraftSource = aircraftFieldConfig
    ? ((form[aircraftFieldConfig.sourceField].trim().toLowerCase() as AircraftSource) || activeBrandSource)
    : activeBrandSource
  const activeAircraftId = aircraftFieldConfig ? form[aircraftFieldConfig.idField].trim() : ''
  const activeAircraftName = aircraftFieldConfig ? form[aircraftFieldConfig.nameField].trim() : ''
  const activeAircraftRegistration = aircraftFieldConfig ? form[aircraftFieldConfig.registrationField].trim().toUpperCase() : ''
  const activeAircraftPhotoUrl = aircraftFieldConfig ? form[aircraftFieldConfig.photoUrlField].trim() : ''
  const activeAircraftPhotoAttribution = aircraftFieldConfig ? form[aircraftFieldConfig.photoAttributionField].trim() : ''
  const activeAircraftPhotoLinkback = aircraftFieldConfig ? form[aircraftFieldConfig.photoLinkbackField].trim() : ''

  useEffect(() => {
    return () => {
      if (uploadedBackgroundUrlRef.current) {
        URL.revokeObjectURL(uploadedBackgroundUrlRef.current)
      }

      for (const cachedBackground of autoBackgroundCacheRef.current.values()) {
        for (const option of cachedBackground.options) {
          URL.revokeObjectURL(option.objectUrl)
        }
      }

      for (const cachedObjectUrl of favoriteBackgroundAssetUrlsRef.current.values()) {
        URL.revokeObjectURL(cachedObjectUrl)
      }
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(favoriteBackgroundsStorageKey, JSON.stringify(favoriteBackgrounds))
  }, [favoriteBackgrounds])

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem('banner-generator-locale', locale)
  }, [locale])

  useEffect(() => {
    window.localStorage.removeItem('banner-generator-banner-locale')
  }, [])

  useEffect(() => {
    window.localStorage.setItem('banner-generator-event-type', eventType)
  }, [eventType])

  useEffect(() => {
    window.localStorage.setItem('banner-generator-brand', brandKey)
  }, [brandKey])

  useEffect(() => {
    const storedSettings: StoredBannerSettings = {
      form,
      communityTeams,
    }

    window.localStorage.setItem(bannerSettingsStorageKey, JSON.stringify(storedSettings))
  }, [form, communityTeams])

  useEffect(() => {
    if (!aircraftFieldConfig || !activeAircraftEnabled) {
      setAircraftOptions([])
      setAircraftPhotoOptions([])
      return
    }

    const sourcesToSync = aircraftCatalogSources.filter(
      (source) => !aircraftSyncAttemptedSourcesRef.current.has(source),
    )

    if (sourcesToSync.length === 0) {
      return
    }

    for (const source of sourcesToSync) {
      aircraftSyncAttemptedSourcesRef.current.add(source)
    }

    let ignoreResult = false

    void (async () => {
      setIsSyncingAircraftCatalog(true)

      try {
        await syncAircraftCatalogs(sourcesToSync)
      } catch {
        if (!ignoreResult) {
          setAircraftOptions([])
        }
      } finally {
        if (!ignoreResult) {
          setIsSyncingAircraftCatalog(false)
        }
      }
    })()

    return () => {
      ignoreResult = true
    }
  }, [activeAircraftEnabled, eventType])

  useEffect(() => {
    if (!aircraftFieldConfig || !activeAircraftEnabled) {
      setAircraftOptions([])
      return
    }

    const controller = new AbortController()
    let ignoreResult = false

    const timeoutId = window.setTimeout(async () => {
      setIsLoadingAircraftOptions(true)

      try {
        const items = await fetchAircraftCatalog(
          activeAircraftSearch,
          aircraftCatalogSources,
          controller.signal,
          activeAircraftSearch ? 16 : 24,
        )

        if (!ignoreResult) {
          setAircraftOptions(items)
        }
      } catch {
        if (!ignoreResult && !controller.signal.aborted) {
          setAircraftOptions([])
        }
      } finally {
        if (!ignoreResult) {
          setIsLoadingAircraftOptions(false)
        }
      }
    }, 220)

    return () => {
      ignoreResult = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [activeAircraftEnabled, activeAircraftSearch, eventType])

  useEffect(() => {
    if (!aircraftFieldConfig || !activeAircraftEnabled || !activeAircraftRegistration) {
      setAircraftPhotoOptions([])
      return
    }

    let ignoreResult = false

    void (async () => {
      setIsLoadingAircraftPhotos(true)

      try {
        const photoItems = await fetchAircraftPhotoOptions(activeAircraftRegistration, activeAircraftSource, activeAircraftId)

        if (!ignoreResult) {
          setAircraftPhotoOptions(photoItems)

          if (photoItems.length > 0) {
            const selectedPhoto = photoItems.find((item) => item.image_url === activeAircraftPhotoUrl) ?? photoItems[0]

            updateField(aircraftFieldConfig.photoUrlField, selectedPhoto.image_url)
            updateField(aircraftFieldConfig.photoAttributionField, selectedPhoto.attribution ?? '')
            updateField(aircraftFieldConfig.photoLinkbackField, selectedPhoto.linkback ?? '')
          }
        }
      } catch {
        if (!ignoreResult) {
          setAircraftPhotoOptions([])
        }
      } finally {
        if (!ignoreResult) {
          setIsLoadingAircraftPhotos(false)
        }
      }
    })()

    return () => {
      ignoreResult = true
    }
  }, [
    activeAircraftEnabled,
    activeAircraftId,
    activeAircraftPhotoUrl,
    activeAircraftRegistration,
    activeAircraftSource,
    eventType,
  ])

  useEffect(() => {
    if (!isArchiveOpen) {
      return
    }

    let ignoreResult = false
    setArchiveError('')

    void (async () => {
      try {
        const items = await fetchCreationArchive()

        if (!ignoreResult) {
          setArchiveItems(items)
        }
      } catch {
        if (!ignoreResult) {
          setArchiveItems([])
          setArchiveError(guideStrings.archiveLoadError)
        }
      }
    })()

    return () => {
      ignoreResult = true
    }
  }, [isArchiveOpen, guideStrings.archiveLoadError])

  useLayoutEffect(() => {
    const viewport = previewViewportRef.current

    if (!viewport) {
      return
    }

    const updatePreviewScale = () => {
      const viewportWidth = viewport.clientWidth

      if (!viewportWidth) {
        return
      }

      setPreviewScale(Math.min(1, viewportWidth / 1920))
    }

    updatePreviewScale()

    const resizeObserver = new ResizeObserver(() => updatePreviewScale())
    resizeObserver.observe(viewport)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (backgroundMode !== 'auto') {
      return
    }

    if (eventType !== 'focus-airport') {
      setAutoBackgroundOptions([])
      setBackgroundUrl(null)
      setBackgroundInfo({ kind: 'fallback' })
      setIsAutoSelectingBackground(false)
      return
    }

    const searchKey = getAutoBackgroundSearchKey(form, eventType)
    const cachedBackground = autoBackgroundCacheRef.current.get(searchKey)

    if (cachedBackground) {
      setAutoBackgroundOptions(cachedBackground.options)

      const selectedOption = cachedBackground.options[0]

      if (selectedOption) {
        setBackgroundUrl(selectedOption.objectUrl)
        setBackgroundInfo({ kind: 'auto', label: selectedOption.label })
      } else {
        setBackgroundUrl(defaultBackgroundAsset)
        setBackgroundInfo({ kind: 'auto-empty' })
      }

      setIsAutoSelectingBackground(false)
      return
    }

    const controller = new AbortController()
    let ignoreResult = false

    const timeoutId = window.setTimeout(async () => {
      setIsAutoSelectingBackground(true)

      try {
        const candidates = await fetchAutoBackgroundCandidates(form, controller.signal)

        if (candidates.length === 0) {
          if (!ignoreResult) {
            setAutoBackgroundOptions([])
            setBackgroundUrl(defaultBackgroundAsset)
            setBackgroundInfo({ kind: 'auto-empty' })
          }

          return
        }

        const optionResults = await Promise.allSettled(
          candidates.map(async (candidate) => {
            const imageResponse = await fetch(candidate.thumbUrl, { mode: 'cors', signal: controller.signal })

            if (!imageResponse.ok) {
              throw new Error('Auto background image request failed')
            }

            const imageBlob = await imageResponse.blob()

            return {
              key: slugify(candidate.title) || candidate.title,
              objectUrl: URL.createObjectURL(imageBlob),
              label: cleanWikimediaTitle(candidate.title),
              sourceUrl: candidate.thumbUrl,
            }
          }),
        )

        const options = optionResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))

        if (options.length === 0) {
          throw new Error('No usable auto background options were loaded')
        }

        autoBackgroundCacheRef.current.set(searchKey, {
          options,
        })

        if (!ignoreResult) {
          setAutoBackgroundOptions(options)
          setBackgroundUrl(options[0].objectUrl)
          setBackgroundInfo({ kind: 'auto', label: options[0].label })
          setActiveFavoriteKey(null)
        }
      } catch {
        if (!ignoreResult && !controller.signal.aborted) {
          setAutoBackgroundOptions([])
          setBackgroundUrl(defaultBackgroundAsset)
          setBackgroundInfo({ kind: 'auto-error' })
        }
      } finally {
        if (!ignoreResult) {
          setIsAutoSelectingBackground(false)
        }
      }
    }, 420)

    return () => {
      ignoreResult = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [backgroundMode, eventType, form.airportName, form.city, form.countryCode, autoBackgroundRefreshVersion])

  function updateField<K extends keyof BannerFormState>(field: K, value: BannerFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function toggleAircraftAssignment(enabled: boolean) {
    if (!aircraftFieldConfig) {
      return
    }

    updateField(aircraftFieldConfig.enabledField, enabled)

    if (!enabled) {
      updateField(aircraftFieldConfig.searchField, '')
      updateField(aircraftFieldConfig.sourceField, '')
      updateField(aircraftFieldConfig.idField, '')
      updateField(aircraftFieldConfig.nameField, '')
      updateField(aircraftFieldConfig.registrationField, '')
      updateField(aircraftFieldConfig.photoUrlField, '')
      updateField(aircraftFieldConfig.photoAttributionField, '')
      updateField(aircraftFieldConfig.photoLinkbackField, '')
      setAircraftOptions([])
      setAircraftPhotoOptions([])
    }
  }

  function selectAircraftOption(option: AircraftCatalogItem) {
    if (!aircraftFieldConfig) {
      return
    }

    updateField(aircraftFieldConfig.sourceField, option.source)
    updateField(aircraftFieldConfig.idField, option.aircraft_id ? String(option.aircraft_id) : '')
    updateField(aircraftFieldConfig.nameField, option.name)
    updateField(aircraftFieldConfig.registrationField, option.registration)
    updateField(aircraftFieldConfig.photoUrlField, option.image_url ?? '')
    updateField(aircraftFieldConfig.photoAttributionField, option.image_attribution ?? '')
    updateField(aircraftFieldConfig.photoLinkbackField, option.image_linkback ?? '')
  }

  function selectAircraftPhotoOption(option: AircraftPhotoOption) {
    if (!aircraftFieldConfig) {
      return
    }

    updateField(aircraftFieldConfig.photoUrlField, option.image_url)
    updateField(aircraftFieldConfig.photoAttributionField, option.attribution ?? '')
    updateField(aircraftFieldConfig.photoLinkbackField, option.linkback ?? '')
  }

  function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (uploadedBackgroundUrlRef.current) {
      URL.revokeObjectURL(uploadedBackgroundUrlRef.current)
    }

    const localUrl = URL.createObjectURL(file)
    uploadedBackgroundUrlRef.current = localUrl
    setBackgroundMode('manual')
    setBackgroundUrl(localUrl)
    setBackgroundInfo({ kind: 'manual', label: file.name })
    setActiveFavoriteKey(null)
    setErrorMessage('')
    event.target.value = ''
  }

  function clearAutoBackgroundCacheEntry(searchKey: string) {
    const cachedBackground = autoBackgroundCacheRef.current.get(searchKey)

    if (!cachedBackground) {
      return
    }

    for (const option of cachedBackground.options) {
      URL.revokeObjectURL(option.objectUrl)
    }

    autoBackgroundCacheRef.current.delete(searchKey)
  }

  function clearBackground() {
    if (uploadedBackgroundUrlRef.current) {
      URL.revokeObjectURL(uploadedBackgroundUrlRef.current)
      uploadedBackgroundUrlRef.current = null
    }

    setBackgroundMode('auto')
    setBackgroundUrl(eventType === 'focus-airport' ? defaultBackgroundAsset : null)
    setBackgroundInfo({ kind: 'fallback' })
    setActiveFavoriteKey(null)
    setErrorMessage('')
  }

  function selectAutoBackgroundOption(option: AutoBackgroundOption) {
    setBackgroundMode('auto')
    setBackgroundUrl(option.objectUrl)
    setBackgroundInfo({ kind: 'auto', label: option.label })
    setActiveFavoriteKey(null)
    setErrorMessage('')
  }

  function randomizeAutoBackgroundOption() {
    if (autoBackgroundOptions.length === 0) {
      return
    }

    const alternativeOptions = autoBackgroundOptions.filter((option) => option.objectUrl !== backgroundUrl)
    const nextOptionsPool = alternativeOptions.length > 0 ? alternativeOptions : autoBackgroundOptions
    const nextOption = nextOptionsPool[Math.floor(Math.random() * nextOptionsPool.length)]

    if (!nextOption) {
      return
    }

    selectAutoBackgroundOption(nextOption)
  }

  function regenerateAutoBackgroundOptions() {
    if (eventType !== 'focus-airport') {
      return
    }

    clearAutoBackgroundCacheEntry(currentSearchKey)
    setAutoBackgroundOptions([])
    setBackgroundMode('auto')
    setBackgroundUrl(defaultBackgroundAsset)
    setBackgroundInfo({ kind: 'fallback' })
    setActiveFavoriteKey(null)
    setAutoBackgroundRefreshVersion((currentValue) => currentValue + 1)
    setErrorMessage('')
  }

  function saveCurrentBackgroundToFavorites() {
    if (!selectedAutoBackgroundOption) {
      return
    }

    const favoriteBackground: FavoriteBackground = {
      key: `${selectedAutoBackgroundOption.key}-${selectedAutoBackgroundOption.sourceUrl}`,
      label: selectedAutoBackgroundOption.label,
      sourceUrl: selectedAutoBackgroundOption.sourceUrl,
      createdAt: Date.now(),
    }

    setFavoriteBackgrounds((currentFavorites) =>
      [favoriteBackground, ...currentFavorites.filter((item) => item.sourceUrl !== favoriteBackground.sourceUrl)].slice(
        0,
        maxFavoriteBackgrounds,
      ),
    )
  }

  async function activateFavoriteBackground(favoriteBackground: FavoriteBackground) {
    setIsApplyingFavoriteBackground(true)
    setErrorMessage('')

    try {
      let objectUrl = favoriteBackgroundAssetUrlsRef.current.get(favoriteBackground.sourceUrl)

      if (!objectUrl) {
        const imageResponse = await fetch(favoriteBackground.sourceUrl, { mode: 'cors' })

        if (!imageResponse.ok) {
          throw new Error('Favorite background fetch failed')
        }

        const imageBlob = await imageResponse.blob()
        objectUrl = URL.createObjectURL(imageBlob)
        favoriteBackgroundAssetUrlsRef.current.set(favoriteBackground.sourceUrl, objectUrl)
      }

      setBackgroundMode('manual')
      setBackgroundUrl(objectUrl)
      setBackgroundInfo({ kind: 'manual', label: favoriteBackground.label })
      setActiveFavoriteKey(favoriteBackground.key)
    } catch {
      setErrorMessage(strings.backgroundFavoriteLoadError)
    } finally {
      setIsApplyingFavoriteBackground(false)
    }
  }

  function removeFavoriteBackground(favoriteKey: string) {
    setFavoriteBackgrounds((currentFavorites) => currentFavorites.filter((favoriteBackground) => favoriteBackground.key !== favoriteKey))

    if (activeFavoriteKey === favoriteKey) {
      setActiveFavoriteKey(null)
    }
  }

  function updateCommunityTeam<K extends keyof CommunityTeam>(
    teamId: number,
    field: K,
    value: CommunityTeam[K],
  ) {
    setCommunityTeams((currentTeams) =>
      currentTeams.map((team) => {
        if (team.id !== teamId) {
          return team
        }

        return {
          ...team,
          [field]: value,
        }
      }),
    )
  }

  function addCommunityTeam() {
    setCommunityTeams((currentTeams) => {
      if (currentTeams.length >= maxCommunityTeams) {
        return currentTeams
      }

      const nextId = currentTeams.reduce((maxId, team) => Math.max(maxId, team.id), 0) + 1

      return [
        ...currentTeams,
        {
          id: nextId,
          name: '',
          countType: 'flights',
          targetAmount: '',
        },
      ]
    })
  }

  function removeCommunityTeam(teamId: number) {
    setCommunityTeams((currentTeams) => {
      if (currentTeams.length <= 1) {
        return currentTeams
      }

      return currentTeams.filter((team) => team.id !== teamId)
    })
  }

  async function exportBanner() {
    if (!previewRef.current) {
      return
    }

    setIsExporting(true)
    setErrorMessage('')

    try {
      await document.fonts.ready
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)))

      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 1,
        canvasWidth: 1920,
        canvasHeight: 1080,
        width: 1920,
        height: 1080,
      })
      const currentRouteConfig = isRouteEvent(eventType) ? getRouteEventFormConfig(eventType, strings) : null

      const link = document.createElement('a')
      const primaryTitle =
        isRouteEvent(eventType) && currentRouteConfig
          ? form[currentRouteConfig.titleField]
          : eventType === 'community-challenge'
          ? form.challengeName
          : eventType === 'community-goal'
            ? form.communityGoalName
            : form.city
      const safeTitle = slugify(primaryTitle) || activeEvent.exportSlug
      const safeIcao = form.icao.trim().toUpperCase() || 'ICAO'
      const exportTail =
        isRouteEvent(eventType)
          ? 'route'
          : eventType === 'community-challenge'
          ? 'teams'
          : eventType === 'community-goal'
            ? 'goal'
            : safeIcao

      link.download = `${activeEvent.exportSlug}-${activeBrand.exportSlug}-${safeTitle}-${exportTail}.png`
      link.href = dataUrl
      link.click()

      void archiveCreation({
        eventType,
        brand: brandKey,
        title: primaryTitle,
        description:
          isRouteEvent(eventType) && currentRouteConfig
            ? form[currentRouteConfig.descriptionField].trim() || null
            : eventType === 'community-goal'
              ? form.communityGoalName
              : eventType === 'community-challenge'
                ? form.challengeName
                : form.airportName.trim() || null,
        imageDataUrl: dataUrl,
        metadata: {
          brandSource: activeBrandSource,
          bonusPoints: normalizedBonusPoints,
          registrationRequired,
          city: form.city,
          countryCode: normalizedCountryCode,
          icao: normalizedIcao,
          airportName: normalizedAirportName,
          routeLegs: parsedRouteLegs,
          routeStops,
          aircraftSource: activeAircraftSource,
          aircraftName: activeAircraftName,
          aircraftRegistration: activeAircraftRegistration,
          communityTeams: visibleCommunityTeams,
          communityGoalCountType: form.communityGoalCountType,
          communityGoalTargetAmount: form.communityGoalTargetAmount,
        },
      }).catch(() => undefined)
    } catch {
      setErrorMessage(strings.exportError)
    } finally {
      setIsExporting(false)
    }
  }

  const isRouteEventActive = isRouteEvent(eventType)
  const isCommunityEventActive = isCommunityEvent(eventType)
  const routeEventConfig = isRouteEventActive ? getRouteEventFormConfig(eventType, strings) : null
  const bannerRouteEventConfig = routeEventConfig

  const primaryTitle =
    isRouteEventActive && routeEventConfig
      ? form[routeEventConfig.titleField]
      : eventType === 'community-challenge'
      ? form.challengeName
      : eventType === 'community-goal'
        ? form.communityGoalName
        : form.city
  const titleLines = splitHeadline(primaryTitle)
  const normalizedCountryCode = (form.countryCode ?? '').trim().toUpperCase() || 'RU'
  const normalizedIcao = form.icao.trim().toUpperCase() || 'ICAO'
  const normalizedAirportName = form.airportName.trim() || 'Airport'
  const normalizedBonusPoints = form[getEventBonusPointsField(eventType)].trim() || '0'
  const registrationRequired = form[getEventRegistrationField(eventType)]
  const routeLegsValue = routeEventConfig ? form[routeEventConfig.legsField] : ''
  const parsedRouteLegs = parseTourLegs(routeLegsValue)
  const parsedRouteLegPairs = parseTourLegPairs(routeLegsValue)
  const routeStops = getTourStops(parsedRouteLegPairs)
  const routeDescription = routeEventConfig ? form[routeEventConfig.descriptionField].trim() : ''
  const routeAircraftRegistration = activeAircraftRegistration
  const visibleCommunityTeams = communityTeams.slice(0, maxCommunityTeams).map((team, index) => {
    const countTypeMeta = getCommunityCountTypeMeta(locale, team.countType)

    return {
      ...team,
      name: team.name.trim() || `${strings.communityTeamFallbackName} ${index + 1}`,
      goalLabel: countTypeMeta.label,
      targetLabel: formatTargetAmount(team.targetAmount, locale),
      unitLabel: countTypeMeta.unit,
    }
  })
  const bannerCommunityTeams = visibleCommunityTeams
  const bannerCommunityGoalCountTypeMeta = getCommunityCountTypeMeta(locale, form.communityGoalCountType)
  const bannerFormattedCommunityGoalTarget = formatTargetAmount(form.communityGoalTargetAmount, locale)
  const countryFlagCode = getFlagAssetCode(normalizedCountryCode)
  const legCountryCodes = parsedRouteLegPairs.flatMap(({ from, to }) => [
    getIcaoCountryCode(from),
    getIcaoCountryCode(to),
  ]).filter((c): c is string => c !== null)
  const showLegFlags = new Set(legCountryCodes).size > 1
  const bannerBackground = backgroundUrl
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(18, 19, 20, 0.72) 0%, rgba(18, 19, 20, 0.48) 34%, rgba(18, 19, 20, 0.16) 76%, rgba(18, 19, 20, 0.03) 100%), url(${backgroundUrl})`,
      }
    : undefined
  const communityTeamsEditor = eventType === 'community-challenge' ? (
    <div className="community-teams-editor">
      <div className="community-team-list">
        {communityTeams.map((team, index) => (
          <div key={team.id} className="community-team-card">
            <div className="community-team-card-header">
              <span className="community-team-index">
                {strings.communityTeamLabel} {index + 1}
              </span>

              <button
                className="ghost-button community-team-remove"
                type="button"
                onClick={() => removeCommunityTeam(team.id)}
                disabled={communityTeams.length <= 1}
              >
                {strings.communityRemoveTeamButton}
              </button>
            </div>

            <div className="community-team-grid">
              <label className="field">
                <span>{strings.communityTeamNameLabel}</span>
                <input
                  type="text"
                  value={team.name}
                  onChange={(event) => updateCommunityTeam(team.id, 'name', event.target.value)}
                  placeholder={`${strings.communityTeamFallbackName} ${index + 1}`}
                />
              </label>

              <label className="field">
                <span>{strings.communityTeamCountTypeLabel}</span>
                <select
                  value={team.countType}
                  onChange={(event) => updateCommunityTeam(team.id, 'countType', event.target.value as ChallengeCountType)}
                >
                  {communityCountTypeOrder.map((countType) => {
                    const countTypeMeta = getCommunityCountTypeMeta(locale, countType)

                    return (
                      <option key={countType} value={countType}>
                        {countTypeMeta.label}
                      </option>
                    )
                  })}
                </select>
              </label>

              <label className="field">
                <span>{strings.communityTeamTargetLabel}</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={team.targetAmount}
                  onChange={(event) => updateCommunityTeam(team.id, 'targetAmount', event.target.value)}
                  placeholder="150"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        className="ghost-button"
        type="button"
        onClick={addCommunityTeam}
        disabled={communityTeams.length >= maxCommunityTeams}
      >
        {strings.communityAddTeamButton}
      </button>
    </div>
  ) : null
  const imageAndLogoControls = (
    <>
      <div className="upload-block">
        <div>
          <span className="upload-title">{visualSectionCopy.label}</span>
          <p className="upload-help">{visualSectionCopy.help}</p>
        </div>

        <label className="upload-button">
          <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
          {strings.choosePhotoButton}
        </label>

        <div className="upload-file">{displayedBackgroundName}</div>

        {eventType === 'focus-airport' && autoBackgroundOptions.length > 0 ? (
          <div className="auto-background-picker">
            <span className="section-mini-title">{strings.backgroundSuggestionsLabel}</span>

            <div className="auto-background-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={randomizeAutoBackgroundOption}
                disabled={autoBackgroundOptions.length === 0 || isAutoSelectingBackground || isApplyingFavoriteBackground}
              >
                {strings.backgroundRandomizeButton}
              </button>

              <button
                className="ghost-button"
                type="button"
                onClick={regenerateAutoBackgroundOptions}
                disabled={isAutoSelectingBackground || isApplyingFavoriteBackground}
              >
                {strings.backgroundRegenerateButton}
              </button>

              <button
                className="ghost-button"
                type="button"
                onClick={saveCurrentBackgroundToFavorites}
                disabled={!selectedAutoBackgroundOption || isAutoSelectingBackground || isApplyingFavoriteBackground || isFavoriteBackgroundSaved}
              >
                {strings.backgroundSaveFavoriteButton}
              </button>
            </div>

            <div className="auto-background-grid">
              {autoBackgroundOptions.map((option) => (
                <button
                  key={option.key}
                  className={`auto-background-card${backgroundUrl === option.objectUrl ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => selectAutoBackgroundOption(option)}
                  aria-pressed={backgroundUrl === option.objectUrl}
                >
                  <span
                    className="auto-background-card-image"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(10, 12, 16, 0.04), rgba(10, 12, 16, 0.28)), url(${option.objectUrl})`,
                    }}
                    aria-hidden="true"
                  ></span>
                  <span className="auto-background-card-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {eventType === 'focus-airport' ? (
          <div className="favorite-background-picker">
            <span className="section-mini-title">{strings.backgroundFavoritesLabel}</span>

            {favoriteBackgrounds.length > 0 ? (
              <div className="favorite-background-grid">
                {favoriteBackgrounds.map((favoriteBackground) => (
                  <article
                    key={favoriteBackground.key}
                    className={`favorite-background-card${activeFavoriteKey === favoriteBackground.key ? ' is-active' : ''}`}
                  >
                    <button
                      className="favorite-background-select"
                      type="button"
                      onClick={() => void activateFavoriteBackground(favoriteBackground)}
                      disabled={isApplyingFavoriteBackground}
                      aria-pressed={activeFavoriteKey === favoriteBackground.key}
                    >
                      <span
                        className="auto-background-card-image"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(10, 12, 16, 0.04), rgba(10, 12, 16, 0.28)), url(${favoriteBackground.sourceUrl})`,
                        }}
                        aria-hidden="true"
                      ></span>
                      <span className="auto-background-card-label">{favoriteBackground.label}</span>
                    </button>

                    <button
                      className="favorite-background-remove"
                      type="button"
                      onClick={() => removeFavoriteBackground(favoriteBackground.key)}
                    >
                      {strings.backgroundRemoveFavoriteButton}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="field-help">{strings.backgroundFavoritesEmptyLabel}</p>
            )}
          </div>
        ) : null}

        {aircraftFieldConfig && activeAircraftEnabled && routeAircraftRegistration ? (
          <div className="aircraft-photo-picker">
            <span className="section-mini-title">{strings.aircraftPhotoLabel}</span>
            <p className="field-help">{strings.aircraftPhotoHelp}</p>

            {aircraftPhotoOptions.length > 0 ? (
              <div className="aircraft-photo-grid">
                {aircraftPhotoOptions.map((option) => (
                  <button
                    key={`${option.provider}-${option.image_url}`}
                    className={`auto-background-card${activeAircraftPhotoUrl === option.image_url ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => selectAircraftPhotoOption(option)}
                    aria-pressed={activeAircraftPhotoUrl === option.image_url}
                  >
                    <span
                      className="auto-background-card-image"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(10, 12, 16, 0.04), rgba(10, 12, 16, 0.28)), url(${option.thumbnail_url ?? option.image_url})`,
                      }}
                      aria-hidden="true"
                    ></span>
                    <span className="auto-background-card-label">{option.provider}</span>
                    {option.attribution ? (
                      <span className="aircraft-photo-attribution">
                        {strings.aircraftPhotoAttributionPrefix}
                        {option.attribution}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : isLoadingAircraftPhotos ? (
              <p className="field-help">{strings.aircraftPhotoHelp}</p>
            ) : (
              <p className="field-help">{strings.aircraftPhotoEmpty}</p>
            )}

            {activeAircraftPhotoAttribution ? (
              <p className="field-help">
                {strings.aircraftPhotoAttributionPrefix}
                {activeAircraftPhotoLinkback ? (
                  <a href={activeAircraftPhotoLinkback} target="_blank" rel="noreferrer">
                    {activeAircraftPhotoAttribution}
                  </a>
                ) : (
                  activeAircraftPhotoAttribution
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        {backgroundMode === 'manual' ? (
          <button className="ghost-button" type="button" onClick={clearBackground}>
            {strings.restoreDefaultBackgroundButton}
          </button>
        ) : null}
      </div>

      <div className="upload-block upload-block-logo">
        <div>
          <span className="upload-title">{strings.logoLabel}</span>
          <p className="upload-help">{strings.logoHelp}</p>
        </div>

        <div className="upload-file">{displayedLogoName}</div>

        <div className="logo-overlay-control">
          <div className="logo-overlay-header">
            <span className="upload-title">{strings.logoOverlayLabel}</span>
            <span className="logo-overlay-value">{Math.round(logoOverlayOpacity * 100)}%</span>
          </div>
          <p className="upload-help">{strings.logoOverlayHelp}</p>
          <input
            className="logo-overlay-range"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={logoOverlayOpacity}
            onChange={(e) => setLogoOverlayOpacity(Number(e.target.value))}
          />
        </div>
      </div>
    </>
  )

  return (
    <div className={`app-shell brand-${brandKey}`}>
      <aside className="control-panel">
        <div className="panel-copy">
          <div className="panel-topbar">
            <span className="panel-kicker">{activeBrand.fullName}</span>

            <div className="panel-topbar-tools">
              <button className="icon-button" type="button" onClick={() => setIsGuideOpen(true)} aria-label={guideStrings.title}>
                ?
              </button>

              <button className="ghost-button panel-archive-button" type="button" onClick={() => setIsArchiveOpen(true)}>
                {guideStrings.archiveTitle}
              </button>

              <div className="language-switcher" role="group" aria-label={strings.interfaceLanguageLabel}>
                <button
                  className={`language-button${locale === 'ru' ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setLocale('ru')}
                  aria-pressed={locale === 'ru'}
                >
                  RU
                </button>
                <button
                  className={`language-button${locale === 'en' ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setLocale('en')}
                  aria-pressed={locale === 'en'}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          <h1>{strings.appTitle}</h1>
          <p>{strings.appDescription}</p>

          <div className="project-switcher-wrap">
            <span className="project-switcher-label">{strings.projectLabel}</span>

            <div className="project-switcher" role="group" aria-label={strings.projectLabel}>
              {brandOrder.map((brandOption) => {
                const brandOptionInfo = brandDefinitions[brandOption]

                return (
                  <button
                    key={brandOption}
                    className={`project-button${brandKey === brandOption ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => setBrandKey(brandOption)}
                    aria-pressed={brandKey === brandOption}
                  >
                    <span className="project-button-title">{brandOptionInfo.fullName}</span>
                    <span className="project-button-code">{brandOptionInfo.shortName}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="project-switcher-wrap">
            <span className="project-switcher-label">{strings.eventTypeLabel}</span>

            <div className="project-switcher" role="group" aria-label={strings.eventTypeLabel}>
              {eventOrder.map((eventOption) => {
                const eventOptionInfo = eventDefinitions[eventOption]

                return (
                  <button
                    key={eventOption}
                    className={`project-button${eventType === eventOption ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => setEventType(eventOption)}
                    aria-pressed={eventType === eventOption}
                  >
                    <span className="project-button-title">{getEventName(eventOption, strings)}</span>
                    <span className="project-button-code">{eventOptionInfo.shortName}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <section className="panel-card">
          <h2>{strings.bannerSettingsTitle}</h2>

          {eventType === 'community-challenge' ? (
            <>
              <label className="field">
                <span>{strings.challengeNameLabel}</span>
                <input
                  type="text"
                  value={form.challengeName}
                  onChange={(event) => updateField('challengeName', event.target.value)}
                  placeholder={strings.challengeNamePlaceholder}
                />
              </label>

              <div className="event-meta-grid">
                <label className="field">
                  <span>{strings.bonusPointsLabel}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.challengeBonusPoints}
                    onChange={(event) => updateField('challengeBonusPoints', event.target.value)}
                    placeholder="350"
                  />
                </label>

                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={form.challengeRegistrationRequired}
                    onChange={(event) => updateField('challengeRegistrationRequired', event.target.checked)}
                  />
                  <span className="toggle-title">{strings.registrationRequiredLabel}</span>
                  <span className="toggle-help">{strings.registrationRequiredHelp}</span>
                </label>
              </div>
            </>
          ) : eventType === 'community-goal' ? (
            <>
              <label className="field">
                <span>{strings.communityGoalNameLabel}</span>
                <input
                  type="text"
                  value={form.communityGoalName}
                  onChange={(event) => updateField('communityGoalName', event.target.value)}
                  placeholder={strings.communityGoalNamePlaceholder}
                />
              </label>

              <div className="field-group">
                <span className="section-mini-title">{strings.communityGoalCountTypeLabel}</span>

                <div className="metric-choice-grid" role="group" aria-label={strings.communityGoalCountTypeLabel}>
                  {communityCountTypeOrder.map((countType) => {
                    const countTypeMeta = getCommunityCountTypeMeta(locale, countType)

                    return (
                      <button
                        key={countType}
                        className={`metric-choice-button${form.communityGoalCountType === countType ? ' is-active' : ''}`}
                        type="button"
                        onClick={() => updateField('communityGoalCountType', countType)}
                        aria-pressed={form.communityGoalCountType === countType}
                      >
                        {countTypeMeta.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="field">
                <span>{strings.communityGoalTargetLabel}</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.communityGoalTargetAmount}
                  onChange={(event) => updateField('communityGoalTargetAmount', event.target.value)}
                  placeholder="1200"
                />
              </label>

              <div className="event-meta-grid">
                <label className="field">
                  <span>{strings.bonusPointsLabel}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.communityGoalBonusPoints}
                    onChange={(event) => updateField('communityGoalBonusPoints', event.target.value)}
                    placeholder="350"
                  />
                </label>

                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={form.communityGoalRegistrationRequired}
                    onChange={(event) => updateField('communityGoalRegistrationRequired', event.target.checked)}
                  />
                  <span className="toggle-title">{strings.registrationRequiredLabel}</span>
                  <span className="toggle-help">{strings.registrationRequiredHelp}</span>
                </label>
              </div>

              <p className="field-help">{strings.communityGoalHelp}</p>
            </>
          ) : isRouteEventActive && routeEventConfig ? (
            <>
              <label className="field">
                <span>{routeEventConfig.titleLabel}</span>
                <input
                  type="text"
                  value={form[routeEventConfig.titleField]}
                  onChange={(event) => updateField(routeEventConfig.titleField, event.target.value)}
                  placeholder={routeEventConfig.titlePlaceholder}
                />
              </label>

              <div className="field-group">
                <label className="field">
                  <span>{strings.tourLegsLabel}</span>
                  <textarea
                    rows={5}
                    value={form[routeEventConfig.legsField]}
                    onChange={(event) => updateField(routeEventConfig.legsField, event.target.value)}
                    placeholder={strings.tourLegsPlaceholder}
                  />
                </label>
                <p className="field-help">{strings.tourLegsHelp}</p>
              </div>

              <div className="field-group">
                <label className="field tour-description-field">
                  <span>{routeEventConfig.descriptionLabel}</span>
                  <textarea
                    rows={3}
                    value={form[routeEventConfig.descriptionField]}
                    onChange={(event) => updateField(routeEventConfig.descriptionField, event.target.value)}
                    placeholder={routeEventConfig.descriptionPlaceholder}
                  />
                </label>
                <p className="field-help">{routeEventConfig.descriptionHelp}</p>
              </div>

              <div className="event-meta-grid">
                <label className="field">
                  <span>{strings.bonusPointsLabel}</span>
                  <input
                    type="number"
                    min="0"
                    value={form[routeEventConfig.bonusField]}
                    onChange={(event) => updateField(routeEventConfig.bonusField, event.target.value)}
                    placeholder="350"
                  />
                </label>

                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={form[routeEventConfig.registrationField]}
                    onChange={(event) => updateField(routeEventConfig.registrationField, event.target.checked)}
                  />
                  <span className="toggle-title">{strings.registrationRequiredLabel}</span>
                  <span className="toggle-help">{strings.registrationRequiredHelp}</span>
                </label>
              </div>

              {aircraftFieldConfig ? (
                <div className="field-group">
                  <label className="toggle-field toggle-field-wide">
                    <input
                      type="checkbox"
                      checked={form[aircraftFieldConfig.enabledField]}
                      onChange={(event) => toggleAircraftAssignment(event.target.checked)}
                    />
                    <span className="toggle-title">{strings.aircraftAssignmentLabel}</span>
                    <span className="toggle-help">{strings.aircraftAssignmentHelp}</span>
                  </label>

                  {form[aircraftFieldConfig.enabledField] ? (
                    <>
                      <label className="field">
                        <span>{strings.aircraftSearchLabel}</span>
                        <input
                          type="text"
                          value={form[aircraftFieldConfig.searchField]}
                          onChange={(event) => updateField(aircraftFieldConfig.searchField, event.target.value)}
                          placeholder={strings.aircraftSearchPlaceholder}
                        />
                      </label>

                      <p className="field-help">{strings.aircraftSearchHelp}</p>

                      {isSyncingAircraftCatalog ? (
                        <p className="field-help">{locale === 'ru' ? 'Синхронизируем каталоги RAG и vNWS…' : 'Syncing the RAG and vNWS aircraft catalogs…'}</p>
                      ) : isLoadingAircraftOptions ? (
                        <p className="field-help">{locale === 'ru' ? 'Ищем самолёты…' : 'Searching aircraft…'}</p>
                      ) : null}

                      {aircraftOptions.length > 0 ? (
                        <div className="field-group">
                          <span className="section-mini-title">{strings.aircraftListLabel}</span>

                          <div className="aircraft-results-list">
                            {aircraftOptions.map((option) => {
                              const aircraftTypeLabel = getAircraftTypeLabel(option)

                              return (
                                <button
                                  key={`${option.source}-${option.aircraft_id ?? option.registration}`}
                                  className={`aircraft-result-card${activeAircraftRegistration === option.registration && activeAircraftSource === option.source ? ' is-active' : ''}`}
                                  type="button"
                                  onClick={() => selectAircraftOption(option)}
                                >
                                  <span className="aircraft-result-meta">
                                    <span className="aircraft-result-source">{getAircraftSourceLabel(option.source)}</span>
                                    {aircraftTypeLabel ? <span className="aircraft-result-type">{aircraftTypeLabel}</span> : null}
                                  </span>
                                  <span className="aircraft-result-registration">{option.registration}</span>
                                  <span className="aircraft-result-name">{option.name}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : !isLoadingAircraftOptions && !isSyncingAircraftCatalog ? (
                        <p className="field-help">{strings.aircraftListEmpty}</p>
                      ) : null}

                      <div className="field-grid">
                        <label className="field">
                          <span>{strings.aircraftNameLabel}</span>
                          <input
                            type="text"
                            value={form[aircraftFieldConfig.nameField]}
                            onChange={(event) => updateField(aircraftFieldConfig.nameField, event.target.value)}
                            placeholder="Boeing 737-800"
                          />
                        </label>

                        <label className="field">
                          <span>{strings.aircraftRegistrationLabel}</span>
                          <input
                            type="text"
                            value={form[aircraftFieldConfig.registrationField]}
                            onChange={(event) => updateField(aircraftFieldConfig.registrationField, event.target.value.toUpperCase())}
                            placeholder="RA-73280"
                          />
                        </label>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <label className="field">
                <span>{strings.cityLabel}</span>
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  placeholder="Saint Petersburg"
                />
              </label>

              <div className={`field-grid${eventType === 'focus-airport' ? ' field-grid-compact' : ''}`}>
                <label className="field">
                  <span>{strings.countryCodeLabel}</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={form.countryCode ?? ''}
                    onChange={(event) =>
                      updateField('countryCode', event.target.value.replace(/[^a-z]/gi, '').toUpperCase())
                    }
                    placeholder="RU"
                  />
                </label>

                <label className="field">
                  <span>{strings.icaoLabel}</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={form.icao}
                    onChange={(event) => updateField('icao', event.target.value.toUpperCase())}
                    placeholder="ULLI"
                  />
                </label>

                {eventType === 'focus-airport' ? (
                  <label className="field">
                    <span>{strings.bonusPointsLabel}</span>
                    <input
                      type="number"
                      min="0"
                        value={form.focusBonusPoints}
                        onChange={(event) => updateField('focusBonusPoints', event.target.value)}
                      placeholder="350"
                    />
                  </label>
                ) : null}
              </div>

              <label className="field">
                <span>{strings.airportNameLabel}</span>
                <input
                  type="text"
                  value={form.airportName}
                  onChange={(event) => updateField('airportName', event.target.value)}
                  placeholder="Pulkovo"
                />
              </label>

              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={form.focusRegistrationRequired}
                  onChange={(event) => updateField('focusRegistrationRequired', event.target.checked)}
                />
                <span className="toggle-title">{strings.registrationRequiredLabel}</span>
                <span className="toggle-help">{strings.registrationRequiredHelp}</span>
              </label>
            </>
          )}
        </section>

      </aside>

      <main className="preview-panel">
        <div className="preview-header">
          <div>
            <span className="preview-label">{strings.previewLabel}</span>
            <h2>{strings.previewTitle}</h2>
          </div>
          <span className="resolution-chip">{strings.resolutionChip}</span>
        </div>

        <div className="preview-frame">
          <div ref={previewViewportRef} className="banner-preview-viewport">
            <div
              className="banner-preview-stage"
              style={{
                width: `${1920 * previewScale}px`,
                height: `${1080 * previewScale}px`,
              }}
            >
              <div
                className="banner-preview-scale"
                style={{
                  transform: `scale(${previewScale})`,
                }}
              >
                <div
                  ref={previewRef}
                  className={`banner-preview${backgroundUrl ? ' has-photo' : ''}${isRouteEventActive ? ' is-tour' : ''}${isCommunityEventActive ? ' is-community-event' : ''}${activeAircraftPhotoUrl ? ' has-aircraft-photo' : ''}`}
                  style={bannerBackground}
                >
                  <div className="banner-minimal-fallback" aria-hidden="true"></div>

                  {isRouteEventActive && activeAircraftPhotoUrl ? (
                    <div
                      className="banner-aircraft-photo-layer"
                      style={{
                        backgroundImage: `linear-gradient(90deg, rgba(9, 12, 16, 0.02) 0%, rgba(9, 12, 16, 0.18) 34%, rgba(9, 12, 16, 0.72) 100%), url(${activeAircraftPhotoUrl})`,
                      }}
                      aria-hidden="true"
                    ></div>
                  ) : null}

                  {isRouteEventActive ? <TourRouteMap legs={parsedRouteLegPairs} /> : null}

                  <div className="banner-layout">
                    <div
                      className={`banner-copy${isRouteEventActive ? ' is-tour' : ''}${isCommunityEventActive ? ' is-community-event' : ''}`}
                    >
                      <div className="banner-kicker">{activeEventName}</div>

                      <div className="banner-title">
                        {titleLines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </div>

                      {isRouteEventActive ? (
                        <>
                          {routeDescription ? <p className="banner-tour-intro">{routeDescription}</p> : null}

                          <div className="banner-tour-summary">
                            <span className="banner-tour-summary-chip">
                              {strings.tourLegsLabel}: {parsedRouteLegPairs.length}
                            </span>
                            <span className="banner-tour-summary-chip">
                              {strings.tourStopsLabel}: {routeStops.length}
                            </span>
                          </div>

                          {activeAircraftEnabled && (routeAircraftRegistration || activeAircraftName) ? (
                            <div className="banner-aircraft-assignment">
                              {activeAircraftName ? <span className="banner-aircraft-name">{activeAircraftName}</span> : null}
                              {routeAircraftRegistration ? <span className="banner-aircraft-registration">{routeAircraftRegistration}</span> : null}
                            </div>
                          ) : null}
                        </>
                      ) : eventType === 'community-challenge' ? (
                        <p className="banner-challenge-intro">{strings.communityPreviewIntro}</p>
                      ) : eventType === 'community-goal' ? (
                        <p className="banner-challenge-intro">{strings.communityGoalPreviewIntro}</p>
                      ) : (
                        <div className="banner-airport-chip">
                          <span className="banner-airport-flag" aria-hidden="true">
                            {countryFlagCode ? (
                              <span className={`fi fi-${countryFlagCode}`}></span>
                            ) : (
                              <span className="banner-airport-flag-fallback">{normalizedCountryCode}</span>
                            )}
                          </span>
                          <span className="banner-airport-name">{normalizedAirportName}</span>
                          <strong className="banner-airport-icao">{normalizedIcao}</strong>
                        </div>
                      )}

                      {registrationRequired && eventType === 'focus-airport' ? <div className="banner-registration-pill">{strings.registrationRequiredBadge}</div> : null}
                    </div>

                    <div className={`banner-footer${isCommunityEventActive ? ' is-community-event' : ''}`}>
                      <div
                        className={`banner-reward-block${isRouteEventActive ? ' is-tour' : ''}${isCommunityEventActive ? ' is-community-event' : ''}${eventType === 'community-goal' ? ' is-community-goal' : ''}`}
                      >
                        <span className="banner-reward-label">
                          {isRouteEventActive && bannerRouteEventConfig
                            ? bannerRouteEventConfig.previewLabel
                            : eventType === 'community-challenge'
                              ? strings.communityPreviewLabel
                              : eventType === 'community-goal'
                                ? strings.communityGoalPreviewLabel
                              : strings.rewardLabel}
                        </span>

                        {isRouteEventActive && bannerRouteEventConfig ? (
                          parsedRouteLegs.length > 0 ? (
                            <div className="banner-legs-list">
                              {parsedRouteLegs.map((leg, index) => {
                                if (showLegFlags) {
                                  const dashIdx = leg.indexOf(' - ')
                                  const from = dashIdx !== -1 ? leg.substring(0, dashIdx) : leg
                                  const to = dashIdx !== -1 ? leg.substring(dashIdx + 3) : ''
                                  const fromFlag = getFlagAssetCode(getIcaoCountryCode(from))
                                  const toFlag = getFlagAssetCode(getIcaoCountryCode(to))
                                  return (
                                    <span key={`${leg}-${index}`} className="banner-leg-chip">
                                      {fromFlag && <span className={`fi fi-${fromFlag} banner-leg-flag`}></span>}
                                      {from}
                                      {to ? ' - ' : ''}
                                      {to && toFlag && <span className={`fi fi-${toFlag} banner-leg-flag`}></span>}
                                      {to}
                                    </span>
                                  )
                                }
                                return (
                                  <span key={`${leg}-${index}`} className="banner-leg-chip">
                                    {leg}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="banner-legs-empty">{bannerRouteEventConfig.previewEmpty}</div>
                          )
                        ) : eventType === 'community-challenge' ? (
                          bannerCommunityTeams.length > 0 ? (
                            <div className="banner-team-grid">
                              {bannerCommunityTeams.map((team) => (
                                <article key={team.id} className="banner-team-card">
                                  <div className="banner-team-name">{team.name}</div>
                                  <div className="banner-team-goal">{team.goalLabel}</div>
                                  <div className="banner-team-target">
                                    <strong>{team.targetLabel}</strong>
                                    <span>{team.unitLabel}</span>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="banner-legs-empty">{strings.communityPreviewEmpty}</div>
                          )
                        ) : eventType === 'community-goal' ? (
                          <div className="banner-goal-card">
                            <div className="banner-goal-type">{bannerCommunityGoalCountTypeMeta.label}</div>
                            <div className="banner-goal-target">
                              <strong>{bannerFormattedCommunityGoalTarget}</strong>
                              <span>{bannerCommunityGoalCountTypeMeta.unit}</span>
                            </div>
                            <p className="banner-goal-note">{strings.communityGoalHelp}</p>
                          </div>
                        ) : (
                          <div className="banner-reward-value">
                            {strings.rewardPrefix} <em>{normalizedBonusPoints}</em> {strings.rewardSuffix}
                          </div>
                        )}

                        {eventType !== 'focus-airport' ? (
                          <div className="banner-meta-stack">
                            <div className="banner-meta-card">
                              <span className="banner-meta-card-label">{strings.bonusPointsLabel}</span>
                              <strong className="banner-meta-card-value">{normalizedBonusPoints}</strong>
                            </div>

                            {registrationRequired ? (
                              <div className="banner-meta-card is-registration">
                                <span className="banner-meta-card-label">{strings.registrationRequiredLabel}</span>
                                <strong className="banner-meta-card-value">{strings.registrationRequiredBadge}</strong>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={`banner-logo-block${brandKey === 'rag' ? ' is-rag' : ''}`}
                        style={{ '--logo-overlay-opacity': logoOverlayOpacity } as React.CSSProperties}
                      >
                        <ProjectLogo brandKey={brandKey} ariaLabel={logoAriaLabel} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="preview-support-grid">
          <section className={`panel-card support-card${eventType === 'community-challenge' ? ' support-card-community' : ''}`}>
            {eventType === 'community-challenge' ? (
              <>
                <div className="support-card-section">
                  <div className="support-card-heading">
                    <h2>{strings.communityTeamsTitle}</h2>
                    <p>{strings.communityTeamsHelp}</p>
                  </div>

                  {communityTeamsEditor}
                </div>

                <div className="support-card-divider"></div>

                <div className="support-card-section">
                  <h3 className="support-card-subtitle">{strings.imagesTitle}</h3>
                  {imageAndLogoControls}
                </div>
              </>
            ) : (
              <>
                <h2>{strings.imagesTitle}</h2>
                {imageAndLogoControls}
              </>
            )}
          </section>

          <section className="panel-card panel-actions support-card support-card-export">
            <div>
              <h2>{strings.exportTitle}</h2>
              <p>{strings.exportHelp}</p>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={exportBanner}
              disabled={isExporting || isAutoSelectingBackground || isApplyingFavoriteBackground}
            >
              {isExporting ? strings.exportingButton : strings.exportPngButton}
            </button>

            {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
          </section>
        </div>

        <footer className="app-footer">
          <a className="app-footer-link" href="https://twitch.tv/sebadavinch" target="_blank" rel="noreferrer">
            Nordwind Virtual (c) 2026
            <span>Developed by Grigorii - NWS0001</span>
          </a>
        </footer>
      </main>

      {isGuideOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsGuideOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-label={guideStrings.title} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{guideStrings.title}</h2>
              <button className="ghost-button" type="button" onClick={() => setIsGuideOpen(false)}>
                {guideStrings.close}
              </button>
            </div>
            <div className="modal-card-body">
              <p>{guideStrings.intro}</p>
              <p>{guideStrings.focusAirport}</p>
              <p>{guideStrings.tour}</p>
              <p>{guideStrings.roster}</p>
              <p>{guideStrings.curatedRoster}</p>
              <p>{guideStrings.communityChallenge}</p>
              <p>{guideStrings.communityGoal}</p>
            </div>
          </div>
        </div>
      ) : null}

      {isArchiveOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsArchiveOpen(false)}>
          <div className="modal-card modal-card-archive" role="dialog" aria-modal="true" aria-label={guideStrings.archiveTitle} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{guideStrings.archiveTitle}</h2>
              <button className="ghost-button" type="button" onClick={() => setIsArchiveOpen(false)}>
                {guideStrings.close}
              </button>
            </div>
            <div className="modal-card-body">
              {archiveError ? <p className="error-text">{archiveError}</p> : null}

              {archiveItems.length > 0 ? (
                <div className="archive-grid">
                  {archiveItems.map((item) => (
                    <article key={item.id} className="archive-card">
                      {item.image_url ? (
                        <span
                          className="archive-card-image"
                          style={{
                            backgroundImage: `linear-gradient(180deg, rgba(10, 12, 16, 0.04), rgba(10, 12, 16, 0.28)), url(${item.image_url})`,
                          }}
                          aria-hidden="true"
                        ></span>
                      ) : null}
                      <strong>{item.title}</strong>
                      <span>{item.event_type}</span>
                      <span>{item.brand}</span>
                      {item.description ? <p>{item.description}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p>{guideStrings.archiveEmpty}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
