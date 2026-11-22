const jwt = require('jsonwebtoken')

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak ditemukan. Silakan login.',
      })
    }

    const token = authHeader.split(' ')[1]

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET belum dikonfigurasi.')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded

    next()
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau sudah kedaluwarsa. Silakan login kembali.',
    })
  }
}

module.exports = { verifyToken }
