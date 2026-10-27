import type { CountType, Locale, ModeId } from './types'

export const MODES: { id: ModeId; icon: string; label: Record<Locale, string>; hint: Record<Locale, string>; banner: Record<Locale, string> }[] = [
  { id: 'focus-airport', icon: 'MapPin', label: { ru: 'Focus Airport', en: 'Focus Airport' }, hint: { ru: 'Аэропорт месяца', en: 'Airport of the month' }, banner: { ru: 'Аэропорт в фокусе', en: 'Focus Airport' } },
  { id: 'tour', icon: 'Route', label: { ru: 'Tour', en: 'Tour' }, hint: { ru: 'Многолеговый тур', en: 'Multi-leg tour' }, banner: { ru: 'Тур', en: 'Tour' } },
  { id: 'roster', icon: 'ListOrdered', label: { ru: 'Roster', en: 'Roster' }, hint: { ru: 'Леги по порядку', en: 'Legs in order' }, banner: { ru: 'Ростер', en: 'Roster' } },
  { id: 'curated-roster', icon: 'NotebookPen', label: { ru: 'Curated Roster', en: 'Curated Roster' }, hint: { ru: 'План смены', en: 'Shift plan' }, banner: { ru: 'Кураторский ростер', en: 'Curated Roster' } },
  { id: 'community-challenge', icon: 'Swords', label: { ru: 'Community Challenge', en: 'Community Challenge' }, hint: { ru: 'Команды против команд', en: 'Teams race' }, banner: { ru: 'Командный вызов', en: 'Community Challenge' } },
  { id: 'community-goal', icon: 'Radar', label: { ru: 'Community Goal', en: 'Community Goal' }, hint: { ru: 'Общая цель', en: 'Shared target' }, banner: { ru: 'Цель сообщества', en: 'Community Goal' } },
  { id: 'slotted', icon: 'CalendarClock', label: { ru: 'Slotted Event', en: 'Slotted Event' }, hint: { ru: 'Слоты vAMSYS', en: 'vAMSYS slots' }, banner: { ru: 'Ивент по слотам', en: 'Slotted Event' } },
  { id: 'event', icon: 'Handshake', label: { ru: 'Collab Event', en: 'Collab Event' }, hint: { ru: 'vNWS × RAG', en: 'vNWS × RAG' }, banner: { ru: 'Совместный ивент', en: 'Joint Event' } },
  { id: 'vatsim-region', icon: 'Globe2', label: { ru: 'VATSIM Event', en: 'VATSIM Event' }, hint: { ru: 'Шаттл, онлайн-день, оверлоад', en: 'Shuttle, online day, overload' }, banner: { ru: 'VATSIM', en: 'VATSIM' } },
]

export const COUNT_TYPES: { value: CountType; ru: string; en: string; unitRu: string; unitEn: string }[] = [
  { value: 'flights', ru: 'Рейсы', en: 'Flights', unitRu: 'рейсов', unitEn: 'flights' },
  { value: 'passengers', ru: 'Пассажиры', en: 'Passengers', unitRu: 'пассажиров', unitEn: 'passengers' },
  { value: 'freight', ru: 'Груз', en: 'Freight', unitRu: 'кг груза', unitEn: 'kg freight' },
  { value: 'distance', ru: 'Дистанция', en: 'Distance', unitRu: 'морских миль', unitEn: 'nautical miles' },
  { value: 'flight-time', ru: 'Налёт', en: 'Flight time', unitRu: 'часов налёта', unitEn: 'flight hours' },
]

export const countUnit = (type: CountType, lang: Locale) => {
  const c = COUNT_TYPES.find((x) => x.value === type)
  return c ? (lang === 'ru' ? c.unitRu : c.unitEn) : ''
}

