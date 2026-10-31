<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'

const name = ref('')
const email = ref('')
const message = ref('')
const messageType = ref('success')
const currentUser = ref(null)
const trips = ref([])

const tripHistory = computed(() => {
  if (!currentUser.value?.id) return []

  return trips.value
    .filter((trip) => String(trip.userId) === String(currentUser.value.id))
    .sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
})

onMounted(() => {
  try {
    const savedUser = localStorage.getItem('tripmate-current-user')

    if (!savedUser) {
      message.value = 'Data akun tidak ditemukan. Silakan login kembali.'
      messageType.value = 'error'
      return
    }

    const user = JSON.parse(savedUser)
    currentUser.value = user

    name.value = user.name || ''
    email.value = user.email || ''

    const savedTrips = JSON.parse(localStorage.getItem('tripmate-trips') || '[]')
    trips.value = Array.isArray(savedTrips) ? savedTrips : []
  } catch {
    message.value = 'Data akun atau perjalanan gagal dimuat.'
    messageType.value = 'error'
  }
})

function saveProfile() {
  message.value = ''

  const normalizedName = name.value.trim()
  const normalizedEmail = email.value.trim().toLowerCase()

  if (!normalizedName || !normalizedEmail) {
    message.value = 'Nama dan email wajib diisi.'
    messageType.value = 'error'
    return
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(normalizedEmail)) {
    message.value = 'Format email tidak valid.'
    messageType.value = 'error'
    return
  }

  try {
    const savedCurrentUser = localStorage.getItem('tripmate-current-user')
    const savedUsers = JSON.parse(localStorage.getItem('tripmate-users') || '[]')

    if (!savedCurrentUser || !Array.isArray(savedUsers)) {
      throw new Error('Data akun tidak valid.')
    }

    const currentUserData = JSON.parse(savedCurrentUser)

    if (!currentUserData.id) {
      throw new Error('Identitas akun tidak ditemukan.')
    }

    const userIndex = savedUsers.findIndex((user) => user.id === currentUserData.id)

    if (userIndex === -1) {
      throw new Error('Akun pengguna tidak ditemukan.')
    }

    const emailExists = savedUsers.some(
      (user) =>
        user.id !== currentUserData.id &&
        typeof user.email === 'string' &&
        user.email.trim().toLowerCase() === normalizedEmail,
    )

    if (emailExists) {
      message.value = 'Email sudah digunakan oleh akun lain.'
      messageType.value = 'error'
      return
    }

    const updatedUser = {
      ...savedUsers[userIndex],
      name: normalizedName,
      email: normalizedEmail,
    }

    savedUsers[userIndex] = updatedUser

    const updatedCurrentUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
    }

    localStorage.setItem('tripmate-users', JSON.stringify(savedUsers))
    localStorage.setItem('tripmate-current-user', JSON.stringify(updatedCurrentUser))

    currentUser.value = updatedCurrentUser
    name.value = updatedUser.name
    email.value = updatedUser.email

    message.value = 'Profil berhasil diperbarui.'
    messageType.value = 'success'
  } catch {
    message.value = 'Profil gagal diperbarui. Silakan coba lagi.'
    messageType.value = 'error'
  }
}

function formatDate(date) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
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

        <form class="space-y-6" @submit.prevent="saveProfile">
          <div>
            <label for="profile-name" class="mb-2 block text-sm font-semibold text-[#263951]">
              Nama Lengkap
            </label>

            <input
              id="profile-name"
              v-model="name"
              type="text"
              autocomplete="name"
              required
              placeholder="Masukkan nama lengkap"
              class="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label for="profile-email" class="mb-2 block text-sm font-semibold text-[#263951]">
              Email
            </label>

            <input
              id="profile-email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="Masukkan email"
              class="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
            />
          </div>

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

          <button
            type="submit"
            class="w-full rounded-lg bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Simpan Perubahan
          </button>
        </form>
      </div>

      <!-- RIWAYAT PERJALANAN -->
      <div class="rounded-2xl bg-white p-8 shadow-lg sm:p-10">
        <div class="mb-6">
          <p class="text-sm font-semibold uppercase tracking-wider text-[#347bd0]">
            Aktivitas Saya
          </p>

          <h2 class="mt-2 text-2xl font-bold text-[#263951]">Riwayat Perjalanan</h2>

          <p class="mt-2 text-sm text-slate-500">
            Daftar perjalanan yang pernah kamu buat di TripMate.
          </p>
        </div>

        <div
          v-if="tripHistory.length === 0"
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

        <div v-else class="space-y-4">
          <div
            v-for="trip in tripHistory"
            :key="trip.id"
            class="rounded-xl border border-slate-200 p-5 transition hover:border-[#347bd0]"
          >
            <h3 class="text-lg font-bold text-[#263951]">
              {{ trip.name }}
            </h3>

            <p class="mt-1 text-sm font-medium text-[#347bd0]">
              {{ trip.destination }}
            </p>

            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <span>
                <span class="font-semibold">Mulai:</span>
                {{ formatDate(trip.startDate) }}
              </span>

              <span>
                <span class="font-semibold">Selesai:</span>
                {{ formatDate(trip.endDate) }}
              </span>
            </div>

            <p v-if="trip.notes" class="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
              {{ trip.notes }}
            </p>
          </div>

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
