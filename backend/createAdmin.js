const db = require('./database')
const bcrypt = require('bcryptjs')
const readline = require('readline/promises')

async function createAdmin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    console.log('\n=== BUAT AKUN ADMIN TRIPMATE ===\n')

    const nama = await rl.question('Nama admin: ')
    const email = await rl.question('Email admin: ')
    const password = await rl.question('Password admin: ')

    if (!nama.trim() || !email.trim() || !password) {
      throw new Error('Semua data wajib diisi.')
    }

    if (password.length < 8) {
      throw new Error('Password minimal 8 karakter.')
    }

    const [existing] = await db.query('SELECT id_pengguna FROM pengguna WHERE email = ?', [
      email.trim(),
    ])

    if (existing.length > 0) {
      throw new Error('Email sudah terdaftar. Gunakan email lain.')
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await db.query(
      `INSERT INTO pengguna
      (nama, email, kata_sandi, peran, status_premium)
      VALUES (?, ?, ?, 'admin', FALSE)`,
      [nama.trim(), email.trim(), hashedPassword],
    )

    console.log('\nAkun admin berhasil dibuat!')
  } catch (error) {
    console.error('\nGagal membuat admin:', error.message)
  } finally {
    rl.close()
    await db.end()
  }
}

createAdmin()
