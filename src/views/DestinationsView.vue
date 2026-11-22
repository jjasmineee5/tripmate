<script setup>
import { computed, onMounted, ref } from 'vue'

const searchQuery = ref('')
const destinations = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const filteredDestinations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return destinations.value.filter((destination) => {
    return (
      !query ||
      destination.name.toLowerCase().includes(query) ||
      destination.location.toLowerCase().includes(query) ||
      destination.country.toLowerCase().includes(query)
    )
  })
})

// Mengambil data destinasi dari database melalui API
async function fetchDestinations() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = localStorage.getItem('tripmate-token')

    if (!token) {
      errorMessage.value = 'Silakan login terlebih dahulu untuk melihat destinasi.'
      return
    }

    const response = await fetch('http://localhost:3000/api/destinasi', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengambil data destinasi.')
    }

    destinations.value = (result.data || []).map((item) => ({
      id: item.id_destinasi,
      name: item.nama,
      city: item.kota || '',
      country: item.negara || '',
      location: [item.kota, item.negara].filter(Boolean).join(', '),
      description: item.deskripsi || 'Belum ada deskripsi destinasi.',
      image: item.tautan_gambar || '',
    }))
  } catch (error) {
    console.error('Gagal mengambil destinasi:', error)
    errorMessage.value = error.message || 'Tidak dapat terhubung ke server.'
  } finally {
    isLoading.value = false
  }
}

// Memilih destinasi untuk membuat perjalanan
function planTrip(destination) {
  localStorage.setItem(
    'tripmate-selected-destination',
    JSON.stringify({
      id_destinasi: destination.id,
      name: destination.name,
      location: destination.location,
    }),
  )

  window.location.href = '/trips'
}

onMounted(() => {
  fetchDestinations()
})
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-7xl">
      <div class="mb-8 text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          Temukan tempat baru
        </p>

        <h1 class="mt-2 text-3xl font-bold text-[#263951] sm:text-4xl">Jelajahi Destinasi</h1>

        <p class="mx-auto mt-3 max-w-2xl text-[#52657d]">
          Temukan inspirasi liburan dan pilih destinasi yang ingin kamu kunjungi bersama TripMate.
        </p>
      </div>

      <!-- Pencarian -->
      <section class="mb-8 rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:p-6">
        <label class="mb-2 block text-sm font-semibold text-[#263951]" for="destination-search">
          Cari destinasi
        </label>

        <input
          id="destination-search"
          v-model="searchQuery"
          type="search"
          placeholder="Cari nama kota atau lokasi..."
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
        />
      </section>

      <!-- Judul dan jumlah destinasi -->
      <div class="mb-5 flex items-center justify-between gap-3">
        <h2 class="text-xl font-bold text-[#263951]">Inspirasi perjalanan</h2>

        <p class="text-sm text-[#52657d]">{{ filteredDestinations.length }} destinasi</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="rounded-2xl bg-[#f5f9ff] p-10 text-center text-[#52657d]">
        Memuat data destinasi...
      </div>

      <!-- Error -->
      <div v-else-if="errorMessage" class="rounded-2xl bg-[#f5f9ff] p-10 text-center">
        <p class="font-semibold text-red-600">{{ errorMessage }}</p>

        <button
          type="button"
          class="mt-4 rounded-xl bg-[#347bd0] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          @click="fetchDestinations"
        >
          Coba Lagi
        </button>
      </div>

      <!-- Kartu destinasi dari database -->
      <div
        v-else-if="filteredDestinations.length > 0"
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <article
          v-for="destination in filteredDestinations"
          :key="destination.id"
          class="overflow-hidden rounded-2xl bg-[#f5f9ff] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <img
            v-if="destination.image"
            :src="destination.image"
            :alt="destination.name"
            loading="lazy"
            class="h-52 w-full object-cover"
          />

          <div
            v-else
            class="flex h-52 w-full items-center justify-center bg-blue-100 text-[#347bd0]"
          >
            Belum ada foto destinasi
          </div>

          <div class="p-5">
            <h3 class="text-xl font-bold text-[#263951]">
              {{ destination.name }}
            </h3>

            <p class="mt-1 text-sm text-slate-500">
              {{ destination.location || 'Lokasi belum tersedia' }}
            </p>

            <p class="mt-4 min-h-12 text-sm leading-relaxed text-[#52657d]">
              {{ destination.description }}
            </p>

            <button
              type="button"
              class="mt-5 w-full rounded-xl bg-[#347bd0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              @click="planTrip(destination)"
            >
              Pilih Destinasi
            </button>
          </div>
        </article>
      </div>

      <!-- Jika tidak ada destinasi -->
      <div v-else class="rounded-2xl bg-[#f5f9ff] p-10 text-center">
        <h3 class="text-lg font-bold text-[#263951]">Destinasi belum tersedia</h3>

        <p class="mt-2 text-sm text-slate-500">
          Belum ada destinasi yang ditambahkan oleh administrator.
        </p>
      </div>
    </section>
  </main>
</template>
