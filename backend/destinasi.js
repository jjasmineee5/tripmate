const express = require('express')
const db = require('./database')
const { verifyToken } = require('./authMiddleware')

const router = express.Router()

// Memastikan hanya admin yang bisa mengelola destinasi
function verifyAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Akses hanya untuk administrator.',
    })
  }

  next()
}

// GET: Mengambil seluruh destinasi
router.get('/', verifyToken, async (req, res) => {
  try {
    const [destinasi] = await db.query(`
      SELECT
        id_destinasi,
        nama,
        negara,
        kota,
        deskripsi,
        tautan_gambar,
        rating,
        detail
      FROM destinasi
    `)

    res.json({
      success: true,
      data: destinasi,
    })
  } catch (error) {
    console.error('Gagal mengambil destinasi:', error)

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data destinasi.',
    })
  }
})

// POST: Admin menambahkan destinasi
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { nama, negara, kota, deskripsi, tautan_gambar, rating, detail } = req.body

    if (!nama?.trim() || !negara?.trim() || !kota?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama, negara, dan kota wajib diisi.',
      })
    }

    const nilaiRating =
      rating === '' || rating === null || rating === undefined ? null : Number(rating)

    if (
      nilaiRating !== null &&
      (!Number.isFinite(nilaiRating) || nilaiRating < 0 || nilaiRating > 5)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Rating harus berada antara 0 dan 5.',
      })
    }

    const [result] = await db.query(
      `INSERT INTO destinasi
       (nama, negara, kota, deskripsi, tautan_gambar, rating, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nama.trim(),
        negara.trim(),
        kota.trim(),
        deskripsi?.trim() || null,
        tautan_gambar?.trim() || null,
        nilaiRating,
        detail?.trim() || null,
      ],
    )

    res.status(201).json({
      success: true,
      message: 'Destinasi berhasil ditambahkan.',
      id_destinasi: result.insertId,
    })
  } catch (error) {
    console.error('Gagal menambahkan destinasi:', error)

    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan destinasi.',
    })
  }
})

// PUT: Admin mengedit destinasi
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID destinasi tidak valid.',
      })
    }

    const { nama, negara, kota, deskripsi, tautan_gambar, rating, detail } = req.body

    if (!nama?.trim() || !negara?.trim() || !kota?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama, negara, dan kota wajib diisi.',
      })
    }

    const nilaiRating =
      rating === '' || rating === null || rating === undefined ? null : Number(rating)

    if (
      nilaiRating !== null &&
      (!Number.isFinite(nilaiRating) || nilaiRating < 0 || nilaiRating > 5)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Rating harus berada antara 0 dan 5.',
      })
    }

    const [result] = await db.query(
      `UPDATE destinasi
       SET nama = ?,
           negara = ?,
           kota = ?,
           deskripsi = ?,
           tautan_gambar = ?,
           rating = ?,
           detail = ?
       WHERE id_destinasi = ?`,
      [
        nama.trim(),
        negara.trim(),
        kota.trim(),
        deskripsi?.trim() || null,
        tautan_gambar?.trim() || null,
        nilaiRating,
        detail?.trim() || null,
        id,
      ],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Destinasi tidak ditemukan.',
      })
    }

    res.json({
      success: true,
      message: 'Destinasi berhasil diperbarui.',
    })
  } catch (error) {
    console.error('Gagal memperbarui destinasi:', error)

    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui destinasi.',
    })
  }
})

module.exports = router
