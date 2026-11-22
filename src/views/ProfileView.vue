<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'

const API_URL = 'http://localhost:3000/api'

const name = ref('')
const email = ref('')
const message = ref('')
const messageType = ref('success')
const currentUser = ref(null)
const trips = ref([])
const loadingProfile = ref(true)
const loadingTrips = ref(false)
const saving = ref(false)

const tripHistory = computed(() => {
  return [...trips.value].sort((a, b) => {
    return new Date(b.tanggal_dibuat || 0) - new Date(a.tanggal_dibuat || 0)
  })
})

function getToken() {
  return localStorage.getItem('tripmate-token')
}

function showMessage(text, type = 'success') {
  message.value = text
  messageType.value = type
}

// Mengambil data perjalanan dari MySQL
async function loadTrips() {
  if (!getToken()) return

  loadingTrips.value = true

  try {
    const response = await fetch(`${API_URL}/perjalanan`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })

    const result = await response.json()

    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'Gagal mengambil riwayat perjalanan.')
    }

    trips.value = Array.isArray(result.data) ? result.data : []
  } catch (error) {
    showMessage(`Riwayat perjalanan gagal dimuat: ${error.message}`, 'error')
  } finally {
    loadingTrips.value = false
  }
}

// Mengambil data profil terbaru dari server
async function loadProfile() {
  loadingProfile.value = true

  try {
    const savedUser = localStorage.getItem('tripmate-current-user')

    if (!savedUser || !getToken()) {
      throw new Error('Silakan login kembali untuk membuka profil.')
    }

    const user = JSON.parse(savedUser)

    if (!user.id) {
      throw new Error('Identitas akun tidak ditemukan.')
    }

    currentUser.value = user
    name.value = user.name || ''
    email.value = user.email || ''
  } catch (error) {
    showMessage(error.message, 'error')
  } finally {
    loadingProfile.value = false
  }
}

// Memperbarui profil di MySQL
async function saveProfile() {
  showMessage('')

  const normalizedName = name.value.trim()
  const normalizedEmail = email.value.trim().toLowerCase()

  if (!normalizedName || !normalizedEmail) {
    showMessage('Nama dan email wajib diisi.', 'error')
    return
  }

  if (normalizedName.length > 100 || normalizedEmail.length > 100) {
    showMessage('Nama atau email terlalu panjang.', 'error')
    return
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(normalizedEmail)) {
    showMessage('Format email tidak valid.', 'error')
    return
  }

  if (!getToken()) {
    showMessage('Sesi login tidak ditemukan. Silakan login kembali.', 'error')
    return
  }

  saving.value = true

  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        name: normalizedName,
        email: normalizedEmail,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'Profil gagal diperbarui.')
    }

    if (!result.user) {
      throw new Error('Server tidak mengembalikan data profil terbaru.')
    }

    // Simpan data terbaru untuk navbar dan halaman lainnya
    currentUser.value = result.user

    localStorage.setItem('tripmate-current-user', JSON.stringify(result.user))

    name.value = result.user.name
    email.value = result.user.email

    showMessage('Profil berhasil diperbarui dan disimpan ke database.', 'success')
  } catch (error) {
    showMessage(error.message, 'error')
  } finally {
    saving.value = false
  }
}

