const db = require('./database')

async function verifyPremium(req, res, next) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Identitas pengguna tidak ditemukan. Silakan login kembali.',
      })
    }

    const [subscriptions] = await db.execute(
      `SELECT id_langganan
       FROM langganan_premium
       WHERE id_pengguna = ?
         AND status = 'aktif'
         AND tanggal_mulai <= NOW()
         AND tanggal_berakhir > NOW()
       ORDER BY tanggal_berakhir DESC
       LIMIT 1`,
      [userId],
    )

    if (subscriptions.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Fitur ini hanya tersedia untuk pengguna TripMate Premium.',
        premium_required: true,
      })
    }

    req.isPremium = true

    next()
  } catch (error) {
    console.error('Gagal memeriksa status Premium:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal memeriksa status Premium.',
    })
  }
}

module.exports = { verifyPremium }
