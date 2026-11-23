const express = require('express')
const router = express.Router()
const db = require('./database')
const { verifyToken } = require('./authMiddleware')

function convertDurationToMinutes(duration) {
  if (typeof duration === 'number') return duration

  const text = String(duration).toLowerCase().trim()

  if (/^\d+$/.test(text)) return Number(text)

  const hours = text.match(/(\d+)\s*(?:jam|j|hours?|h)\b/)
  const minutes = text.match(/(\d+)\s*(?:menit|minutes?|m)\b/)

  if (hours || minutes) {
    return Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0)
  }

  const timeFormat = text.match(/^(\d+):(\d+)$/)

  if (timeFormat) {
    return Number(timeFormat[1]) * 60 + Number(timeFormat[2])
  }

  throw new Error(`Format durasi tidak dikenali: ${duration}`)
}

// Simpan satu data penerbangan ke tabel penerbangan
async function saveFlight(connection, flight) {
  if (!flight) return null

  const departureDateTime = `${flight.departureDate} ${flight.departure}:00`
  const arrivalDateTime = `${flight.departureDate} ${flight.arrival}:00`

  const [flightResult] = await connection.execute(
    `INSERT INTO penerbangan (
      maskapai,
      kode_penerbangan,
      bandara_keberangkatan,
      bandara_kedatangan,
      waktu_keberangkatan,
      waktu_kedatangan,
      durasi,
      harga,
      kode_mata_uang,
      sumber_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      flight.airline,
      flight.code,
      flight.origin,
      flight.destination,
      departureDateTime,
      arrivalDateTime,
      convertDurationToMinutes(flight.duration),
      Number(flight.price || 0),
      'IDR',
      'Simulasi',
    ],
  )

  return flightResult.insertId
}

router.post('/', verifyToken, async (req, res) => {
  let connection
  let transactionStarted = false

  try {
    connection = await db.getConnection()

    const { tripId, contact, passengerNames, flight } = req.body
    const userId = req.user.id

    const selectedTripId =
      tripId === null || tripId === undefined || tripId === '' ? null : Number(tripId)

    if (
      (selectedTripId !== null && (!Number.isInteger(selectedTripId) || selectedTripId <= 0)) ||
      !contact ||
      !flight ||
      !Array.isArray(passengerNames)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Data pemesanan tidak lengkap.',
      })
    }

    if (passengerNames.length < 1 || passengerNames.some((name) => !String(name).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Nama seluruh penumpang wajib diisi.',
      })
    }

    // Penerbangan pulang bersifat opsional
    const returnFlight = flight.returnFlight || null

    await connection.beginTransaction()
    transactionStarted = true

    // Pastikan perjalanan milik user
    if (selectedTripId !== null) {
      const [trips] = await connection.execute(
        `SELECT id_perjalanan
         FROM perjalanan
         WHERE id_perjalanan = ? AND id_pengguna = ?`,
        [selectedTripId, userId],
      )

      if (trips.length === 0) {
        await connection.rollback()
        transactionStarted = false

        return res.status(403).json({
          success: false,
          message: 'Perjalanan tidak ditemukan atau bukan milik Anda.',
        })
      }
    }

    // Simpan penerbangan pergi
    const outboundFlightId = await saveFlight(connection, flight)

    // Simpan penerbangan pulang jika tersedia
    let returnFlightId = null

    if (returnFlight) {
      returnFlightId = await saveFlight(connection, returnFlight)
    }

    // Buat kode pemesanan
    const bookingCode = `TM${Date.now().toString().slice(-8)}`

    // Simpan pemesanan
    const [bookingResult] = await connection.execute(
      `INSERT INTO pemesanan (
        id_pengguna,
        id_perjalanan,
        id_penerbangan,
        id_penerbangan_pulang,
        kode_pemesanan,
        tanggal_pemesanan,
        status,
        total_harga
      ) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?)`,
      [
        userId,
        selectedTripId,
        outboundFlightId,
        returnFlightId,
        bookingCode,
        'Simulasi',
        Number(flight.totalPrice),
      ],
    )

    const bookingId = bookingResult.insertId

    // Simpan penumpang
    for (const passengerName of passengerNames) {
      await connection.execute(
        `INSERT INTO penumpang (
          id_pemesanan,
          nama_lengkap
        ) VALUES (?, ?)`,
        [bookingId, String(passengerName).trim()],
      )
    }

    await connection.commit()
    transactionStarted = false

    res.status(201).json({
      success: true,
      message: 'Pemesanan berhasil disimpan.',
      data: {
        id_pemesanan: bookingId,
        kode_pemesanan: bookingCode,
        id_penerbangan: outboundFlightId,
        id_penerbangan_pulang: returnFlightId,
        id_perjalanan: selectedTripId,
      },
    })
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback()
      transactionStarted = false
    }

    console.error('Booking error:', error)

    res.status(500).json({
      success: false,
      message: 'Pemesanan gagal disimpan ke database.',
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

module.exports = router