/** Copy printed on the banner (independent of the UI language). */
export const BANNER_COPY = {
  en: {
    reward: 'Event reward', earn: 'Earn additional', bonus: 'bonus points', registration: 'Registration required',
    legs: 'legs', airports: 'airports', nm: 'NM', bookSlot: 'Book your slot', slotsOpen: 'Slots open', scan: 'Scan to book',
    waves: 'Slot waves', vs: 'vs', target: 'Target', progress: 'Progress', aircraft: 'Aircraft', schedule: 'Shift schedule',
    leg: 'Leg', from: 'From', to: 'To', flight: 'Flight', positions: 'ATC online', hosts: 'Hosted by', shuttle: 'Shuttle',
    onlineDay: 'Online Day', overload: 'ATC Overload', crossRegion: 'Cross-Region', zulu: 'UTC', network: 'Network',
    rotations: 'Unlimited rotations', joint: 'Joint event', fullCoverage: 'Full ATC coverage', converge: 'Converge on',
    distance: 'Distance',
  },
  ru: {
    reward: 'Награда за ивент', earn: 'Получите дополнительно', bonus: 'бонусных баллов', registration: 'Требуется регистрация',
    legs: 'легов', airports: 'аэропортов', nm: 'NM', bookSlot: 'Забронируйте слот', slotsOpen: 'Слоты открыты', scan: 'Сканируйте для брони',
    waves: 'Волны слотов', vs: 'против', target: 'Цель', progress: 'Прогресс', aircraft: 'Воздушное судно', schedule: 'План смены',
    leg: 'Лег', from: 'Откуда', to: 'Куда', flight: 'Рейс', positions: 'Диспетчеры', hosts: 'Организаторы', shuttle: 'Шаттл',
    onlineDay: 'Онлайн-день', overload: 'ATC Overload', crossRegion: 'Межрегиональный', zulu: 'UTC', network: 'Сеть',
    rotations: 'Неограниченно ротаций', joint: 'Совместный ивент', fullCoverage: 'Полное покрытие УВД', converge: 'Слёт в',
    distance: 'Дистанция',
  },
}

export type UiCopy = typeof UI.ru

