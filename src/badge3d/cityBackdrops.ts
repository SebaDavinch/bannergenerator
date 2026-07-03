export type BackdropChip = {
  label: string
  labelEn: string
  query: string
}

export type CityBackdrops = {
  /** Lower-case city match keys (ru + en + IATA/ICAO). */
  keys: string[]
  chips: BackdropChip[]
}

/**
 * Curated location chips: each chip is a hand-tuned English stock query —
 * stock APIs perform poorly with Russian queries and generic city names.
 */
export const CITY_BACKDROPS: CityBackdrops[] = [
  {
    keys: ['сочи', 'sochi', 'adler', 'адлер', 'aer', 'urss'],
    chips: [
      { label: 'Олимпийский парк', labelEn: 'Olympic Park', query: 'Sochi Olympic park Fisht stadium' },
      { label: 'Красная Поляна', labelEn: 'Krasnaya Polyana', query: 'Krasnaya Polyana Rosa Khutor mountains' },
      { label: 'Аэропорт', labelEn: 'Airport', query: 'Sochi Adler airport terminal' },
      { label: 'Набережная, закат', labelEn: 'Seafront sunset', query: 'Sochi seafront promenade sunset' },
      { label: 'Морской порт', labelEn: 'Sea port', query: 'Sochi marine station port yachts' },
      { label: 'Панорама города', labelEn: 'City panorama', query: 'Sochi city aerial view coastline' },
    ],
  },
  {
    keys: ['москва', 'moscow', 'svo', 'dme', 'vko', 'uuee', 'uudd', 'uuww'],
    chips: [
      { label: 'Кремль', labelEn: 'Kremlin', query: 'Moscow Kremlin Red Square evening' },
      { label: 'Москва-Сити', labelEn: 'Moscow City', query: 'Moscow City skyscrapers skyline night' },
      { label: 'Аэропорт', labelEn: 'Airport', query: 'Sheremetyevo airport terminal aircraft' },
      { label: 'Панорама', labelEn: 'Panorama', query: 'Moscow aerial cityscape river' },
    ],
  },
  {
    keys: ['санкт-петербург', 'петербург', 'saint petersburg', 'st petersburg', 'led', 'ulli'],
    chips: [
      { label: 'Дворцовая', labelEn: 'Palace Square', query: 'Saint Petersburg Palace Square Hermitage' },
      { label: 'Разводные мосты', labelEn: 'Drawbridges', query: 'Saint Petersburg drawbridge Neva night' },
      { label: 'Исаакий', labelEn: 'St Isaac', query: 'Saint Isaac cathedral Saint Petersburg skyline' },
      { label: 'Лахта', labelEn: 'Lakhta', query: 'Lakhta Center tower Saint Petersburg gulf' },
    ],
  },
  {
    keys: ['казань', 'kazan', 'kzn', 'uwkd'],
    chips: [
      { label: 'Кремль', labelEn: 'Kazan Kremlin', query: 'Kazan Kremlin Kul Sharif mosque' },
      { label: 'Набережная', labelEn: 'Embankment', query: 'Kazan Kremlin embankment evening' },
      { label: 'Панорама', labelEn: 'Panorama', query: 'Kazan city aerial view Volga' },
    ],
  },
  {
    keys: ['калининград', 'kaliningrad', 'kgd', 'umkk'],
    chips: [
      { label: 'Рыбная деревня', labelEn: 'Fish Village', query: 'Kaliningrad fishing village Pregolya' },
      { label: 'Кафедральный собор', labelEn: 'Cathedral', query: 'Kaliningrad Konigsberg cathedral island' },
      { label: 'Балтика', labelEn: 'Baltic coast', query: 'Zelenogradsk Baltic sea coast sunset' },
    ],
  },
  {
    keys: ['ибица', 'ibiza', 'ibz', 'leib'],
    chips: [
      { label: 'Старый город', labelEn: 'Old town', query: 'Ibiza old town Dalt Vila fortress' },
      { label: 'Марина', labelEn: 'Marina', query: 'Ibiza marina yachts evening' },
      { label: 'Пляжи', labelEn: 'Beaches', query: 'Ibiza beach turquoise cala' },
      { label: 'Закат', labelEn: 'Sunset', query: 'Ibiza sunset Es Vedra sea' },
    ],
  },
  {
    keys: ['анталья', 'анталия', 'antalya', 'ayt', 'ltai'],
    chips: [
      { label: 'Старый порт', labelEn: 'Old harbour', query: 'Antalya Kaleici old harbour marina' },
      { label: 'Побережье', labelEn: 'Coast', query: 'Antalya turquoise coast cliffs' },
      { label: 'Горы и море', labelEn: 'Mountains', query: 'Antalya Taurus mountains sea view' },
    ],
  },
  {
    keys: ['стамбул', 'istanbul', 'ist', 'saw', 'ltfm'],
    chips: [
      { label: 'Босфор', labelEn: 'Bosphorus', query: 'Istanbul Bosphorus bridge sunset' },
      { label: 'Мечети', labelEn: 'Mosques', query: 'Istanbul Hagia Sophia Blue Mosque skyline' },
      { label: 'Панорама', labelEn: 'Panorama', query: 'Istanbul aerial cityscape Golden Horn' },
    ],
  },
  {
    keys: ['дубай', 'dubai', 'dxb', 'omdb'],
    chips: [
      { label: 'Бурдж-Халифа', labelEn: 'Burj Khalifa', query: 'Dubai Burj Khalifa downtown night' },
      { label: 'Марина', labelEn: 'Marina', query: 'Dubai Marina skyscrapers water' },
      { label: 'Пальма', labelEn: 'Palm', query: 'Palm Jumeirah aerial Dubai' },
    ],
  },
  {
    keys: ['пхукет', 'phuket', 'hkt', 'vtsp'],
    chips: [
      { label: 'Пляжи', labelEn: 'Beaches', query: 'Phuket beach longtail boat turquoise' },
      { label: 'Биг Будда', labelEn: 'Big Buddha', query: 'Phuket Big Buddha viewpoint' },
      { label: 'Закат', labelEn: 'Sunset', query: 'Phuket Promthep cape sunset' },
    ],
  },
]

export function findCityBackdrops(input: string): CityBackdrops | null {
  const needle = input.trim().toLowerCase()
  if (!needle) {
    return null
  }
  return (
    CITY_BACKDROPS.find((city) => city.keys.some((key) => key === needle)) ??
    CITY_BACKDROPS.find((city) => city.keys.some((key) => needle.includes(key) || key.includes(needle))) ??
    null
  )
}
