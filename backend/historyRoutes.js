const express = require('express')
const router = express.Router()
const db = require('./database')
const { verifyToken } = require('./authMiddleware')

router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id

    const [bookings] = await db.execute(
      `SELECT
        p.id_pemesanan,
        p.id_pengguna,
        p.id_perjalanan,
        p.id_penerbangan,
        p.id_penerbangan_pulang,
        p.kode_pemesanan,
        p.tanggal_pemesanan,
        p.status,
        p.total_harga,

        -- Penerbangan pergi
        pergi.maskapai,
        pergi.kode_penerbangan,
        pergi.bandara_keberangkatan,
        pergi.bandara_kedatangan,
        pergi.waktu_keberangkatan,
        pergi.waktu_kedatangan,
        pergi.durasi,
        pergi.harga,
        pergi.kode_mata_uang,

        -- Penerbangan pulang
        pulang.maskapai AS maskapai_pulang,
        pulang.kode_penerbangan AS kode_penerbangan_pulang,
        pulang.bandara_keberangkatan AS bandara_keberangkatan_pulang,
        pulang.bandara_kedatangan AS bandara_kedatangan_pulang,
        pulang.waktu_keberangkatan AS waktu_keberangkatan_pulang,
        pulang.waktu_kedatangan AS waktu_kedatangan_pulang,
        pulang.durasi AS durasi_pulang,
        pulang.harga AS harga_pulang,
        pulang.kode_mata_uang AS kode_mata_uang_pulang,

        GROUP_CONCAT(
          DISTINCT pen.nama_lengkap
          SEPARATOR ', '
        ) AS nama_penumpang

      FROM pemesanan p

      JOIN penerbangan pergi
        ON p.id_penerbangan = pergi.id_penerbangan

      LEFT JOIN penerbangan pulang
        ON p.id_penerbangan_pulang = pulang.id_penerbangan

      LEFT JOIN penumpang pen
        ON p.id_pemesanan = pen.id_pemesanan

      WHERE p.id_pengguna = ?

      GROUP BY p.id_pemesanan

      ORDER BY p.tanggal_pemesanan DESC`,
      [userId],
    )

    res.json({
      success: true,
      data: bookings,
    })
  } catch (error) {
    console.error('History error:', error)

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat pemesanan.',
    })
  }
})

module.exports = router
