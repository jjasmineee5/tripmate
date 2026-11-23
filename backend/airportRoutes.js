const express = require('express')
const router = express.Router()
const { searchAirportSuggestions } = require('./airportService')

// GET /api/airports/search?q=Jak
router.get('/search', (req, res) => {
  try {
    const query = String(req.query.q || '').trim()

    if (query.length < 2) {
      return res.json({
        success: true,
        data: [],
      })
    }

    if (query.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Pencarian maksimal 100 karakter.',
      })
    }

    const results = searchAirportSuggestions(query)

    return res.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Pencarian bandara gagal:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mencari bandara.',
    })
  }
})

module.exports = router