function formatDate(date) {
  if (!date) return '-'

  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

onMounted(async () => {
  await loadProfile()

  if (currentUser.value && currentUser.value.role !== 'admin') {
    await loadTrips()
  }
})
</script>

<template>
  <section class="min-h-[70vh] bg-[#dceafa] px-5 py-12">
    <div class="mx-auto max-w-2xl space-y-8">
      <!-- PROFIL -->
      <div class="rounded-2xl bg-white p-8 shadow-lg sm:p-10">
        <div class="mb-8">
          <p class="text-sm font-semibold uppercase tracking-wider text-[#347bd0]">Akun TripMate</p>

          <h1 class="mt-2 text-3xl font-bold text-[#263951]">Profil Saya</h1>

          <p class="mt-2 text-sm text-slate-500">
            Lihat dan perbarui informasi akun TripMate kamu.
          </p>
        </div>

        <div v-if="loadingProfile" class="py-8 text-center text-sm text-slate-500">
          Memuat informasi akun...
        </div>

        <form v-else class="space-y-6" @submit.prevent="saveProfile">
          <!-- Nama -->
          <div>
            <label for="profile-name" class="mb-2 block text-sm font-semibold text-[#263951]">
              Nama Lengkap
            </label>

            <input
              id="profile-name"
              v-model="name"
              type="text"
              autocomplete="name"
              maxlength="100"
              required
              placeholder="Masukkan nama lengkap"
              class="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="profile-email" class="mb-2 block text-sm font-semibold text-[#263951]">
              Email
            </label>

            <input
              id="profile-email"
              v-model="email"
              type="email"
              autocomplete="email"
              maxlength="100"
              required
              placeholder="Masukkan email"
              class="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <!-- Status Akun: hanya untuk pengguna -->
          <div v-if="currentUser?.role !== 'admin'" class="rounded-lg bg-blue-50 p-4">
            <p class="text-sm font-semibold text-[#263951]">Status Akun</p>

            <span
              class="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              :class="
                currentUser?.isPremium
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-200 text-slate-700'
              "
            >
              {{ currentUser?.isPremium ? 'Premium' : 'Free' }}
            </span>
          </div>

          <!-- Pesan -->
          <p
            v-if="message"
            class="rounded-lg p-3 text-sm"
            :class="
              messageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            "
            role="status"
          >
            {{ message }}
          </p>

          <!-- Simpan -->
          <button
            type="submit"
            :disabled="saving"
            class="w-full rounded-lg bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
          <RouterLink
            :to="currentUser?.role === 'admin' ? '/admin/dashboard' : '/'"
            class="block w-full rounded-lg border border-[#347bd0] px-5 py-3 text-center font-semibold text-[#347bd0] transition hover:bg-blue-50"
          >
            Kembali ke Beranda
          </RouterLink>
        </form>
      </div>

      <!-- RIWAYAT PERJALANAN: hanya untuk pengguna -->
      <div v-if="currentUser?.role !== 'admin'" class="rounded-2xl bg-white p-8 shadow-lg sm:p-10">
        <div class="mb-6">
          <p class="text-sm font-semibold uppercase tracking-wider text-[#347bd0]">
            Aktivitas Saya
          </p>

          <h2 class="mt-2 text-2xl font-bold text-[#263951]">Riwayat Perjalanan</h2>

          <p class="mt-2 text-sm text-slate-500">
            Daftar perjalanan yang pernah kamu buat di TripMate.
          </p>
        </div>

        <!-- Loading -->
        <div
          v-if="loadingTrips"
          class="rounded-xl bg-blue-50 px-5 py-8 text-center text-sm text-slate-600"
        >
          Memuat riwayat perjalanan...
        </div>

        <!-- Kosong -->
        <div
          v-else-if="tripHistory.length === 0"
          class="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center"
        >
          <p class="font-semibold text-slate-600">Belum ada riwayat perjalanan.</p>

          <p class="mt-2 text-sm text-slate-500">Yuk, mulai rencanakan perjalanan pertamamu!</p>

          <RouterLink
            to="/trips"
            class="mt-5 inline-block rounded-lg bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Buat Perjalanan
          </RouterLink>
        </div>

        <!-- Daftar Riwayat -->
        <div v-else class="space-y-4">
          <article
            v-for="trip in tripHistory"
            :key="trip.id_perjalanan"
            class="rounded-xl border border-slate-200 p-5 transition hover:border-[#347bd0]"
          >
            <h3 class="text-lg font-bold text-[#263951]">
              {{ trip.judul }}
            </h3>

            <p class="mt-1 text-sm font-medium text-[#347bd0]">
              {{ trip.nama_destinasi || trip.destinasi || 'Destinasi' }}
            </p>

            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <span>
                <span class="font-semibold">Mulai:</span>
                {{ formatDate(trip.tanggal_mulai) }}
              </span>

              <span>
                <span class="font-semibold">Selesai:</span>
                {{ formatDate(trip.tanggal_selesai) }}
              </span>
            </div>

            <p
              v-if="trip.catatan"
              class="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600"
            >
              {{ trip.catatan }}
            </p>
          </article>

          <RouterLink
            to="/trips"
            class="inline-block text-sm font-semibold text-[#347bd0] hover:underline"
          >
            Kelola semua perjalanan →
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
