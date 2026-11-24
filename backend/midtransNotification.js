const express = require('express')
const { coreApi } = require('./midtrans')
const db = require('./database')

const router = express.Router()

router.post('/', async (req, res) => {
  let connection

  try {
    // Verifikasi status transaksi langsung ke Midtrans
    const notification = await coreApi.transaction.notification(req.body)

    const orderId = notification.order_id
    const transactionStatus = notification.transaction_status
    const fraudStatus = notification.fraud_status

    let statusPembayaran = transactionStatus

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        statusPembayaran = 'settlement'
      } else {
        statusPembayaran = 'pending'
      }
    }

    connection = await db.getConnection()
    await connection.beginTransaction()

    // Ambil transaksi dan paket, sekaligus mengunci baris transaksi
    const [transactions] = await connection.execute(
      `SELECT
          t.id_transaksi,
          t.id_pengguna,
          t.id_paket,
          t.status_pembayaran,
          p.durasi_hari
       FROM transaksi_premium t
       JOIN paket_premium p ON t.id_paket = p.id_paket
       WHERE t.kode_transaksi = ?
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

    const transaction = transactions[0]

    // Perbarui status transaksi
    await connection.execute(
      `UPDATE transaksi_premium
       SET status_pembayaran = ?,
           metode_pembayaran = ?,
           tanggal_transaksi = NOW()
       WHERE id_transaksi = ?`,
      [statusPembayaran, notification.payment_type || null, transaction.id_transaksi],
    )

    // Aktifkan Premium hanya jika pembayaran terverifikasi
    if (statusPembayaran === 'settlement') {
      // Cegah langganan ganda untuk transaksi yang sama
      const [subscriptions] = await connection.execute(
        `SELECT id_langganan
         FROM langganan_premium
         WHERE id_transaksi = ?
         FOR UPDATE`,
        [transaction.id_transaksi],
      )

      if (subscriptions.length === 0) {
        // Jika Premium masih aktif, durasi baru ditambahkan
        // setelah tanggal berakhir langganan sebelumnya
        const [activeSubscriptions] = await connection.execute(
          `SELECT MAX(tanggal_berakhir) AS tanggal_berakhir
           FROM langganan_premium
           WHERE id_pengguna = ?
             AND status = 'aktif'
             AND tanggal_berakhir > NOW()`,
          [transaction.id_pengguna],
        )

        const existingEndDate = activeSubscriptions[0]?.tanggal_berakhir

        const startDate =
          existingEndDate && new Date(existingEndDate) > new Date()
            ? new Date(existingEndDate)
            : new Date()

        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + transaction.durasi_hari)

        await connection.execute(
          `INSERT INTO langganan_premium
           (id_pengguna, id_transaksi, tanggal_mulai, tanggal_berakhir, status)
           VALUES (?, ?, ?, ?, 'aktif')`,
          [transaction.id_pengguna, transaction.id_transaksi, startDate, endDate],
        )
      }

      // Status Premium pengguna
      await connection.execute(
        `UPDATE pengguna
         SET status_premium = 1
         WHERE id_pengguna = ?`,
        [transaction.id_pengguna],
      )
    }

    await connection.commit()

    return res.status(200).json({
      success: true,
      message: 'Notifikasi pembayaran berhasil diproses.',
    })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        console.error('Rollback gagal:', rollbackError.message)
      }
    }

    console.error('Gagal memproses notifikasi Midtrans:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal memproses notifikasi pembayaran.',
    })
  } finally {
    if (connection) connection.release()
  }
})

module.exports = router
