<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)

function register() {
  errorMessage.value = ''
  successMessage.value = ''

  if (isSubmitting.value) return

  if (!name.value.trim() || !email.value.trim() || !password.value) {
    errorMessage.value = 'Semua kolom wajib diisi.'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value = 'Kata sandi minimal 8 karakter.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi kata sandi tidak cocok.'
    return
  }

  const normalizedEmail = email.value.trim().toLowerCase()

  let users

  try {
    const storedUsers = JSON.parse(localStorage.getItem('tripmate-users') || '[]')

    if (!Array.isArray(storedUsers)) {
      errorMessage.value = 'Data akun tidak valid. Silakan periksa kembali.'
      return
    }

    users = storedUsers
  } catch {
    errorMessage.value = 'Data akun tidak dapat dibaca. Silakan coba lagi.'
    return
  }

  const emailExists = users.some(
    (user) => typeof user.email === 'string' && user.email.trim().toLowerCase() === normalizedEmail,
  )

  if (emailExists) {
    errorMessage.value = 'Email ini sudah terdaftar.'
    return
  }

  const newUser = {
    id: Date.now(),
    name: name.value.trim(),
    email: normalizedEmail,
    password: password.value,
  }

  try {
    users.push(newUser)

    localStorage.setItem('tripmate-users', JSON.stringify(users))

    // Pastikan akun berhasil disimpan
    const savedUsers = JSON.parse(localStorage.getItem('tripmate-users') || '[]')

    const savedSuccessfully = savedUsers.some(
      (user) => user.id === newUser.id && user.email === normalizedEmail,
    )

    if (!savedSuccessfully) {
      errorMessage.value = 'Pendaftaran gagal disimpan. Silakan coba lagi.'
      return
    }
  } catch {
    errorMessage.value = 'Pendaftaran gagal disimpan. Silakan coba lagi.'
    return
  }

  successMessage.value = 'Pendaftaran berhasil! Silakan masuk.'
  isSubmitting.value = true

  // Registrasi tidak otomatis login
  router.replace({ name: 'login' }).catch(() => {
    isSubmitting.value = false
    errorMessage.value = 'Gagal membuka halaman Login. Silakan klik Masuk.'
  })
}
</script>

<template>
  <main class="flex min-h-[70vh] items-center justify-center bg-[#dceafa] px-5 py-12">
    <section class="w-full max-w-md rounded-3xl bg-[#f5f9ff] p-7 shadow-lg sm:p-9">
      <div class="mb-6 text-center">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-[#347bd0]">
          Mulai Bersama TripMate
        </p>

        <h1 class="mt-3 text-3xl font-bold text-[#263951]">Buat Akun</h1>

        <p class="mt-2 text-sm text-slate-600">Daftar untuk mulai merencanakan perjalananmu.</p>
      </div>

      <form class="space-y-4" @submit.prevent="register">
        <label class="block">
          <span class="mb-2 block text-sm font-medium text-[#263951]"> Nama lengkap </span>

          <input
            v-model="name"
            type="text"
            autocomplete="name"
            required
            placeholder="Masukkan nama lengkap"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label class="block">
          <span class="mb-2 block text-sm font-medium text-[#263951]"> Email </span>

          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="nama@email.com"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label class="block">
          <span class="mb-2 block text-sm font-medium text-[#263951]"> Kata sandi </span>

          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            placeholder="Minimal 8 karakter"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label class="block">
          <span class="mb-2 block text-sm font-medium text-[#263951]"> Konfirmasi kata sandi </span>

          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            placeholder="Ulangi kata sandi"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <p v-if="errorMessage" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {{ errorMessage }}
        </p>

        <p
          v-if="successMessage"
          class="rounded-lg bg-green-50 p-3 text-sm text-green-700"
          role="status"
        >
          {{ successMessage }}
        </p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-xl bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? 'Pendaftaran Berhasil' : 'Daftar Sekarang' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        Sudah punya akun?

        <RouterLink to="/login" class="font-semibold text-[#347bd0] hover:underline">
          Masuk
        </RouterLink>
      </p>
    </section>
  </main>
</template>
