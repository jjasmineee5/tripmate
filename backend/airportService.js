const fs = require('fs')
const path = require('path')

const AIRPORTS_FILE = path.join(__dirname, 'airports.csv')

let airports = []

// ==========================================
// FIX FORMAT CSV FILE
// ==========================================
function cleanCSVLine(line) {
  let cleaned = line.trim()

  // Hapus delimiter titik koma di bagian akhir
  cleaned = cleaned.replace(/;+$/, '')

  // Hapus pembungkus tanda kutip luar
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1)
  }

  // Kembalikan double quote yang di-escape
  cleaned = cleaned.replace(/""/g, '"')

  return cleaned
}

// ==========================================
// PARSE CSV
// ==========================================
function parseCSVLine(line) {
  const result = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

// ==========================================
// NORMALIZE TEXT
// ==========================================
function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ==========================================
// COUNTRY NAME
// ==========================================
function getCountryName(countryCode) {
  try {
    if (!countryCode) return ''

    const displayNames = new Intl.DisplayNames(['id'], {
      type: 'region',
    })

    return displayNames.of(countryCode) || countryCode
  } catch {
    return countryCode || ''
  }
}

// ==========================================
// LOCATION ALIASES
// ==========================================
const locationAliases = {
  bali: ['DPS'],
  jakarta: ['CGK', 'HLP'],
  yogyakarta: ['YIA', 'JOG'],
  jogja: ['YIA', 'JOG'],
  surabaya: ['SUB'],
  singapore: ['SIN'],
  singapura: ['SIN'],
  'kuala lumpur': ['KUL'],
  bangkok: ['BKK', 'DMK'],
  tokyo: ['HND', 'NRT'],
  osaka: ['KIX', 'ITM'],
  london: ['LHR', 'LGW', 'LCY', 'STN'],
  amsterdam: ['AMS'],
  paris: ['CDG', 'ORY'],
  rome: ['FCO', 'CIA'],
}

// ==========================================
// LOAD AIRPORTS
// ==========================================
function loadAirports() {
  try {
    if (!fs.existsSync(AIRPORTS_FILE)) {
      console.error('File airports.csv tidak ditemukan:', AIRPORTS_FILE)
      airports = []
      return
    }

    const content = fs.readFileSync(AIRPORTS_FILE, 'utf8')
    const rawLines = content.split(/\r?\n/)

    if (rawLines.length < 2) {
      console.error('CSV kosong atau tidak memiliki data')
      airports = []
      return
    }

    // Bersihkan format CSV luar
    const lines = rawLines.filter((line) => line.trim()).map(cleanCSVLine)

    // ==========================================
    // READ HEADERS
    // ==========================================
    const headers = parseCSVLine(lines[0]).map((header) => header.trim().replace(/^\uFEFF/, ''))

    const headerIndex = {}

    headers.forEach((header, index) => {
      headerIndex[header] = index
    })

    airports = []

    // ==========================================
    // READ DATA
    // ==========================================
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i])

      const getValue = (column) => {
        const index = headerIndex[column]

        if (index === undefined) return ''

        return String(row[index] || '').trim()
      }

      const type = getValue('type')
      const name = getValue('name')
      const iata = getValue('iata_code')
      const city = getValue('municipality')
      const countryCode = getValue('iso_country')
      const latitude = getValue('latitude_deg')
      const longitude = getValue('longitude_deg')
      const scheduledService = getValue('scheduled_service')

      // ==========================================
      // FILTER AIRPORT
      // ==========================================
      if (!['large_airport', 'medium_airport'].includes(type) || !iata || iata.length !== 3) {
        continue
      }

      airports.push({
        name,
        type,
        countryCode,
        country: getCountryName(countryCode),
        city,
        iata: iata.toUpperCase(),
        latitude,
        longitude,
        scheduledService,
      })
    }

    console.log(`Berhasil memuat ${airports.length} bandara`)
  } catch (error) {
    console.error('Gagal memuat airport data:', error)
    airports = []
  }
}

