const express = require('express')
const db = require('./database')
const { verifyToken } = require('./authMiddleware')
const { snap } = require('./midtrans')

const router = express.Router()

// GET /api/premium/packages
// Menampilkan paket Premium yang aktif
router.get('/packages', async (req, res) => {
  try {
    const [packages] = await db.execute(
      `SELECT id_paket, nama_paket, durasi_hari, harga
       FROM paket_premium
       WHERE status_aktif = 1
       ORDER BY durasi_hari ASC`,
    )

    return res.json({
      success: true,
      data: packages,
    })
  } catch (error) {
    console.error('Gagal mengambil paket Premium:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil paket Premium.',
    })
  }
})

// POST /api/premium/transactions
// Membuat transaksi database dan transaksi pembayaran Midtrans
router.post('/transactions', verifyToken, async (req, res) => {
  let connection
  let transactionStarted = false
  let kodeTransaksi = null
  let databaseTransactionCreated = false
  let paymentCreated = false

  try {
    const userId = req.user.id
    const { id_paket } = req.body || {}

    if (!id_paket) {
      return res.status(400).json({
        success: false,
        message: 'Paket Premium harus dipilih.',
      })
    }

    // Validasi ID paket
    const packageId = Number(id_paket)

    if (!Number.isInteger(packageId) || packageId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID paket Premium tidak valid.',
      })
    }

    // Ambil paket Premium yang aktif
    const [packages] = await db.execute(
      `SELECT id_paket, nama_paket, durasi_hari, harga
       FROM paket_premium
       WHERE id_paket = ? AND status_aktif = 1`,
      [packageId],
    )

    if (packages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paket Premium tidak ditemukan.',
      })
    }

    const selectedPackage = packages[0]
    const jumlah = Number(selectedPackage.harga)

    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Harga paket Premium tidak valid.',
      })
    }

    // Buat kode transaksi unik
    kodeTransaksi = 'TM-' + Date.now() + '-' + userId

    connection = await db.getConnection()

    await connection.beginTransaction()
    transactionStarted = true

    // Simpan transaksi ke database dengan status pending
    const [result] = await connection.execute(
      `INSERT INTO transaksi_premium
       (
         id_pengguna,
         id_paket,
         kode_transaksi,
         jumlah,
         status_pembayaran
       )
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, selectedPackage.id_paket, kodeTransaksi, jumlah],
    )

    await connection.commit()
    transactionStarted = false
    databaseTransactionCreated = true

    // Buat transaksi pembayaran Snap Midtrans
    const snapResponse = await snap.createTransaction({
      transaction_details: {
        order_id: kodeTransaksi,
        gross_amount: jumlah,
      },
      item_details: [
        {
          id: String(selectedPackage.id_paket),
          price: jumlah,
          quantity: 1,
          name: `TripMate Premium ${selectedPackage.nama_paket}`,
        },
      ],
    })

    paymentCreated = true

    return res.status(201).json({
      success: true,
      message: 'Transaksi Premium berhasil dibuat.',
      data: {
        id_transaksi: result.insertId,
        kode_transaksi: kodeTransaksi,
        nama_paket: selectedPackage.nama_paket,
        durasi_hari: selectedPackage.durasi_hari,
        jumlah,
        status_pembayaran: 'pending',
        snap_token: snapResponse.token,
        redirect_url: snapResponse.redirect_url,
      },
    })
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback()
      transactionStarted = false
    }

    // Jika transaksi database sudah dibuat tetapi Midtrans gagal,
    // tandai transaksi sebagai failed
    if (databaseTransactionCreated && !paymentCreated && kodeTransaksi) {
      try {
        await db.execute(
          `UPDATE transaksi_premium
           SET status_pembayaran = 'failed'
           WHERE kode_transaksi = ?
             AND status_pembayaran = 'pending'`,
          [kodeTransaksi],
        )
      } catch (updateError) {
        console.error(
          'Gagal memperbarui status transaksi setelah Midtrans gagal:',
          updateError.message,
        )
      }
    }

    console.error('Gagal membuat transaksi Premium:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal membuat transaksi Premium.',
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

module.exports = router
