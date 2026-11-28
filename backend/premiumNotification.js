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
  let transactionStarted = false

  try {
    // Verifikasi notifikasi dan ambil status transaksi dari Midtrans
    const notification = await coreApi.transaction.notification(req.body)

    const orderId = notification.order_id
    const transactionStatus = notification.transaction_status
    const fraudStatus = notification.fraud_status
    const paymentType = notification.payment_type
    const grossAmount = notification.gross_amount

    console.log('STATUS MIDTRANS:', {
      orderId,
      transactionStatus,
      fraudStatus,
      paymentType,
      grossAmount,
    })

    // Tentukan status pembayaran
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
    transactionStarted = true

    // Ambil transaksi dan kunci baris selama proses
    const [transactions] = await connection.execute(
      `SELECT id_transaksi, id_pengguna, id_paket, jumlah, status_pembayaran
       FROM transaksi_premium
       WHERE kode_transaksi = ?
       FOR UPDATE`,
      [orderId],
    )

    if (transactions.length === 0) {
      await connection.rollback()
      transactionStarted = false

      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan.',
      })
    }

    const transaksi = transactions[0]

    // Verifikasi nominal pembayaran sebelum memproses pembayaran berhasil
    if (statusPembayaran === 'paid') {
      const nominalDatabase = Number(transaksi.jumlah)
      const nominalMidtrans = Number(grossAmount)

      if (
        !Number.isFinite(nominalDatabase) ||
        !Number.isFinite(nominalMidtrans) ||
        nominalDatabase !== nominalMidtrans
      ) {
        await connection.rollback()
        transactionStarted = false

        console.error('Nominal pembayaran tidak cocok:', {
          orderId,
          nominalDatabase,
          nominalMidtrans,
        })

        return res.status(400).json({
          success: false,
          message: 'Nominal pembayaran tidak sesuai.',
        })
      }
    }

    // Jangan menurunkan status transaksi yang sudah paid
    if (transaksi.status_pembayaran === 'paid') {
      // Pastikan langganan sudah ada
      const [existingSubscriptions] = await connection.execute(
        `SELECT id_langganan
         FROM langganan_premium
         WHERE id_transaksi = ?
         LIMIT 1`,
        [transaksi.id_transaksi],
      )

      // Jika transaksi sudah paid tetapi langganan belum ada,
      // proses pemulihan aktivasi di bawah
      if (existingSubscriptions.length > 0) {
        await connection.commit()
        transactionStarted = false

        return res.status(200).json({
          success: true,
          message: 'Transaksi sudah berhasil diproses.',
        })
      }
    }

    // Update status transaksi
    await connection.execute(
      `UPDATE transaksi_premium
       SET status_pembayaran = ?,
           metode_pembayaran = ?,
           tanggal_transaksi = CASE
             WHEN ? = 'paid' AND tanggal_transaksi IS NULL THEN NOW()
             ELSE tanggal_transaksi
           END
       WHERE kode_transaksi = ?`,
      [statusPembayaran, paymentType || null, statusPembayaran, orderId],
    )

    // Aktifkan Premium hanya jika pembayaran berhasil
    if (statusPembayaran === 'paid') {
      const [packages] = await connection.execute(
        `SELECT durasi_hari
         FROM paket_premium
         WHERE id_paket = ?`,
        [transaksi.id_paket],
      )

      if (packages.length === 0) {
        throw new Error('Paket Premium tidak ditemukan.')
      }

      const durasiHari = Number(packages[0].durasi_hari)

      if (!Number.isInteger(durasiHari) || durasiHari <= 0) {
        throw new Error('Durasi paket Premium tidak valid.')
      }

      // Cek apakah langganan dari transaksi ini sudah pernah dibuat
      const [existingSubscriptions] = await connection.execute(
        `SELECT id_langganan
         FROM langganan_premium
         WHERE id_transaksi = ?
         LIMIT 1`,
        [transaksi.id_transaksi],
      )

      // Jika belum ada, buat langganan
      if (existingSubscriptions.length === 0) {
        // Cari langganan aktif yang masih berlaku
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

        if (subscriptions.length > 0) {
          tanggalMulai = subscriptions[0].tanggal_berakhir
        } else {
          tanggalMulai = new Date()
        }

        const mulai = new Date(tanggalMulai)
        const berakhir = new Date(mulai)

        berakhir.setDate(berakhir.getDate() + durasiHari)

        await connection.execute(
          `INSERT INTO langganan_premium
           (
             id_pengguna,
             id_transaksi,
             tanggal_mulai,
             tanggal_berakhir,
             status
           )
           VALUES (?, ?, ?, ?, 'aktif')`,
          [transaksi.id_pengguna, transaksi.id_transaksi, mulai, berakhir],
        )
      }

      // Aktifkan Premium pada akun pengguna
      await connection.execute(
        `UPDATE pengguna
         SET status_premium = 1
         WHERE id_pengguna = ?`,
        [transaksi.id_pengguna],
      )
    }

    await connection.commit()
    transactionStarted = false

    return res.status(200).json({
      success: true,
      message: 'Notifikasi pembayaran berhasil diproses.',
    })
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback()
      transactionStarted = false
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
