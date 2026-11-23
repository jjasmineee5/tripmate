const express = require('express')
const db = require('./database')
const { verifyToken } = require('./authMiddleware')

const router = express.Router()

// Memastikan hanya admin yang dapat mengakses API
function verifyAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Akses hanya untuk administrator.',
    })
  }

  next()
}

// GET: Menampilkan daftar pengguna terdaftar
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT
        id_pengguna,
        nama,
        email,
        peran,
        status_premium,
        tanggal_dibuat
      FROM pengguna
      WHERE peran = 'pengguna'
      ORDER BY tanggal_dibuat DESC
    `)

    return res.json({
      success: true,
      total: users.length,
      data: users,
    })
  } catch (error) {
    console.error('Gagal mengambil data pengguna:', error)

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pengguna.',
    })
  }
})

// GET: Menampilkan seluruh informasi pemesanan tiket untuk admin
router.get('/bookings', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [bookings] = await db.execute(`
      SELECT
        pm.id_pemesanan,
        pm.kode_pemesanan,
        pm.tanggal_pemesanan,
        pm.status,
        pm.total_harga,

        pg.nama AS nama_pengguna,
        pg.email,

        pj.judul AS nama_perjalanan,

        pn.maskapai,
        pn.kode_penerbangan,
        pn.bandara_keberangkatan,
        pn.bandara_kedatangan,
        pn.waktu_keberangkatan,
        pn.waktu_kedatangan,

        pen.daftar_penumpang

      FROM pemesanan pm

      JOIN pengguna pg
        ON pm.id_pengguna = pg.id_pengguna

      LEFT JOIN perjalanan pj
        ON pm.id_perjalanan = pj.id_perjalanan

      LEFT JOIN penerbangan pn
        ON pm.id_penerbangan = pn.id_penerbangan

      LEFT JOIN (
        SELECT
          id_pemesanan,
          GROUP_CONCAT(nama_lengkap SEPARATOR ', ') AS daftar_penumpang
        FROM penumpang
        GROUP BY id_pemesanan
      ) pen
        ON pm.id_pemesanan = pen.id_pemesanan

      ORDER BY pm.tanggal_pemesanan DESC
    `)

    return res.json({
      success: true,
      total: bookings.length,
      data: bookings,
    })
  } catch (error) {
    console.error('Gagal mengambil data pemesanan:', error)

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pemesanan.',
    })
  }
})

module.exports = router
