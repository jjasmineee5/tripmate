const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { GoogleGenAI } = require('@google/genai')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend TripMate aktif' })
})

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getTripDates(startDate, totalDays) {
  const start = new Date(`${startDate}T12:00:00`)
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return formatDate(date)
  })
}

function parseGeminiJson(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const first = cleaned.indexOf('{')
    const last = cleaned.lastIndexOf('}')
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1))
    }
    throw new Error('Respons Gemini bukan JSON valid.')
  }
}

function normalizeDays(result) {
  const source = result?.itinerary || result?.data || result
  const days = Array.isArray(source) ? source : source?.days

  if (!Array.isArray(days)) {
    throw new Error('Respons Gemini tidak berisi daftar hari.')
  }

  return days.map((day, index) => ({
    day: Number(day.day) || index + 1,
    date: typeof day.date === 'string' ? day.date : '',
    title: String(day.title || `Hari ${index + 1}`),
    description: String(day.description || ''),
    activities: (Array.isArray(day.activities) ? day.activities : []).map((activity) => {
      const rawCost = activity.estimatedCost
      const parsedCost =
        rawCost !== null && rawCost !== undefined && rawCost !== '' ? Number(rawCost) : null

      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        time: /^\d{2}:\d{2}$/.test(String(activity.time || '')) ? activity.time : '09:00',
        name: String(activity.name || activity.title || 'Aktivitas'),
        location: String(activity.location || ''),
        description: String(activity.description || ''),
        estimatedCost:
          parsedCost !== null && Number.isFinite(parsedCost) ? Math.max(0, parsedCost) : null,
      }
    }),
  }))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableGeminiError(error) {
  const status = Number(error?.status || error?.code)
  return [429, 500, 502, 503, 504].includes(status)
}

async function generateItineraryWithRetry(ai, prompt, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      })
    } catch (error) {
      if (!isRetryableGeminiError(error) || attempt === maxAttempts) {
        throw error
      }

      const delay = 1000 * 2 ** (attempt - 1)
      console.warn(
        `Gemini gagal pada percobaan ${attempt}/${maxAttempts}. Mencoba kembali dalam ${delay / 1000} detik.`,
      )
      await sleep(delay)
    }
  }

  throw new Error('Gemini gagal menghasilkan respons setelah beberapa percobaan.')
}

function ensureDailyRoutine(day, index, totalDays, flight) {
  const activities = [...day.activities]
  const text = activities.map((item) => item.name.toLowerCase()).join(' ')
  const isArrivalDay = index === 0 && Boolean(flight?.arrivalTime)
  const isDepartureDay = index === totalDays - 1 && Boolean(flight?.returnDeparture)

  const routine = [
    {
      keywords: ['persiapan pagi', 'bangun', 'mandi', 'bersiap'],
      time: '06:30',
      name: 'Persiapan pagi',
      location: 'Penginapan atau tempat menginap',
      description: 'Bangun, mandi, bersiap, dan memeriksa kebutuhan untuk kegiatan hari ini.',
    },
    {
      keywords: ['sarapan'],
      time: '07:30',
      name: 'Sarapan',
      location: 'Tempat makan lokal atau penginapan',
      description: 'Sarapan sebelum memulai aktivitas.',
    },
    {
      keywords: ['makan siang', 'lunch'],
      time: '12:00',
      name: 'Makan siang',
      location: 'Tempat makan di sekitar area kegiatan',
      description: 'Beristirahat untuk makan siang dan mengisi tenaga.',
    },
    {
      keywords: ['makan malam', 'dinner'],
      time: '19:00',
      name: 'Makan malam',
      location: 'Tempat makan lokal',
      description: 'Makan malam dengan pilihan yang sesuai anggaran perjalanan.',
    },
    {
      keywords: ['istirahat malam', 'persiapan tidur', 'kembali ke penginapan'],
      time: '21:00',
      name: 'Kembali dan beristirahat',
      location: 'Penginapan atau tempat menginap',
      description: 'Akhiri kegiatan dan beristirahat untuk esok hari.',
    },
  ]

  if (!isArrivalDay && !isDepartureDay) {
    routine.forEach((item) => {
      const exists = item.keywords.some((keyword) => text.includes(keyword))
      if (!exists) {
        activities.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: item.time,
          name: item.name,
          location: item.location,
          description: item.description,
          estimatedCost: null,
        })
      }
    })
  } else if (isArrivalDay) {
    const exists = activities.some((item) =>
      /kedatangan|tiba|bandara|perjalanan dari bandara/i.test(item.name),
    )

    if (!exists) {
      activities.push({
        id: `${Date.now()}-arrival`,
        time: flight.arrivalTime,
        name: 'Kedatangan dan perjalanan dari bandara',
        location: flight.destination || 'Bandara tujuan',
        description: 'Selesaikan proses kedatangan, ambil bagasi, lalu lanjutkan perjalanan.',
        estimatedCost: null,
      })
    }

    if (!activities.some((item) => /makan malam/i.test(item.name))) {
      activities.push({
        id: `${Date.now()}-arrival-dinner`,
        time: '19:00',
        name: 'Makan malam dan istirahat',
        location: 'Area sekitar tempat menginap',
        description: 'Pilih makan malam yang mudah dijangkau setelah perjalanan.',
        estimatedCost: null,
      })
    }
  } else if (isDepartureDay) {
    const exists = activities.some((item) =>
      /bandara|penerbangan pulang|keberangkatan/i.test(item.name),
    )

    if (!exists) {
      activities.push({
        id: `${Date.now()}-departure`,
        time: '08:00',
        name: 'Berkemas dan persiapan kepulangan',
        location: 'Tempat menginap',
        description:
          'Periksa barang bawaan dan waktu check-out. Sesuaikan perjalanan ke bandara dengan jadwal penerbangan.',
        estimatedCost: null,
      })
    }
  }

  return {
    ...day,
    activities: activities.sort((a, b) => a.time.localeCompare(b.time)),
  }
}

