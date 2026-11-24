const express = require('express')
const db = require('./database')
const midtransClient = require('midtrans-client')

const router = express.Router()

const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
})

// POST /api/premium/notification
router.post('/', async (req, res) => {
  let connection

  try {
    // Verifikasi dan ambil status transaksi dari Midtrans
    const notification = await coreApi.transaction.notification(req.body)

    const orderId = notification.order_id
    const transactionStatus = notification.transaction_status
    const fraudStatus = notification.fraud_status
    const paymentType = notification.payment_type

    console.log('STATUS MIDTRANS:', {
      orderId,
      transactionStatus,
      fraudStatus,
      paymentType,
    })

    let statusPembayaran

    if (transactionStatus === 'capture') {
      statusPembayaran = fraudStatus === 'accept' ? 'paid' : 'pending'
    } else if (transactionStatus === 'settlement') {
      statusPembayaran = 'paid'
    } else if (transactionStatus === 'pending') {
      statusPembayaran = 'pending'
    } else if (
      transactionStatus === 'deny' ||
      transactionStatus === 'cancel' ||
      transactionStatus === 'expire'
    ) {
      statusPembayaran = 'failed'
    } else {
      statusPembayaran = transactionStatus
    }

    connection = await db.getConnection()
    await connection.beginTransaction()

    // Update status transaksi Premium
    const [transactions] = await connection.execute(
      `SELECT id_transaksi, id_pengguna, id_paket
       FROM transaksi_premium
       WHERE kode_transaksi = ?
       FOR UPDATE`,
      [orderId],
    )

    if (transactions.length === 0) {
      await connection.rollback()

      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan.',
      })
    }

    const transaksi = transactions[0]

    await connection.execute(
      `UPDATE transaksi_premium
       SET status_pembayaran = ?,
           metode_pembayaran = ?,
           tanggal_transaksi = NOW()
       WHERE kode_transaksi = ?`,
      [statusPembayaran, paymentType, orderId],
    )

    // Aktifkan Premium jika pembayaran berhasil
    if (statusPembayaran === 'paid') {
      const [packages] = await connection.execute(
        `SELECT durasi_hari
         FROM paket_premium
         WHERE id_paket = ?`,
        [transaksi.id_paket],
      )

      if (packages.length > 0) {
        const durasiHari = packages[0].durasi_hari

        // Cek apakah pengguna masih memiliki Premium aktif
        const [subscriptions] = await connection.execute(
          `SELECT tanggal_berakhir
           FROM langganan_premium
           WHERE id_pengguna = ?
             AND status = 'aktif'
             AND tanggal_berakhir > NOW()
           ORDER BY tanggal_berakhir DESC
           LIMIT 1
           FOR UPDATE`,
          [transaksi.id_pengguna],
        )

        let tanggalMulai
        let tanggalBerakhir

        if (subscriptions.length > 0) {
          tanggalMulai = subscriptions[0].tanggal_berakhir
        } else {
          tanggalMulai = new Date()
        }

        const mulai = new Date(tanggalMulai)
        const berakhir = new Date(mulai)

        berakhir.setDate(berakhir.getDate() + durasiHari)

        tanggalBerakhir = berakhir

        await connection.execute(
          `INSERT INTO langganan_premium
           (id_pengguna, id_transaksi, tanggal_mulai, tanggal_berakhir, status)
           VALUES (?, ?, ?, ?, 'aktif')`,
          [transaksi.id_pengguna, transaksi.id_transaksi, mulai, tanggalBerakhir],
        )

        // Aktifkan status Premium pada akun pengguna
        await connection.execute(
          `UPDATE pengguna
           SET status_premium = 1
           WHERE id_pengguna = ?`,
          [transaksi.id_pengguna],
        )
      }
    }

    await connection.commit()

    return res.status(200).json({
      success: true,
      message: 'Notifikasi pembayaran berhasil diproses.',
    })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }

    console.error('Gagal memproses notifikasi Midtrans:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal memproses notifikasi pembayaran.',
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

module.exports = router
