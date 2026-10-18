<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

function login() {
  errorMessage.value = ''

  let users

  try {
    const storedUsers = JSON.parse(localStorage.getItem('tripmate-users') || '[]')

    users = Array.isArray(storedUsers) ? storedUsers : []
  } catch {
    errorMessage.value = 'Data akun tidak valid. Silakan periksa kembali.'
    return
  }

  const normalizedEmail = email.value.trim().toLowerCase()

  const user = users.find(
    (item) =>
      typeof item.email === 'string' &&
      item.email.trim().toLowerCase() === normalizedEmail &&
      item.password === password.value,
  )

  if (!user) {
    errorMessage.value = 'Email atau kata sandi salah.'
    return
  }

  // Simpan informasi pengguna yang sedang login
  localStorage.setItem(
    'tripmate-current-user',
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
    }),
  )

  // Kembali ke halaman yang dituju sebelum login
  const redirect = router.currentRoute.value.query.redirect

  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    router.push(redirect)
  } else {
    router.push('/')
  }
}
</script>

<template>
  <main class="flex min-h-[70vh] items-center justify-center bg-[#dceafa] px-5 py-12">
    <section class="w-full max-w-md rounded-3xl bg-[#f5f9ff] p-7 shadow-lg sm:p-9">
      <div class="mb-6 text-center">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-[#347bd0]">
          Selamat Datang Kembali
        </p>

        <h1 class="mt-3 text-3xl font-bold text-[#263951]">Masuk ke TripMate</h1>

        <p class="mt-2 text-sm text-slate-600">Masuk untuk melanjutkan rencana perjalananmu.</p>
      </div>

      <form class="space-y-4" @submit.prevent="login">
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
            autocomplete="current-password"
            required
            placeholder="Masukkan kata sandi"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <p v-if="errorMessage" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="w-full rounded-xl bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Masuk
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        Belum punya akun?

        <RouterLink to="/register" class="font-semibold text-[#347bd0] hover:underline">
          Daftar
        </RouterLink>
      </p>
    </section>
  </main>
</template>