// ==========================================
// FORMAT SUGGESTIONS
// ==========================================
function formatSuggestions(airportList) {
  const groupedLocations = new Map()

  for (const airport of airportList) {
    const locationKey = `${airport.city}-${airport.countryCode}`

    if (!groupedLocations.has(locationKey)) {
      groupedLocations.set(locationKey, {
        type: 'location',
        city: airport.city,
        country: airport.country,
        countryCode: airport.countryCode,
        label: `${airport.city}, ${airport.country}`,
      })
    }
  }

  const suggestions = []

  for (const location of groupedLocations.values()) {
    suggestions.push(location)

    const locationAirports = airportList.filter(
      (airport) => airport.city === location.city && airport.countryCode === location.countryCode,
    )

    for (const airport of locationAirports) {
      suggestions.push({
        type: 'airport',
        city: airport.city,
        country: airport.country,
        countryCode: airport.countryCode,
        name: airport.name,
        iata: airport.iata,
        label: `${airport.name} (${airport.iata})`,
        latitude: airport.latitude,
        longitude: airport.longitude,
      })
    }
  }

  return suggestions
}

// ==========================================
// SEARCH AIRPORT SUGGESTIONS
// ==========================================
function searchAirportSuggestions(query) {
  if (!query || !query.trim()) return []

  const normalizedQuery = normalizeText(query)

  // ==========================================
  // 1. ALIAS SEARCH
  // ==========================================
  const aliasCodes = locationAliases[normalizedQuery]

  if (aliasCodes && aliasCodes.length > 0) {
    const aliasResults = airports.filter((airport) => aliasCodes.includes(airport.iata))

    if (aliasResults.length > 0) {
      return formatSuggestions(aliasResults)
    }
  }

  // ==========================================
  // 2. NORMAL SEARCH
  // ==========================================
  const searchResults = airports.filter((airport) => {
    const searchableFields = [
      airport.name,
      airport.city,
      airport.country,
      airport.countryCode,
      airport.iata,
    ]

    return searchableFields.some((field) => normalizeText(field).includes(normalizedQuery))
  })

  // ==========================================
  // 3. RANKING
  // ==========================================
  searchResults.sort((a, b) => {
    function getRank(airport) {
      const city = normalizeText(airport.city)
      const name = normalizeText(airport.name)
      const country = normalizeText(airport.country)
      const iata = normalizeText(airport.iata)

      if (city === normalizedQuery) return 1
      if (city.startsWith(normalizedQuery)) return 2
      if (iata === normalizedQuery) return 3
      if (name === normalizedQuery) return 4
      if (name.startsWith(normalizedQuery)) return 5
      if (country === normalizedQuery) return 6

      return 7
    }

    const rankA = getRank(a)
    const rankB = getRank(b)

    if (rankA !== rankB) {
      return rankA - rankB
    }

    const scheduledA = a.scheduledService === 'yes' ? 1 : 0
    const scheduledB = b.scheduledService === 'yes' ? 1 : 0

    if (scheduledA !== scheduledB) {
      return scheduledB - scheduledA
    }

    const largeA = a.type === 'large_airport' ? 1 : 0
    const largeB = b.type === 'large_airport' ? 1 : 0

    if (largeA !== largeB) {
      return largeB - largeA
    }

    return a.name.localeCompare(b.name)
  })

  // ==========================================
  // 4. REMOVE DUPLICATES
  // ==========================================
  const uniqueResults = []
  const seenIATA = new Set()

  for (const airport of searchResults) {
    if (!seenIATA.has(airport.iata)) {
      seenIATA.add(airport.iata)
      uniqueResults.push(airport)
    }
  }

  // ==========================================
  // 5. FORMAT RESULTS
  // ==========================================
  return formatSuggestions(uniqueResults.slice(0, 15))
}

// ==========================================
// EXPORT
// ==========================================
loadAirports()

module.exports = {
  searchAirportSuggestions,
  loadAirports,
}