function getPacing(totalDays) {
  if (totalDays <= 3) {
    return 'Buat 6-8 agenda per hari jika realistis, termasuk rutinitas, makan, wisata, dan istirahat.'
  }
  if (totalDays <= 14) {
    return 'Buat 6-8 agenda terstruktur per hari, termasuk rutinitas, makan, perjalanan, kegiatan utama, dan istirahat.'
  }
  if (totalDays <= 30) {
    return 'Buat 5-7 agenda harian dengan variasi kegiatan dan hari santai.'
  }
  return 'Buat 4-7 agenda harian dengan hari istirahat dan waktu bebas.'
}

function getBudgetGuidance(budget) {
  switch (budget) {
    case 'low':
      return `
KATEGORI ANGGARAN: HEMAT
- Prioritaskan tempat wisata gratis atau berbiaya rendah.
- Sarankan transportasi ekonomis jika tersedia.
- Pilih makanan lokal yang terjangkau.
- Hindari aktivitas mahal kecuali relevan dengan preferensi pengguna.
- Jangan mengarang harga pasti atau mengorbankan keselamatan.
`
    case 'medium':
      return `
KATEGORI ANGGARAN: MENENGAH
- Seimbangkan aktivitas gratis dan berbayar.
- Variasikan pilihan kuliner lokal.
- Pertimbangkan biaya, waktu, dan kenyamanan transportasi.
- Jangan mengarang harga pasti.
`
    case 'high':
      return `
KATEGORI ANGGARAN: FLEKSIBEL
- Berikan variasi aktivitas dan kuliner dengan tingkat kenyamanan berbeda.
- Aktivitas premium boleh direkomendasikan jika relevan.
- Pilihan berbiaya rendah tetap boleh dimasukkan.
- Jangan mengarang harga pasti.
`
    default:
      return `
KATEGORI ANGGARAN: BELUM DITENTUKAN
- Buat itinerary dengan biaya seimbang.
- Sertakan aktivitas gratis dan berbayar.
- Jangan menganggap anggaran termasuk tiket pesawat.
`
  }
}

