const express = require('express')
const router = express.Router()
const db = require('./database')
const { verifyToken } = require('./authMiddleware')

router.use(verifyToken)

// ========================================
// SIMPAN ITINERARY
// ========================================
router.post('/save', async (req, res) => {
  const connection = await db.getConnection()
  let transactionStarted = false

  try {
    const userId = req.user.id
    const { dbTripId, destination, startDate, endDate, days } = req.body

    if (!dbTripId || !destination || !Array.isArray(days)) {
      return res.status(400).json({
        success: false,
        message: 'Data itinerary tidak lengkap.',
      })
    }

    // Pastikan perjalanan milik pengguna yang login
    const [trips] = await connection.execute(
      `SELECT id_perjalanan
       FROM perjalanan
       WHERE id_perjalanan = ? AND id_pengguna = ?`,
      [dbTripId, userId],
    )

    if (trips.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Perjalanan tidak ditemukan atau bukan milik Anda.',
      })
    }

    await connection.beginTransaction()
    transactionStarted = true

    // Cek apakah itinerary untuk perjalanan ini sudah ada
    const [plans] = await connection.execute(
      `SELECT id_rencana_perjalanan
       FROM rencana_perjalanan
       WHERE id_perjalanan = ?
       LIMIT 1`,
      [dbTripId],
    )

    let planId

    if (plans.length > 0) {
      planId = plans[0].id_rencana_perjalanan

      // Update rencana yang sudah ada
      await connection.execute(
        `UPDATE rencana_perjalanan
         SET judul = ?,
             deskripsi = ?,
             tanggal_mulai = ?,
             tanggal_selesai = ?
         WHERE id_rencana_perjalanan = ?`,
        [
          destination,
          'Rencana perjalanan yang dibuat dengan TripMate AI',
          startDate || null,
          endDate || null,
          planId,
        ],
      )

      // Hapus aktivitas lama agar diganti dengan data terbaru
      await connection.execute(
        `DELETE FROM aktivitas
         WHERE id_rencana_perjalanan = ?`,
        [planId],
      )
    } else {
      // Buat rencana itinerary baru
      const [result] = await connection.execute(
        `INSERT INTO rencana_perjalanan
         (id_perjalanan, judul, deskripsi, tanggal_mulai, tanggal_selesai)
         VALUES (?, ?, ?, ?, ?)`,
        [
          dbTripId,
          destination,
          'Rencana perjalanan yang dibuat dengan TripMate AI',
          startDate || null,
          endDate || null,
        ],
      )

      planId = result.insertId
    }

    // Simpan seluruh aktivitas
    for (const day of days) {
      const activities = Array.isArray(day.activities) ? day.activities : []

      for (const activity of activities) {
        // Mengubah biaya kosong atau tidak valid menjadi 0
        const cost = Number(activity.estimatedCost) || 0

        await connection.execute(
          `INSERT INTO aktivitas
           (
             id_rencana_perjalanan,
             hari_ke,
             judul,
             deskripsi,
             lokasi,
             waktu_mulai,
             estimasi_biaya,
             catatan
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            planId,
            Number(day.day) || 1,
            String(activity.name || activity.title || 'Aktivitas'),
            activity.description || null,
            activity.location || null,
            activity.time || null,
            cost,
            null,
          ],
        )
      }
    }

    await connection.commit()
    transactionStarted = false

    return res.json({
      success: true,
      message: 'Itinerary berhasil disimpan.',
      id_rencana_perjalanan: planId,
    })
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback()
    }

    console.error('Gagal menyimpan itinerary:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan itinerary ke database.',
    })
  } finally {
    connection.release()
  }
})

// ========================================
// CEK PERJALANAN YANG SUDAH MEMILIKI ITINERARY
// ========================================
router.get('/status/list', async (req, res) => {
  try {
    const userId = req.user.id

    const [plans] = await db.execute(
      `SELECT rp.id_perjalanan
       FROM rencana_perjalanan rp
       JOIN perjalanan p ON rp.id_perjalanan = p.id_perjalanan
       WHERE p.id_pengguna = ?`,
      [userId],
    )

    return res.json({
      success: true,
      data: plans.map((plan) => plan.id_perjalanan),
    })
  } catch (error) {
    console.error('Gagal mengecek status itinerary:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal mengecek status itinerary.',
    })
  }
})

// ========================================
// AMBIL ITINERARY BERDASARKAN ID PERJALANAN
// ========================================
router.get('/:tripId', async (req, res) => {
  try {
    const userId = req.user.id
    const tripId = req.params.tripId

    // Pastikan perjalanan milik pengguna yang login
    const [trips] = await db.execute(
      `SELECT id_perjalanan
       FROM perjalanan
       WHERE id_perjalanan = ? AND id_pengguna = ?`,
      [tripId, userId],
    )

    if (trips.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Perjalanan tidak ditemukan atau bukan milik Anda.',
      })
    }

    // Ambil rencana perjalanan
    const [plans] = await db.execute(
      `SELECT *
       FROM rencana_perjalanan
       WHERE id_perjalanan = ?
       LIMIT 1`,
      [tripId],
    )

    if (plans.length === 0) {
      return res.json({
        success: true,
        data: null,
      })
    }

    const plan = plans[0]

    // Ambil seluruh aktivitas
    const [activities] = await db.execute(
      `SELECT *
       FROM aktivitas
       WHERE id_rencana_perjalanan = ?
       ORDER BY hari_ke ASC, waktu_mulai ASC, id_aktivitas ASC`,
      [plan.id_rencana_perjalanan],
    )

    // Kelompokkan aktivitas berdasarkan hari
    const daysMap = {}

    for (const activity of activities) {
      const dayNumber = activity.hari_ke || 1

      if (!daysMap[dayNumber]) {
        daysMap[dayNumber] = {
          day: dayNumber,
          date: '',
          title: `Hari ${dayNumber}`,
          description: '',
          activities: [],
        }
      }

      daysMap[dayNumber].activities.push({
        id: activity.id_aktivitas,
        time: activity.waktu_mulai ? String(activity.waktu_mulai).slice(0, 5) : '09:00',
        name: activity.judul,
        location: activity.lokasi || '',
        description: activity.deskripsi || '',
        estimatedCost: activity.estimasi_biaya,
      })
    }

    const days = Object.values(daysMap)

    return res.json({
      success: true,
      data: {
        id_rencana_perjalanan: plan.id_rencana_perjalanan,
        dbTripId: plan.id_perjalanan,
        destination: plan.judul,
        startDate: plan.tanggal_mulai,
        endDate: plan.tanggal_selesai,
        days,
      },
    })
  } catch (error) {
    console.error('Gagal mengambil itinerary:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil itinerary dari database.',
    })
  }
})

module.exports = router
