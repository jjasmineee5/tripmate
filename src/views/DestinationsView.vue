<script setup>
import { computed, onMounted, ref } from 'vue'

const searchQuery = ref('')
const selectedDestination = ref(null)
const destinations = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// Membuka detail destinasi
function openDetail(destination) {
  selectedDestination.value = destination
}

// Menutup detail destinasi
function closeDetail() {
  selectedDestination.value = null
}

// Filter pencarian destinasi
const filteredDestinations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return destinations.value.filter((destination) => {
    return (
      !query ||
      destination.name.toLowerCase().includes(query) ||
      destination.city.toLowerCase().includes(query) ||
      destination.country.toLowerCase().includes(query)
    )
  })
})

// Mengambil rekomendasi destinasi dari database
async function fetchDestinations() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = localStorage.getItem('tripmate-token')

    if (!token) {
      throw new Error('Silakan login terlebih dahulu.')
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
      rating: item.rating || null,
      detail: item.detail || '',
    }))
  } catch (error) {
    console.error('Gagal mengambil destinasi:', error)
    errorMessage.value = error.message || 'Tidak dapat terhubung ke server.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchDestinations()
})
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-7xl">
      <!-- Header -->
      <div class="mb-8 text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          Temukan tempat baru
        </p>

        <h1 class="mt-2 text-3xl font-bold text-[#263951] sm:text-4xl">Jelajahi Destinasi</h1>

        <p class="mx-auto mt-3 max-w-2xl text-[#52657d]">
          Temukan inspirasi dari berbagai tempat menarik di Indonesia dan seluruh dunia.
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
          placeholder="Cari nama kota atau negara..."
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
        />
      </section>

      <!-- Judul rekomendasi -->
      <div class="mb-5 flex items-center justify-between gap-3">
        <h2 class="text-xl font-bold text-[#263951]">Rekomendasi Destinasi</h2>

        <p class="text-sm text-[#52657d]">{{ filteredDestinations.length }} destinasi</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="rounded-2xl bg-[#f5f9ff] p-10 text-center text-[#52657d]">
        Memuat rekomendasi destinasi...
      </div>

      <!-- Error -->
      <div v-else-if="errorMessage" class="rounded-2xl bg-[#f5f9ff] p-10 text-center">
        <p class="font-semibold text-red-600">
          {{ errorMessage }}
        </p>

        <button
          type="button"
          class="mt-4 rounded-xl bg-[#347bd0] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          @click="fetchDestinations"
        >
          Coba Lagi
        </button>
      </div>

      <!-- Kartu Destinasi -->
      <div
        v-else-if="filteredDestinations.length > 0"
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <article
          v-for="destination in filteredDestinations"
          :key="destination.id"
          class="group cursor-pointer overflow-hidden rounded-2xl bg-[#f5f9ff] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          @click="openDetail(destination)"
        >
          <!-- Foto -->
          <div class="relative overflow-hidden">
            <img
              v-if="destination.image"
              :src="destination.image"
              :alt="destination.name"
              loading="lazy"
              class="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
            />

            <div v-else class="flex h-56 items-center justify-center bg-blue-100 text-[#52657d]">
              Foto belum tersedia
            </div>

            <!-- Rating -->
            <div
              v-if="destination.rating !== null"
              class="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-[#263951] shadow-sm"
            >
              ⭐ {{ destination.rating }}
            </div>
          </div>

          <!-- Informasi Ringkas -->
          <div class="p-5">
            <h3 class="text-xl font-bold text-[#263951]">
              {{ destination.name }}
            </h3>

            <p class="mt-1 text-sm text-slate-500">
              {{ destination.location || 'Lokasi belum tersedia' }}
            </p>

            <p class="mt-3 line-clamp-3 text-sm leading-relaxed text-[#52657d]">
              {{ destination.description }}
            </p>

            <button
              type="button"
              class="mt-5 w-full rounded-xl bg-[#347bd0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              @click.stop="openDetail(destination)"
            >
              Lihat Detail
            </button>
          </div>
        </article>
      </div>

      <!-- Destinasi Tidak Ditemukan -->
      <div v-else class="rounded-2xl bg-[#f5f9ff] p-10 text-center">
        <h3 class="text-lg font-bold text-[#263951]">Destinasi tidak ditemukan</h3>

        <p class="mt-2 text-sm text-slate-500">Coba gunakan nama kota atau negara lainnya.</p>
      </div>
    </section>

    <!-- Modal Detail Destinasi -->
    <div
      v-if="selectedDestination"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      @click.self="closeDetail"
    >
      <div
        class="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#f5f9ff] shadow-2xl"
      >
        <!-- Foto Detail -->
        <div class="relative">
          <img
            v-if="selectedDestination.image"
            :src="selectedDestination.image"
            :alt="selectedDestination.name"
            class="h-64 w-full object-cover sm:h-80"
          />

          <div
            v-else
            class="flex h-64 items-center justify-center bg-blue-100 text-[#52657d] sm:h-80"
          >
            Foto belum tersedia
          </div>

          <!-- Tombol Close -->
          <button
            type="button"
            class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-bold text-[#263951] shadow-md transition hover:bg-slate-100"
            aria-label="Tutup detail"
            @click="closeDetail"
          >
            ×
          </button>
        </div>

        <!-- Isi Detail -->
        <div class="p-6 sm:p-8">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-2xl font-bold text-[#263951] sm:text-3xl">
                {{ selectedDestination.name }}
              </h2>

              <p class="mt-2 text-[#52657d]">
                {{ selectedDestination.location }}
              </p>
            </div>

            <!-- Rating -->
            <div
              v-if="selectedDestination.rating !== null"
              class="rounded-full bg-blue-100 px-4 py-2 font-semibold text-[#263951]"
            >
              ⭐ {{ selectedDestination.rating }}
            </div>
          </div>

          <!-- Deskripsi Destinasi -->
          <div class="mt-6">
            <h3 class="font-bold text-[#263951]">Tentang Destinasi</h3>

            <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#52657d]">
              {{
                selectedDestination.detail ||
                selectedDestination.description ||
                'Informasi destinasi belum tersedia.'
              }}
            </p>
          </div>

          <!-- Tips -->
          <div v-if="selectedDestination.tips" class="mt-6 rounded-xl bg-blue-50 p-4">
            <h3 class="font-bold text-[#263951]">Tips Berkunjung</h3>

            <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#52657d]">
              {{ selectedDestination.tips }}
            </p>
          </div>

          <!-- Tutup -->
          <button
            type="button"
            class="mt-8 w-full rounded-xl bg-[#347bd0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            @click="closeDetail"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
