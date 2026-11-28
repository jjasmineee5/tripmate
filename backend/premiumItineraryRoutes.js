const express = require('express')
const { GoogleGenAI } = require('@google/genai')
const { verifyToken } = require('./authMiddleware')
const { verifyPremium } = require('./premiumMiddleware')

const router = express.Router()

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

    throw new Error('Respons AI bukan JSON valid.')
  }
}

router.post('/adjust-budget', verifyToken, verifyPremium, async (req, res) => {
  try {
    const { itinerary, targetBudget, destination } = req.body || {}

    if (!Array.isArray(itinerary) || itinerary.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Itinerary yang akan disesuaikan wajib diisi.',
      })
    }

    const budget = Number(targetBudget)

    if (!Number.isFinite(budget) || budget <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target budget harus berupa angka lebih dari 0.',
      })
    }

    if (typeof destination !== 'string' || !destination.trim() || destination.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Destinasi perjalanan tidak valid.',
      })
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })

    const prompt = `
Kamu adalah AI perencana perjalanan TripMate.

TUGAS:
Sesuaikan itinerary perjalanan pengguna agar lebih sesuai
dengan target budget yang diberikan.

DESTINASI: ${destination.trim()}
TARGET BUDGET: Rp${budget.toLocaleString('id-ID')}

ITINERARY SEBELUM PENYESUAIAN:
${JSON.stringify(itinerary, null, 2)}

ATURAN:
1. Gunakan bahasa Indonesia yang natural.
2. Pertahankan jumlah hari perjalanan.
3. Pertahankan tanggal dan nomor hari jika tersedia.
4. Sesuaikan aktivitas, lokasi, dan perkiraan biaya agar
   lebih sesuai dengan target budget.
5. Prioritaskan alternatif yang lebih hemat jika diperlukan.
6. Jangan menghilangkan aktivitas penting tanpa alasan.
7. Jangan mengarang harga pasti. Berikan estimasi biaya.
8. Jika target budget tidak realistis, jelaskan keterbatasannya
   melalui deskripsi itinerary.
9. Jangan mengubah struktur JSON.
10. Setiap aktivitas harus memiliki time, name, location,
    description, dan estimatedCost.
11. Balas hanya dengan JSON valid tanpa Markdown.

FORMAT:
{
  "days": [
    {
      "day": 1,
      "date": "",
      "title": "",
      "description": "",
      "activities": [
        {
          "time": "09:00",
          "name": "",
          "location": "",
          "description": "",
          "estimatedCost": 0
        }
      ]
    }
  ]
}
`

    const models = ['gemini-3.6-flash', 'gemini-2.5-flash']

    let response
    let lastError

    for (const model of models) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
        })
        break
      } catch (error) {
        lastError = error
      }
    }

    if (!response) {
      throw lastError || new Error('AI gagal menghasilkan itinerary.')
    }

    const result = parseGeminiJson(response.text || '')

    if (!Array.isArray(result.days) || result.days.length !== itinerary.length) {
      return res.status(502).json({
        success: false,
        message: 'AI menghasilkan itinerary yang tidak sesuai. Silakan coba lagi.',
      })
    }

    const adjustedDays = result.days.map((day, index) => ({
      day: Number(day.day) || index + 1,
      date: typeof day.date === 'string' ? day.date : '',
      title: String(day.title || `Hari ${index + 1}`),
      description: String(day.description || ''),
      activities: (Array.isArray(day.activities) ? day.activities : []).map((activity) => {
        const cost =
          activity.estimatedCost !== null &&
          activity.estimatedCost !== undefined &&
          activity.estimatedCost !== ''
            ? Number(activity.estimatedCost)
            : null

        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: /^\d{2}:\d{2}$/.test(String(activity.time || '')) ? activity.time : '09:00',
          name: String(activity.name || 'Aktivitas'),
          location: String(activity.location || ''),
          description: String(activity.description || ''),
          estimatedCost: cost !== null && Number.isFinite(cost) ? Math.max(0, cost) : null,
        }
      }),
    }))

    return res.json({
      success: true,
      message: 'Itinerary berhasil disesuaikan berdasarkan budget.',
      itinerary: {
        days: adjustedDays,
      },
      targetBudget: budget,
    })
  } catch (error) {
    console.error('Gagal menyesuaikan budget itinerary:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal menyesuaikan itinerary berdasarkan budget.',
    })
  }
})

module.exports = router
