const express = require('express')
const db = require('./database')
const { verifyToken } = require('./authMiddleware')

const router = express.Router()

// Semua endpoint perjalanan wajib menggunakan token login.
router.use(verifyToken)

// ========================================
// HELPER VALIDASI
// ========================================

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T12:00:00`)

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validateTrip(data) {
  const { tujuan_perjalanan, judul, tanggal_mulai, tanggal_selesai, tipe_perjalanan, anggaran } =
    data

  if (
    typeof tujuan_perjalanan !== 'string' ||
    !tujuan_perjalanan.trim() ||
    tujuan_perjalanan.trim().length > 255
  ) {
    return 'Tujuan perjalanan wajib diisi dan maksimal 255 karakter.'
  }

  if (typeof judul !== 'string' || !judul.trim() || judul.trim().length > 100) {
    return 'Judul perjalanan wajib diisi dan maksimal 100 karakter.'
  }

  if (!isValidDate(tanggal_mulai) || !isValidDate(tanggal_selesai)) {
    return 'Format tanggal tidak valid.'
  }

  if (tanggal_selesai < tanggal_mulai) {
    return 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
  }

  if (
    tipe_perjalanan !== undefined &&
    tipe_perjalanan !== null &&
    (typeof tipe_perjalanan !== 'string' || tipe_perjalanan.length > 20)
  ) {
    return 'Tipe perjalanan maksimal 20 karakter.'
  }

  if (
    anggaran !== undefined &&
    anggaran !== null &&
    (anggaran === '' || !Number.isFinite(Number(anggaran)) || Number(anggaran) < 0)
  ) {
    return 'Anggaran harus berupa angka nol atau lebih.'
  }

  return null
}

// ========================================
// CREATE: MENAMBAHKAN PERJALANAN
// POST /api/perjalanan
// ========================================

router.post('/', async (req, res) => {
  try {
    const validationError = validateTrip(req.body || {})

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      })
    }

    const {
      tujuan_perjalanan,
      judul,
      tanggal_mulai,
      tanggal_selesai,
      tipe_perjalanan,
      anggaran,
      catatan,
    } = req.body

    const [result] = await db.execute(
      `INSERT INTO perjalanan
        (
          id_pengguna,
          tujuan_perjalanan,
          judul,
          tanggal_mulai,
          tanggal_selesai,
          tipe_perjalanan,
          anggaran,
          catatan
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        tujuan_perjalanan.trim(),
        judul.trim(),
        tanggal_mulai,
        tanggal_selesai,
        tipe_perjalanan?.trim() || null,
        anggaran === '' || anggaran === undefined || anggaran === null ? null : Number(anggaran),
        typeof catatan === 'string' ? catatan.trim() || null : null,
      ],
    )

    return res.status(201).json({
      success: true,
      message: 'Perjalanan berhasil ditambahkan.',
      id_perjalanan: result.insertId,
    })
  } catch (error) {
    console.error('Gagal menambahkan perjalanan:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan perjalanan.',
    })
  }
})

// ========================================
// READ: MENAMPILKAN PERJALANAN PENGGUNA
// GET /api/perjalanan
// ========================================

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         id_perjalanan,
         id_pengguna,
         tujuan_perjalanan,
         judul,
         tanggal_mulai,
         tanggal_selesai,
         tipe_perjalanan,
         anggaran,
         catatan,
         tanggal_dibuat,
         tanggal_diperbarui
       FROM perjalanan
       WHERE id_pengguna = ?
       ORDER BY tanggal_dibuat DESC`,
      [req.user.id],
    )

    return res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error('Gagal mengambil perjalanan:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data perjalanan.',
    })
  }
})

// ========================================
// UPDATE: MENGUBAH PERJALANAN
// PUT /api/perjalanan/:id
// ========================================

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'ID perjalanan tidak valid.',
      })
    }

    const validationError = validateTrip(req.body || {})

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      })
    }

    const {
      tujuan_perjalanan,
      judul,
      tanggal_mulai,
      tanggal_selesai,
      tipe_perjalanan,
      anggaran,
      catatan,
    } = req.body

    const [result] = await db.execute(
      `UPDATE perjalanan
       SET tujuan_perjalanan = ?,
           judul = ?,
           tanggal_mulai = ?,
           tanggal_selesai = ?,
           tipe_perjalanan = ?,
           anggaran = ?,
           catatan = ?
       WHERE id_perjalanan = ?
         AND id_pengguna = ?`,
      [
        tujuan_perjalanan.trim(),
        judul.trim(),
        tanggal_mulai,
        tanggal_selesai,
        tipe_perjalanan?.trim() || null,
        anggaran === '' || anggaran === undefined || anggaran === null ? null : Number(anggaran),
        typeof catatan === 'string' ? catatan.trim() || null : null,
        id,
        req.user.id,
      ],
    )

    // Jika tidak ada perubahan, periksa apakah perjalanan memang milik pengguna.
    if (result.affectedRows === 0) {
      const [existingTrip] = await db.execute(
        `SELECT id_perjalanan
         FROM perjalanan
         WHERE id_perjalanan = ?
           AND id_pengguna = ?`,
        [id, req.user.id],
      )

      if (existingTrip.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Perjalanan tidak ditemukan atau bukan milik akun kamu.',
        })
      }
    }

    return res.json({
      success: true,
      message: 'Perjalanan berhasil diperbarui.',
    })
  } catch (error) {
    console.error('Gagal memperbarui perjalanan:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui perjalanan.',
    })
  }
})

// ========================================
// DELETE: MENGHAPUS PERJALANAN
// DELETE /api/perjalanan/:id
// ========================================

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'ID perjalanan tidak valid.',
      })
    }

    const [result] = await db.execute(
      `DELETE FROM perjalanan
       WHERE id_perjalanan = ?
         AND id_pengguna = ?`,
      [id, req.user.id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Perjalanan tidak ditemukan atau bukan milik akun kamu.',
      })
    }

    return res.json({
      success: true,
      message: 'Perjalanan berhasil dihapus.',
    })
  } catch (error) {
    console.error('Gagal menghapus perjalanan:', error.message)

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Perjalanan tidak dapat dihapus karena masih memiliki data terkait.',
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus perjalanan.',
    })
  }
})

module.exports = router
