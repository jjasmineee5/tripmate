const express = require('express')
const router = express.Router()
const db = require('./database')
const { verifyToken } = require('./authMiddleware')

router.use(verifyToken)

// ========================================
// HELPER: MEMASTIKAN PERJALANAN MILIK USER
// ========================================
async function cekPerjalanan(userId, idPerjalanan) {
  const [rows] = await db.execute(
    `SELECT id_perjalanan
     FROM perjalanan
     WHERE id_perjalanan = ? AND id_pengguna = ?`,
    [idPerjalanan, userId],
  )

  return rows.length > 0
}

// ========================================
// GET: CEK PERJALANAN YANG SUDAH MEMILIKI DAFTAR PERLENGKAPAN
// ========================================
router.get('/status/list', async (req, res) => {
  try {
    const userId = req.user.id

    const [daftar] = await db.execute(
      `SELECT d.id_perjalanan
       FROM daftar_barang d
       JOIN perjalanan p ON d.id_perjalanan = p.id_perjalanan
       WHERE p.id_pengguna = ?`,
      [userId],
    )

    return res.json({
      success: true,
      data: daftar.map((item) => item.id_perjalanan),
    })
  } catch (error) {
    console.error('Gagal mengecek status daftar perlengkapan:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal mengecek status daftar perlengkapan.',
    })
  }
})

// ========================================
// GET: MENGAMBIL DAFTAR BAWAAN PERJALANAN
// ========================================
router.get('/:id_perjalanan', async (req, res) => {
  try {
    const userId = req.user.id
    const idPerjalanan = req.params.id_perjalanan

    const valid = await cekPerjalanan(userId, idPerjalanan)

    if (!valid) {
      return res.status(404).json({
        success: false,
        message: 'Perjalanan tidak ditemukan.',
      })
    }

    const [daftar] = await db.execute(
      `SELECT *
       FROM daftar_barang
       WHERE id_perjalanan = ?
       LIMIT 1`,
      [idPerjalanan],
    )

    if (daftar.length === 0) {
      return res.json({
        success: true,
        daftar: null,
        items: [],
      })
    }

    const [items] = await db.execute(
      `SELECT *
       FROM item_barang
       WHERE id_daftar_barang = ?
       ORDER BY kategori ASC, id_item ASC`,
      [daftar[0].id_daftar_barang],
    )

    return res.json({
      success: true,
      daftar: daftar[0],
      items,
    })
  } catch (error) {
    console.error('Gagal mengambil daftar bawaan:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar bawaan.',
    })
  }
})

// ========================================
// POST: MENYIMPAN DAFTAR BAWAAN
// ========================================
router.post('/', async (req, res) => {
  let connection

  try {
    const userId = req.user.id
    const { id_perjalanan, judul, deskripsi, items } = req.body

    if (!id_perjalanan || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Perjalanan dan daftar barang wajib tersedia.',
      })
    }

    const valid = await cekPerjalanan(userId, id_perjalanan)

    if (!valid) {
      return res.status(404).json({
        success: false,
        message: 'Perjalanan tidak ditemukan.',
      })
    }

    connection = await db.getConnection()
    await connection.beginTransaction()

    const [daftarRows] = await connection.execute(
      `SELECT id_daftar_barang
       FROM daftar_barang
       WHERE id_perjalanan = ?
       LIMIT 1`,
      [id_perjalanan],
    )

    let idDaftarBarang

    if (daftarRows.length > 0) {
      idDaftarBarang = daftarRows[0].id_daftar_barang

      await connection.execute(
        `UPDATE daftar_barang
         SET judul = ?, deskripsi = ?, tanggal_diperbarui = CURRENT_TIMESTAMP
         WHERE id_daftar_barang = ?`,
        [judul || 'Daftar Bawaan', deskripsi || null, idDaftarBarang],
      )

      await connection.execute(
        `DELETE FROM item_barang
         WHERE id_daftar_barang = ?`,
        [idDaftarBarang],
      )
    } else {
      const [result] = await connection.execute(
        `INSERT INTO daftar_barang
         (id_perjalanan, judul, deskripsi)
         VALUES (?, ?, ?)`,
        [id_perjalanan, judul || 'Daftar Bawaan', deskripsi || null],
      )

      idDaftarBarang = result.insertId
    }

    for (const item of items) {
      const nama = String(item.nama || item.name || '').trim()

      if (!nama) continue

      await connection.execute(
        `INSERT INTO item_barang
         (id_daftar_barang, nama, kategori, status_pemeriksaan, catatan)
         VALUES (?, ?, ?, ?, ?)`,
        [
          idDaftarBarang,
          nama.slice(0, 100),
          item.kategori || item.category || 'Lainnya',
          item.status_pemeriksaan ? 1 : 0,
          item.catatan || null,
        ],
      )
    }

    await connection.commit()

    return res.status(201).json({
      success: true,
      message: 'Daftar bawaan berhasil disimpan.',
      id_daftar_barang: idDaftarBarang,
    })
  } catch (error) {
    if (connection) await connection.rollback()

    console.error('Gagal menyimpan daftar bawaan:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan daftar bawaan.',
    })
  } finally {
    if (connection) connection.release()
  }
})

// ========================================
// PUT: MEMPERBARUI CHECKLIST BARANG
// ========================================
router.put('/item/:id_item', async (req, res) => {
  try {
    const userId = req.user.id
    const idItem = req.params.id_item
    const { status_pemeriksaan } = req.body

    if (![0, 1, true, false].includes(status_pemeriksaan)) {
      return res.status(400).json({
        success: false,
        message: 'Status checklist tidak valid.',
      })
    }

    const [items] = await db.execute(
      `SELECT i.id_item
       FROM item_barang i
       JOIN daftar_barang d
         ON i.id_daftar_barang = d.id_daftar_barang
       JOIN perjalanan p
         ON d.id_perjalanan = p.id_perjalanan
       WHERE i.id_item = ?
         AND p.id_pengguna = ?`,
      [idItem, userId],
    )

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barang tidak ditemukan.',
      })
    }

    await db.execute(
      `UPDATE item_barang
       SET status_pemeriksaan = ?,
           tanggal_diperbarui = CURRENT_TIMESTAMP
       WHERE id_item = ?`,
      [status_pemeriksaan ? 1 : 0, idItem],
    )

    return res.json({
      success: true,
      message: 'Checklist barang berhasil diperbarui.',
    })
  } catch (error) {
    console.error('Gagal memperbarui checklist:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui checklist barang.',
    })
  }
})

module.exports = router
