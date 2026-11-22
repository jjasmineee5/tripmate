const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('./database')
const { verifyToken } = require('./authMiddleware')

const router = express.Router()

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {}

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan kata sandi wajib diisi.',
      })
    }

    if (name.trim().length > 100 || email.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nama atau email terlalu panjang.',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Kata sandi minimal 8 karakter.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const [existingUsers] = await db.execute(
      'SELECT id_pengguna FROM pengguna WHERE email = ? LIMIT 1',
      [normalizedEmail],
    )

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email ini sudah terdaftar.',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await db.execute(
      `INSERT INTO pengguna
       (nama, email, kata_sandi, peran, status_premium)
       VALUES (?, ?, ?, 'pengguna', FALSE)`,
      [name.trim(), normalizedEmail, hashedPassword],
    )

    return res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil! Silakan masuk.',
    })
  } catch (error) {
    console.error('Register error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mendaftar.',
    })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan kata sandi wajib diisi.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const [users] = await db.execute(
      `SELECT id_pengguna, nama, email, kata_sandi, peran, status_premium
       FROM pengguna
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail],
    )

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email atau kata sandi salah.',
      })
    }

    const user = users[0]
    const passwordValid = await bcrypt.compare(password, user.kata_sandi)

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email atau kata sandi salah.',
      })
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET belum dikonfigurasi.')
    }

    const token = jwt.sign(
      {
        id: user.id_pengguna,
        role: user.peran,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      },
    )

    return res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id_pengguna,
        name: user.nama,
        email: user.email,
        role: user.peran,
        isPremium: Boolean(user.status_premium),
      },
    })
  } catch (error) {
    console.error('Login error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat login.',
    })
  }
})

// UPDATE PROFIL
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body || {}

    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan email wajib diisi.',
      })
    }

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (normalizedName.length > 100 || normalizedEmail.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nama atau email terlalu panjang.',
      })
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid.',
      })
    }

    const userId = req.user.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Identitas pengguna tidak ditemukan.',
      })
    }

    // Periksa apakah email sudah digunakan akun lain
    const [existingUsers] = await db.execute(
      `SELECT id_pengguna
       FROM pengguna
       WHERE email = ? AND id_pengguna != ?
       LIMIT 1`,
      [normalizedEmail, userId],
    )

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah digunakan oleh akun lain.',
      })
    }

    // Perbarui profil berdasarkan ID dari token
    const [updateResult] = await db.execute(
      `UPDATE pengguna
       SET nama = ?, email = ?
       WHERE id_pengguna = ?`,
      [normalizedName, normalizedEmail, userId],
    )

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data pengguna tidak ditemukan.',
      })
    }

    // Ambil data terbaru dari database
    const [updatedUsers] = await db.execute(
      `SELECT id_pengguna, nama, email, peran, status_premium
       FROM pengguna
       WHERE id_pengguna = ?
       LIMIT 1`,
      [userId],
    )

    const updatedUser = updatedUsers[0]

    return res.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: {
        id: updatedUser.id_pengguna,
        name: updatedUser.nama,
        email: updatedUser.email,
        role: updatedUser.peran,
        isPremium: Boolean(updatedUser.status_premium),
      },
    })
  } catch (error) {
    console.error('Update profile error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui profil.',
    })
  }
})

module.exports = router