export const UI = {
  ru: {
    appTitle: 'Banner Studio', appSubtitle: 'Генератор баннеров ивентов',
    modes: 'Режимы', basics: 'Основное', route: 'Маршрут', visual: 'Визуал', photo: 'Фото', map: 'Карта', aircraft: 'Воздушное судно',
    teams: 'Команды', goal: 'Цель', radar: 'Радар', waves: 'Волны слотов', booking: 'Бронирование', regions: 'Регионы VATSIM', reward: 'Награда',
    city: 'Город', airport: 'Аэропорт', airportSearch: 'ICAO, IATA, город или название', cityOverride: 'Подпись города на баннере',
    cityOverrideHint: 'Пусто — город из базы', tagline: 'Слоган', taglinePh: 'например, Северная столица ждёт',
    title: 'Заголовок', description: 'Описание', period: 'Период / дата', periodPh: 'например, APRIL 2026',
    bonus: 'Бонусные баллы', registration: 'Требуется регистрация',
    legs: 'Леги', addLeg: 'Добавить лег', pasteLegs: 'Вставить списком', pasteLegsHint: 'По одному на строку: ULLI-UUEE', apply: 'Применить',
    legNote: 'Рейс', from: 'Откуда', to: 'Куда', unknownAirport: 'нет в базе',
    visualAircraft: 'Самолёт', visualMap: 'Карта', visualPhoto: 'Фото',
    registrationReg: 'Регистрация борта', regSearch: 'RA-73xxx, VP-Bxx или тип', fleetOf: 'Флот', model: 'Модель', type: 'Тип',
    findPhotos: 'Подобрать фото', searching: 'Ищем…', noPhotos: 'Ничего не найдено — загрузите своё фото', upload: 'Загрузить', clear: 'Убрать',
    photoFraming: 'Кадрирование', zoom: 'Масштаб', posX: 'По горизонтали', posY: 'По вертикали', dim: 'Затемнение', blur: 'Размытие',
    dragHint: 'Перетаскивайте фото на превью, колесо — масштаб', landmarks: 'Достопримечательности', photoSource: 'Источник',
    moodQuery: 'Запрос для фона', moodPh: 'airport at night, runway lights…',
    team: 'Команда', countType: 'Счёт', target: 'Цель', addTeam: 'Добавить команду', progress: 'Текущий прогресс', progressPh: 'необязательно',
    sector: 'Сектор VATSIM', sectorLines: 'Показать сектора', traffic: 'Трафик', reshuffle: 'Перемешать', rangeRings: 'Кольца дальности',
    network: 'Сеть', date: 'Дата', bookingUrl: 'Ссылка на бронирование', qr: 'QR-код на баннере', wave: 'Волна', openTime: 'Открытие', condition: 'Условие', addWave: 'Добавить волну',
    partners: 'Партнёры', vnwsLegs: 'Леги vNWS', ragLegs: 'Леги RAG', vnwsBonus: 'Бонус vNWS', ragBonus: 'Бонус RAG',
    vnwsReg: 'Регистрация vNWS', ragReg: 'Регистрация RAG',
    eventKind: 'Формат', kindShuttle: 'Шаттл', kindOnline: 'Онлайн-день', kindOverload: 'Оверлоад', kindCross: 'Межрегион',
    kindShuttleHint: 'Ротации между двумя аэропортами', kindOnlineHint: 'Полное покрытие FIR/vACC', kindOverloadHint: 'Массовый слёт в аэропорт', kindCrossHint: 'Маршруты через несколько дивизионов',
    timeStart: 'Начало (UTC)', timeEnd: 'Конец (UTC)', divisions: 'Дивизионы', firs: 'FIR / vACC', firSearch: 'Поиск FIR: UUWV, Moscow…',
    presets: 'Быстрый выбор', focusAirports: 'Аэропорты', shuttleA: 'Аэропорт A', shuttleB: 'Аэропорт B', feeders: 'Откуда летим', positions: 'Позиции УВД',
    hosts: 'Организаторы', logos: 'Логотипы партнёров', logoLibrary: 'Библиотека логотипов', addLogo: 'Добавить логотип',
    mapSettings: 'Настройки карты', mapTheme: 'Тема', projection: 'Проекция', fit: 'Вписать маршрут', fitFull: 'Весь баннер', fitContent: 'Справа от текста',
    lock: 'Зафиксировать', unlock: 'Разблокировать', reset: 'Сбросить', borders: 'Границы стран', graticule: 'Сетка', labels: 'Подписи', guard: 'Затемнение под текстом',
    mapHint: 'Тяните карту, колесо — зум к курсору, двойной клик — приблизить, стрелки — сдвиг',
    centerLat: 'Центр, широта', centerLon: 'Центр, долгота', safeArea: 'Безопасная зона',
    preview: 'Превью', export: 'Экспорт', exportTitle: 'Экспорт баннера', format: 'Формат', size: 'Размер', quality: 'Качество',
    fileName: 'Имя файла', download: 'Скачать', copy: 'В буфер', copied: 'Скопировано', rendering: 'Рендер…', close: 'Закрыть',
    exportWarnRemote: 'Часть изображений не удалось загрузить локально — они могут не попасть в экспорт.',
    history: 'История', historyEmpty: 'Здесь появятся экспортированные баннеры', open: 'Открыть', resetMode: 'Сбросить режим',
    bannerLang: 'Язык баннера', ui: 'Интерфейс', brand: 'Проект', loading: 'Загрузка…',
    footer: 'Nordwind Virtual · Banner Studio',
  },
  en: {
    appTitle: 'Banner Studio', appSubtitle: 'Event banner generator',
    modes: 'Modes', basics: 'Basics', route: 'Route', visual: 'Visual', photo: 'Photo', map: 'Map', aircraft: 'Aircraft',
    teams: 'Teams', goal: 'Goal', radar: 'Radar', waves: 'Slot waves', booking: 'Booking', regions: 'VATSIM regions', reward: 'Reward',
    city: 'City', airport: 'Airport', airportSearch: 'ICAO, IATA, city or name', cityOverride: 'City caption on banner',
    cityOverrideHint: 'Empty — city from the database', tagline: 'Tagline', taglinePh: 'e.g. The Northern capital awaits',
    title: 'Title', description: 'Description', period: 'Period / date', periodPh: 'e.g. APRIL 2026',
    bonus: 'Bonus points', registration: 'Registration required',
    legs: 'Legs', addLeg: 'Add leg', pasteLegs: 'Paste as list', pasteLegsHint: 'One per line: ULLI-UUEE', apply: 'Apply',
    legNote: 'Flight', from: 'From', to: 'To', unknownAirport: 'not in database',
    visualAircraft: 'Aircraft', visualMap: 'Map', visualPhoto: 'Photo',
    registrationReg: 'Aircraft registration', regSearch: 'RA-73xxx, VP-Bxx or type', fleetOf: 'Fleet', model: 'Model', type: 'Type',
    findPhotos: 'Find photos', searching: 'Searching…', noPhotos: 'Nothing found — upload your own photo', upload: 'Upload', clear: 'Remove',
    photoFraming: 'Framing', zoom: 'Zoom', posX: 'Horizontal', posY: 'Vertical', dim: 'Darken', blur: 'Blur',
    dragHint: 'Drag the photo on the preview, scroll to zoom', landmarks: 'Landmarks', photoSource: 'Source',
    moodQuery: 'Background query', moodPh: 'airport at night, runway lights…',
    team: 'Team', countType: 'Count', target: 'Target', addTeam: 'Add team', progress: 'Current progress', progressPh: 'optional',
    sector: 'VATSIM sector', sectorLines: 'Show sectors', traffic: 'Traffic', reshuffle: 'Reshuffle', rangeRings: 'Range rings',
    network: 'Network', date: 'Date', bookingUrl: 'Booking link', qr: 'QR code on banner', wave: 'Wave', openTime: 'Opens', condition: 'Condition', addWave: 'Add wave',
    partners: 'Partners', vnwsLegs: 'vNWS legs', ragLegs: 'RAG legs', vnwsBonus: 'vNWS bonus', ragBonus: 'RAG bonus',
    vnwsReg: 'vNWS registration', ragReg: 'RAG registration',
    eventKind: 'Format', kindShuttle: 'Shuttle', kindOnline: 'Online day', kindOverload: 'Overload', kindCross: 'Cross-region',
    kindShuttleHint: 'Rotations between two airports', kindOnlineHint: 'Full FIR/vACC coverage', kindOverloadHint: 'Mass fly-in to an airport', kindCrossHint: 'Routes across divisions',
    timeStart: 'Start (UTC)', timeEnd: 'End (UTC)', divisions: 'Divisions', firs: 'FIR / vACC', firSearch: 'Search FIR: UUWV, Moscow…',
    presets: 'Quick picks', focusAirports: 'Airports', shuttleA: 'Airport A', shuttleB: 'Airport B', feeders: 'Flying in from', positions: 'ATC positions',
    hosts: 'Hosts', logos: 'Partner logos', logoLibrary: 'Logo library', addLogo: 'Add logo',
    mapSettings: 'Map settings', mapTheme: 'Theme', projection: 'Projection', fit: 'Fit route', fitFull: 'Full banner', fitContent: 'Right of text',
    lock: 'Lock', unlock: 'Unlock', reset: 'Reset', borders: 'Country borders', graticule: 'Graticule', labels: 'Labels', guard: 'Text guard',
    mapHint: 'Drag to pan, wheel zooms to cursor, double-click zooms in, arrows nudge',
    centerLat: 'Center lat', centerLon: 'Center lon', safeArea: 'Safe area',
    preview: 'Preview', export: 'Export', exportTitle: 'Export banner', format: 'Format', size: 'Size', quality: 'Quality',
    fileName: 'File name', download: 'Download', copy: 'Copy', copied: 'Copied', rendering: 'Rendering…', close: 'Close',
    exportWarnRemote: 'Some images could not be loaded locally and may be missing from the export.',
    history: 'History', historyEmpty: 'Exported banners will show up here', open: 'Open', resetMode: 'Reset mode',
    bannerLang: 'Banner language', ui: 'Interface', brand: 'Project', loading: 'Loading…',
    footer: 'Nordwind Virtual · Banner Studio',
  },
}