// ========================================
// UC-16: MENGHASILKAN ITINERARY DENGAN AI
// ========================================
app.post('/api/itinerary', async (req, res) => {
  try {
    const { destination, startDate, endDate, preferences, budget, flight } = req.body || {}

    if (typeof destination !== 'string' || !destination.trim() || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Destinasi, tanggal mulai, dan tanggal selesai wajib diisi.',
      })
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Format tanggal harus YYYY-MM-DD.',
      })
    }

    const start = new Date(`${startDate}T12:00:00`)
    const end = new Date(`${endDate}T12:00:00`)

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      formatDate(start) !== startDate ||
      formatDate(end) !== endDate ||
      endDate < startDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal perjalanan tidak valid.',
      })
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY belum diatur di backend/.env.',
      })
    }

    const totalDays = Math.round((end - start) / 86400000) + 1
    if (totalDays < 1 || totalDays > 180) {
      return res.status(400).json({
        success: false,
        message: 'Durasi perjalanan harus antara 1 sampai 180 hari.',
      })
    }

    const allowedBudgets = ['low', 'medium', 'high']
    const selectedBudget = allowedBudgets.includes(budget) ? budget : 'medium'
    const dates = getTripDates(startDate, totalDays)
    const pacing = getPacing(totalDays)
    const budgetGuidance = getBudgetGuidance(selectedBudget)

    const flightContext = flight
      ? `
TIKET PENERBANGAN YANG DIPILIH:
- Asal: ${flight.origin || 'Tidak tersedia'}
- Tujuan: ${flight.destination || 'Tidak tersedia'}
- Tanggal pergi: ${flight.departureDate || flight.outboundDate || startDate}
- Jam berangkat: ${flight.departureTime || flight.outboundTime || 'Tidak tersedia'}
- Jam tiba: ${flight.arrivalTime || 'Tidak tersedia'}
- Tiket pulang dipilih: ${
          flight.hasReturnFlight === true
            ? 'Ya'
            : flight.hasReturnFlight === false
              ? 'Tidak'
              : flight.returnDate
                ? 'Tanggal pulang tersedia; verifikasi tiket pulang'
                : 'Tidak diketahui'
        }
- Tanggal pulang: ${
          flight.hasReturnFlight === false
            ? 'Tidak ada tiket pulang yang dipilih'
            : flight.returnDate || 'Tidak tersedia'
        }
- Jam berangkat pulang: ${flight.returnDeparture || 'Tidak tersedia'}
- Jam tiba pulang: ${flight.returnArrival || 'Tidak tersedia'}

Jangan menganggap ada penerbangan pulang jika hasReturnFlight bernilai false.
`
      : 'Tidak ada tiket yang dipilih. Jangan mengarang jadwal penerbangan.'

    const prompt = `
Kamu adalah travel planner TripMate.
Buat itinerary harian yang konkret, detail, realistis, dan sesuai kebutuhan pengguna.

DESTINASI: ${destination.trim()}
TANGGAL PERJALANAN: ${startDate} sampai ${endDate}
DURASI: ${totalDays} hari
PREFERENSI: ${
      typeof preferences === 'string' && preferences.trim()
        ? preferences.trim()
        : 'Tidak ditentukan'
    }
ANGGARAN YANG DIPILIH: ${selectedBudget}

${budgetGuidance}
${flightContext}

RITME PERJALANAN:
${pacing}

ATURAN:
1. Buat tepat ${totalDays} hari dengan tanggal berurutan: ${dates.join(', ')}.
2. Setiap hari harus memiliki jadwal dari pagi sampai malam jika realistis.
3. Masukkan persiapan pagi, makan, perjalanan, wisata, waktu bebas, dan istirahat jika sesuai.
4. Usahakan minimal 6 agenda per hari pada hari normal tanpa jadwal tidak realistis.
5. Jelaskan kegiatan secara spesifik.
6. Pilih wisata sesuai destinasi, preferensi, durasi, dan kategori anggaran.
7. Bedakan rekomendasi sesuai anggaran yang dipilih.
8. Jangan mengarang harga pasti, jam operasional, atau waktu tempuh.
9. estimatedCost adalah estimasi biaya aktivitas dalam rupiah; gunakan null jika tidak dapat diperkirakan.
10. Jangan memasukkan harga tiket pesawat ke estimatedCost.
11. Jangan menganggap anggaran aktivitas termasuk tiket pesawat.
12. Sesuaikan hari kedatangan dengan jam tiba jika tersedia.
13. Jika tiket pulang dipilih, beri waktu untuk berkemas dan menuju bandara.
14. Jika tidak ada tiket pulang, jangan mengarang jadwal penerbangan pulang.
15. Jika jam penerbangan tidak tersedia, jelaskan bahwa waktu perjalanan perlu dikonfirmasi.
16. Waktu harus menggunakan format 24 jam HH:mm dan urut kronologis.
17. Setiap aktivitas wajib memiliki time, name, location, description, dan estimatedCost.
18. Setiap hari wajib memiliki day, date, title, description, dan activities.
19. Jangan mengarang nama tempat spesifik jika tidak yakin tempat tersebut ada.
20. Balas hanya dengan JSON valid tanpa Markdown.

FORMAT JSON:
{
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "title": "Judul hari",
      "description": "Ringkasan kegiatan hari ini",
      "activities": [
        {
          "time": "07:00",
          "name": "Persiapan pagi",
          "location": "Tempat menginap",
          "description": "Bersiap untuk aktivitas hari ini.",
          "estimatedCost": null
        }
      ]
    }
  ]
}
`

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const response = await generateItineraryWithRetry(ai, prompt, 3)
    const days = normalizeDays(parseGeminiJson(response.text || ''))

    if (days.length !== totalDays) {
      return res.status(502).json({
        success: false,
        message: `AI menghasilkan ${days.length} hari, padahal diminta ${totalDays}. Silakan generate ulang.`,
      })
    }

    const invalid = days.some((day, index) => day.day !== index + 1 || day.date !== dates[index])
    if (invalid) {
      return res.status(502).json({
        success: false,
        message: 'Tanggal atau nomor hari dari AI tidak sesuai. Silakan generate ulang.',
      })
    }

    const completedDays = days.map((day, index) =>
      ensureDailyRoutine(day, index, totalDays, flight),
    )

    if (!completedDays.some((day) => day.activities.length > 0)) {
      return res.status(502).json({
        success: false,
        message: 'AI belum menghasilkan aktivitas. Silakan generate ulang.',
      })
    }

    return res.json({
      success: true,
      itinerary: { days: completedDays },
    })
  } catch (error) {
    const status = Number(error?.status || error?.code)
    console.error('Gagal membuat itinerary:', status || '', error?.message || error)

    if ([429, 500, 502, 503, 504].includes(status)) {
      return res.status(503).json({
        success: false,
        message:
          'Layanan AI sedang sibuk atau sementara tidak tersedia. Tunggu sebentar, lalu coba lagi.',
      })
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat membuat itinerary.',
    })
  }
})

