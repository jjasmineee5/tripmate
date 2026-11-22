<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function login() {
  errorMessage.value = ''

  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value.trim().toLowerCase(),
        password: password.value,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      errorMessage.value = result.message || 'Email atau kata sandi salah.'
      return
    }

    // Simpan token dan informasi akun
    localStorage.setItem('tripmate-token', result.token)
    localStorage.setItem('tripmate-current-user', JSON.stringify(result.user))

    // Arahkan berdasarkan role akun
    if (result.user?.role === 'admin') {
      await router.push('/admin/dashboard')
    } else if (result.user?.role === 'pengguna') {
      const redirect = router.currentRoute.value.query.redirect

      if (
        typeof redirect === 'string' &&
        redirect.startsWith('/') &&
        !redirect.startsWith('//') &&
        !redirect.startsWith('/admin')
      ) {
        await router.push(redirect)
      } else {
        await router.push('/')
      }
    } else {
      localStorage.removeItem('tripmate-token')
      localStorage.removeItem('tripmate-current-user')
      errorMessage.value = 'Role akun tidak dikenali.'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = 'Tidak dapat terhubung ke server. Silakan coba lagi.'
  } finally {
    isSubmitting.value = false
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
          <span class="mb-2 block text-sm font-medium text-[#263951]">Email</span>

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
          <span class="mb-2 block text-sm font-medium text-[#263951]">Kata sandi</span>

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
          :disabled="isSubmitting"
          class="w-full rounded-xl bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? 'Memproses...' : 'Masuk' }}
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