// ========================================
// UC-15: MENGHASILKAN PACKING LIST DENGAN AI
// ========================================
app.post('/api/packing-list', async (req, res) => {
  try {
    const { destination, duration, tripType, flight, itinerary } = req.body || {}

    if (typeof destination !== 'string' || !destination.trim() || destination.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tujuan perjalanan wajib diisi, maksimal 100 karakter.',
      })
    }

    const totalDays = Number(duration)
    if (!Number.isInteger(totalDays) || totalDays < 1 || totalDays > 90) {
      return res.status(400).json({
        success: false,
        message: 'Durasi perjalanan harus antara 1 sampai 90 hari.',
      })
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY belum diatur di backend/.env.',
      })
    }

    const allowedTypes = ['liburan', 'bisnis', 'petualangan', 'keluarga', 'pantai', 'pegunungan']
    const selectedType = allowedTypes.includes(tripType) ? tripType : 'liburan'

    const flightInfo =
      flight && typeof flight === 'object'
        ? {
            origin: String(flight.origin || '').slice(0, 100),
            destination: String(flight.destination || '').slice(0, 100),
            departureDate: String(flight.departureDate || '').slice(0, 20),
            departureTime: String(flight.departureTime || '').slice(0, 20),
            arrivalTime: String(flight.arrivalTime || '').slice(0, 20),
            airline: String(flight.airline || '').slice(0, 100),
            flightNumber: String(flight.flightNumber || '').slice(0, 50),
            hasReturnFlight: Boolean(flight.hasReturnFlight),
            returnDate: String(flight.returnDate || '').slice(0, 20),
          }
        : null

    const source = itinerary?.itinerary || itinerary
    const rawDays = Array.isArray(source?.days) ? source.days : Array.isArray(source) ? source : []

    const itineraryDays = rawDays.slice(0, 90).map((day, index) => ({
      day: Number(day.day) || index + 1,
      date: String(day.date || '').slice(0, 20),
      title: String(day.title || '').slice(0, 150),
      activities: (Array.isArray(day.activities) ? day.activities : [])
        .slice(0, 20)
        .map((activity) => ({
          time: String(activity.time || '').slice(0, 20),
          name: String(activity.name || activity.title || '').slice(0, 150),
          location: String(activity.location || '').slice(0, 150),
          description: String(activity.description || '').slice(0, 250),
        })),
    }))

    const hasItinerary = itineraryDays.some((day) => day.activities.length > 0)

    const flightContext = flightInfo
      ? `
INFORMASI TIKET:
- Asal: ${flightInfo.origin || 'Tidak diketahui'}
- Tujuan: ${flightInfo.destination || 'Tidak diketahui'}
- Tanggal berangkat: ${flightInfo.departureDate || 'Tidak diketahui'}
- Jam berangkat: ${flightInfo.departureTime || 'Tidak diketahui'}
- Jam tiba: ${flightInfo.arrivalTime || 'Tidak diketahui'}
- Maskapai: ${flightInfo.airline || 'Tidak diketahui'}
- Nomor penerbangan: ${flightInfo.flightNumber || 'Tidak diketahui'}
- Tiket pulang dipilih: ${flightInfo.hasReturnFlight ? 'Ya' : 'Tidak atau tidak tersedia'}
- Tanggal pulang: ${flightInfo.returnDate || 'Tidak tersedia'}

Pertimbangkan dokumen perjalanan dan kebutuhan selama penerbangan.
Jangan mengarang batas bagasi spesifik maskapai atau menganggap ada tiket pulang jika tidak tercatat.
`
      : 'Tidak ada informasi tiket yang tersedia. Jangan mengarang jadwal penerbangan.'

    const itineraryContext = hasItinerary
      ? `
ITINERARY PENGGUNA:
${JSON.stringify(itineraryDays, null, 2)}

Gunakan aktivitas yang tercantum untuk memilih barang yang relevan.
Aktivitas pantai dapat membutuhkan pakaian renang dan sunscreen;
hiking dapat membutuhkan sepatu yang sesuai dan botol minum;
aktivitas bisnis dapat membutuhkan pakaian formal dan perlengkapan kerja.
Jangan menyarankan perlengkapan aktivitas yang tidak didukung itinerary.
`
      : 'Belum ada aktivitas itinerary. Buat daftar berdasarkan tujuan, durasi, dan jenis perjalanan.'

    const prompt = `
Kamu adalah asisten perjalanan TripMate yang membantu pengguna menyiapkan barang bawaan secara praktis, natural, dan personal.

TUJUAN PERJALANAN: ${destination.trim()}
DURASI: ${totalDays} hari
JENIS PERJALANAN: ${selectedType}

${flightContext}

${itineraryContext}

Buat daftar barang bawaan yang perlu disiapkan.

ATURAN:
1. Gunakan bahasa Indonesia yang natural dan jelas.
2. Sesuaikan jumlah pakaian dengan durasi perjalanan.
3. Pertimbangkan dokumen, pakaian, perlengkapan mandi, elektronik, kebutuhan pribadi, dan perlengkapan aktivitas jika relevan.
4. Sesuaikan barang dengan destinasi dan kegiatan itinerary.
5. Jangan menganggap kondisi cuaca tertentu sebagai fakta jika tidak diketahui.
6. Hindari duplikasi dan barang yang tidak diperlukan.
7. Jangan menjadikan obat resep tertentu sebagai kebutuhan wajib.
8. Untuk perjalanan pesawat, pertimbangkan dokumen dan kebutuhan selama penerbangan, tetapi jangan mengarang aturan bagasi maskapai.
9. Buat sekitar 15-30 barang yang relevan; jangan menambah barang hanya demi jumlah.
10. Nama barang harus spesifik, misalnya "3 kaos untuk aktivitas harian", bukan hanya "Baju".
11. Kelompokkan barang ke kategori seperti Pakaian, Dokumen, Elektronik, Perlengkapan Pribadi, Kesehatan, dan Perlengkapan Aktivitas.
12. Setiap barang harus memiliki category dan name.
13. Balas hanya dengan JSON valid tanpa Markdown.

FORMAT JSON:
{
  "items": [
    { "category": "Pakaian", "name": "3 kaos untuk aktivitas harian" },
    { "category": "Dokumen", "name": "Kartu identitas" }
  ]
}
`

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const response = await generateItineraryWithRetry(ai, prompt, 3)
    const result = parseGeminiJson(response.text || '')

    if (!Array.isArray(result.items)) {
      return res.status(502).json({
        success: false,
        message: 'AI tidak menghasilkan daftar barang yang valid. Silakan coba lagi.',
      })
    }

    const seen = new Set()
    const items = result.items
      .map((item) => {
        const name = (typeof item === 'string' ? item : item?.name || item?.item || '').trim()

        const category = (
          typeof item === 'object' && item ? item.category || 'Lainnya' : 'Lainnya'
        ).trim()

        const key = name.toLocaleLowerCase('id-ID')
        if (!name || name.length > 150 || seen.has(key)) return null

        seen.add(key)
        return {
          category: category.slice(0, 50),
          name,
        }
      })
      .filter(Boolean)
      .slice(0, 40)

    if (items.length === 0) {
      return res.status(502).json({
        success: false,
        message: 'AI belum menghasilkan barang bawaan. Silakan coba lagi.',
      })
    }

    return res.json({
      success: true,
      items,
      context: {
        usedFlight: Boolean(flightInfo),
        usedItinerary: hasItinerary,
      },
    })
  } catch (error) {
    const status = Number(error?.status || error?.code)
    console.error('Gagal membuat packing list:', status || '', error?.message || error)

    if ([429, 500, 502, 503, 504].includes(status)) {
      return res.status(503).json({
        success: false,
        message:
          'Layanan AI sedang sibuk atau sementara tidak tersedia. Tunggu sebentar, lalu coba lagi.',
      })
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat membuat packing list.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`Backend TripMate berjalan di http://localhost:${PORT}`)
})
