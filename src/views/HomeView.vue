<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import heroImage from '../assets/images/hero beranda.png'

const router = useRouter()

const API_URL = 'http://localhost:3000/api'

const origin = ref('')
const destination = ref('')
const departureDate = ref('')
const passengers = ref(null)

// Data pengguna dan riwayat perjalanan
const currentUser = ref(null)
const trips = ref([])
const loadingTrips = ref(false)
const tripError = ref('')
// Data riwayat pemesanan
const bookings = ref([])
const loadingBookings = ref(false)
const bookingError = ref('')

function getToken() {
  return localStorage.getItem('tripmate-token')
}

// Mengambil perjalanan dari database
async function loadTrips() {
  if (!currentUser.value?.id || !getToken()) {
    trips.value = []
    return
  }

  loadingTrips.value = true
  tripError.value = ''

  try {
    const response = await fetch(`${API_URL}/perjalanan`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })

    const result = await response.json()

    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'Gagal mengambil data perjalanan.')
    }

    trips.value = Array.isArray(result.data) ? result.data : []
  } catch (error) {
    tripError.value = error.message
    trips.value = []
  } finally {
    loadingTrips.value = false
  }
}

// Perjalanan milik pengguna yang sedang login
const myTrips = computed(() => {
  return [...trips.value].sort((a, b) => {
    return new Date(b.tanggal_dibuat || 0) - new Date(a.tanggal_dibuat || 0)
  })
})

// Maksimal tiga perjalanan terbaru
const latestTrips = computed(() => myTrips.value.slice(0, 3))

function formatDate(date) {
  if (!date) return '-'

  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Autocomplete bandara menggunakan API TripMate
const originSuggestions = ref([])
const destinationSuggestions = ref([])
const searchingOrigin = ref(false)
const searchingDestination = ref(false)

let originSearchTimer = null
let destinationSearchTimer = null

const today = (() => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().split('T')[0]
})()

function searchLocation(type) {
  const isOrigin = type === 'origin'
  const query = (isOrigin ? origin.value : destination.value).trim()
  clearTimeout(isOrigin ? originSearchTimer : destinationSearchTimer)

  if (isOrigin) {
    originSuggestions.value = []
    searchingOrigin.value = query.length >= 2
  } else {
    destinationSuggestions.value = []
    searchingDestination.value = query.length >= 2
  }

  if (query.length < 2) {
    if (isOrigin) searchingOrigin.value = false
    else searchingDestination.value = false
    return
  }

  const timer = setTimeout(async () => {
    try {
      const response = await fetch(`${API_URL}/airports/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Gagal mencari bandara.')
      const result = await response.json()
      const currentQuery = (isOrigin ? origin.value : destination.value).trim()
      if (currentQuery !== query) return
      const suggestions = Array.isArray(result.data) ? result.data : []
      if (isOrigin) originSuggestions.value = suggestions
      else destinationSuggestions.value = suggestions
    } catch (error) {
      console.error('Gagal mencari bandara:', error)
      if (isOrigin) originSuggestions.value = []
      else destinationSuggestions.value = []
    } finally {
      if ((isOrigin ? origin.value : destination.value).trim() === query) {
        if (isOrigin) searchingOrigin.value = false
        else searchingDestination.value = false
      }
    }
  }, 250)

  if (isOrigin) originSearchTimer = timer
  else destinationSearchTimer = timer
}

function airportLabel(airport) {
  if (airport.type === 'location') {
    return airport.label || `${airport.city}, ${airport.country}`
  }

  return [airport.city || airport.name, airport.iata ? `(${airport.iata})` : '', airport.country]
    .filter(Boolean)
    .join(', ')
}

function selectOrigin(airport) {
  origin.value = airportLabel(airport)
  originSuggestions.value = []
  searchingOrigin.value = false
  clearTimeout(originSearchTimer)
}

function selectDestination(airport) {
  destination.value = airportLabel(airport)
  destinationSuggestions.value = []
  searchingDestination.value = false
  clearTimeout(destinationSearchTimer)
}

function searchFlights() {
  const cleanOrigin = origin.value.trim()
  const cleanDestination = destination.value.trim()

  if (!cleanOrigin || !cleanDestination || !departureDate.value) {
    alert('Lengkapi kota asal, kota tujuan, dan tanggal keberangkatan.')
    return
  }

  if (cleanOrigin.toLowerCase() === cleanDestination.toLowerCase()) {
    alert('Kota asal dan tujuan harus berbeda.')
    return
  }

  if (departureDate.value < today) {
    alert('Tanggal keberangkatan tidak boleh di masa lalu.')
    return
  }

  if (!Number.isInteger(passengers.value) || passengers.value < 1) {
    alert('Jumlah penumpang minimal 1 orang.')
    return
  }

  originSuggestions.value = []
  destinationSuggestions.value = []

  router.push({
    path: '/flights',
    query: {
      origin: cleanOrigin,
      destination: cleanDestination,
      departureDate: departureDate.value,
      passengers: String(passengers.value),
    },
  })
}

const features = [
  {
    icon: '✈',
    title: 'Tiket Penerbangan Terpercaya',
    description: 'Temukan harga terbaik dari berbagai maskapai.',
  },
  {
    icon: '✧',
    title: 'Itinerary Berbasis AI',
    description: 'Rekomendasi perjalanan sesuai preferensimu.',
  },
  {
    icon: '♧',
    title: 'Daftar Perlengkapan Otomatis',
    description: 'Jangan sampai ada barang penting yang tertinggal!',
  },
  {
    icon: '♡',
    title: 'Perjalanan Lebih Terorganisir',
    description: 'Semua rencana perjalanan dalam satu tempat.',
  },
]

const destinations = [
  {
    name: 'Pura Ulun Danu Baratan',
    location: 'Bali, Indonesia',
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Gunung Fuji',
    location: 'Yamanashi, Jepang',
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Menara Eiffel',
    location: 'Paris, Prancis',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Raja Ampat',
    location: 'Papua Barat, Indonesia',
    image:
      'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=700&q=85',
  },
]

onMounted(() => {
  try {
    const savedUser = localStorage.getItem('tripmate-current-user')
    currentUser.value = savedUser ? JSON.parse(savedUser) : null
  } catch {
    currentUser.value = null
  }

  if (currentUser.value) {
    loadTrips()
    loadBookings()
  }
})

// Mengambil riwayat pemesanan dari database
async function loadBookings() {
  if (!currentUser.value?.id || !getToken()) {
    bookings.value = []
    return
  }

  loadingBookings.value = true
  bookingError.value = ''

  try {
    const response = await fetch(`${API_URL}/history`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })

    const result = await response.json()

    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'Gagal mengambil riwayat pemesanan.')
    }

    bookings.value = Array.isArray(result.data) ? result.data : []
  } catch (error) {
    bookingError.value = error.message
    bookings.value = []
  } finally {
    loadingBookings.value = false
  }
}

// Maksimal tiga pemesanan terbaru
const latestBookings = computed(() => bookings.value.slice(0, 3))

function formatBookingDate(date) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatBookingPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(price) || 0)
}

onUnmounted(() => {
  clearTimeout(originSearchTimer)
  clearTimeout(destinationSearchTimer)
})
</script>

<template>
  <div class="bg-[#dceafa]">
    <!-- Hero -->
    <section
      class="relative h-[472px] w-full bg-cover bg-center"
      :style="{
        backgroundImage: `linear-gradient(rgba(38, 57, 81, 0.38), rgba(38, 57, 81, 0.38)), url('${heroImage}')`,
      }"
    >
      <div class="mx-auto w-full max-w-[1440px] px-[5.3%] pb-40 pt-14">
        <div class="max-w-xl text-white">
          <h1 class="max-w-[520px] text-3xl font-semibold leading-tight sm:text-[34px]">
            Rencanakan perjalananmu dengan lebih mudah.
          </h1>

          <p class="mt-2 max-w-lg text-sm tracking-wide text-white/95">
            Temukan tiket penerbangan terbaik, dapatkan rekomendasi rencana perjalanan pribadi
            berbasis AI, dan siapkan daftar perlengkapan dalam satu platform.
          </p>

          <a
            href="#pencarian"
            class="mt-5 inline-flex rounded-full bg-[#347bd0] px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Mulai Merencanakan →
          </a>
        </div>
      </div>
    </section>

    <!-- Flight Search -->
    <section
      id="pencarian"
      class="relative z-10 mx-auto -mt-[124px] w-full max-w-[1440px] scroll-mt-24 px-[3.2%]"
    >
      <div class="rounded-[24px] bg-[#f5f9ff] p-6 shadow-xl sm:px-6 sm:py-5">
        <div
          class="mb-3 inline-flex border-b-2 border-blue-500 px-2 pb-2 text-sm font-medium text-blue-600"
        >
          ✈ Penerbangan
        </div>

        <form
          class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_0.75fr]"
          @submit.prevent="searchFlights"
        >
          <!-- Kota Asal -->
          <div class="relative">
            <label for="origin" class="block rounded-xl border border-slate-200 p-3">
              <span class="block text-xs font-medium text-slate-600">Kota Asal</span>

              <span class="mt-2 flex items-center gap-2">
                <span aria-hidden="true">⌖</span>

                <input
                  id="origin"
                  v-model="origin"
                  type="text"
                  required
                  autocomplete="off"
                  class="w-full min-w-0 bg-transparent text-sm outline-none"
                  placeholder="Ketik kota asal"
                  @input="searchLocation('origin')"
                />
              </span>
            </label>

            <div
              v-if="originSuggestions.length"
              class="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              <button
                v-for="(airport, index) in originSuggestions"
                :key="`${airport.iata || airport.label}-${index}`"
                type="button"
                class="flex w-full flex-col rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                @mousedown.prevent="selectOrigin(airport)"
              >
                <span class="font-medium">
                  {{ airport.label || airport.city }}
                  {{ airport.iata ? `(${airport.iata})` : '' }}
                </span>

                <span class="text-xs text-slate-500">
                  {{
                    airport.type === 'location'
                      ? 'Lokasi'
                      : airport.name + (airport.country ? ', ' + airport.country : '')
                  }}
                </span>
              </button>
            </div>
            <p v-if="searchingOrigin" class="mt-1 text-xs text-slate-500">Mencari bandara...</p>
          </div>

          <!-- Kota Tujuan -->
          <div class="relative">
            <label for="destination" class="block rounded-xl border border-slate-200 p-3">
              <span class="block text-xs font-medium text-slate-600">Kota Tujuan</span>

              <span class="mt-2 flex items-center gap-2">
                <span aria-hidden="true">⌖</span>

                <input
                  id="destination"
                  v-model="destination"
                  type="text"
                  required
                  autocomplete="off"
                  class="w-full min-w-0 bg-transparent text-sm outline-none"
                  placeholder="Ketik kota tujuan"
                  @input="searchLocation('destination')"
                />
              </span>
            </label>

            <div
              v-if="destinationSuggestions.length"
              class="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              <button
                v-for="(airport, index) in destinationSuggestions"
                :key="`${airport.id}-${index}`"
                type="button"
                class="flex w-full flex-col rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                @mousedown.prevent="selectDestination(airport)"
              >
                <span class="font-medium">
                  {{ airport.city || airport.municipality || airport.name }}
                  {{ airport.iata_code ? `(${airport.iata_code})` : '' }}
                </span>
                <span class="text-xs text-slate-500">
                  {{ airport.name }} {{ airport.country ? ', ' + airport.country : '' }}
                </span>
              </button>
            </div>
            <p v-if="searchingDestination" class="mt-1 text-xs text-slate-500">
              Mencari bandara...
            </p>
          </div>

          <!-- Tanggal Keberangkatan -->
          <label class="rounded-xl border border-slate-200 p-3">
            <span class="block text-xs font-medium text-slate-600"> Tanggal Keberangkatan </span>

            <input
              v-model="departureDate"
              type="date"
              :min="today"
              required
              class="mt-2 w-full min-w-0 cursor-pointer bg-transparent text-sm outline-none"
            />
          </label>

          <!-- Jumlah Penumpang -->
          <label class="rounded-xl border border-slate-200 p-3">
            <span class="block text-xs font-medium text-slate-600"> Penumpang </span>

            <span class="mt-2 flex items-center gap-2">
              <span aria-hidden="true">♙</span>

              <input
                v-model.number="passengers"
                type="number"
                min="1"
                step="1"
                required
                placeholder="Jumlah penumpang"
                class="w-full min-w-0 bg-transparent text-sm outline-none"
              />
            </span>
          </label>

          <!-- Cari Tiket -->
          <button
            type="submit"
            class="flex min-h-[62px] items-center justify-center gap-2 rounded-xl bg-[#347bd0] px-4 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Cari Tiket <span aria-hidden="true">⌕</span>
          </button>
        </form>

        <p class="mt-3 text-xs text-slate-500">
          Ketik minimal 2 karakter untuk melihat saran bandara. Lokasi tetap bisa diketik manual.
        </p>
      </div>
    </section>

    <!-- Ringkasan Perjalanan -->
    <section v-if="currentUser" class="mx-auto max-w-7xl px-6 pb-4 pt-10 lg:px-10">
      <div class="rounded-2xl bg-white p-6 shadow-md sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wider text-[#347bd0]">
              Aktivitas Saya
            </p>

            <h2 class="mt-1 text-2xl font-bold text-[#263a53]">Ringkasan Perjalanan</h2>

            <p class="mt-1 text-sm text-slate-500">
              Halo, {{ currentUser.name || 'Pengguna' }}! Ini perjalananmu di TripMate.
            </p>
          </div>

          <div class="rounded-xl bg-blue-50 px-5 py-3 text-center">
            <p class="text-3xl font-bold text-[#347bd0]">
              {{ myTrips.length }}
            </p>

            <p class="text-xs font-medium text-slate-600">Total Perjalanan</p>
          </div>
        </div>

        <!-- Loading -->
        <div
          v-if="loadingTrips"
          class="mt-6 rounded-xl bg-blue-50 px-5 py-8 text-center text-sm text-slate-600"
        >
          Memuat riwayat perjalanan...
        </div>

        <!-- Error -->
        <div
          v-else-if="tripError"
          class="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600"
          role="alert"
        >
          Gagal memuat perjalanan: {{ tripError }}
        </div>

        <!-- Daftar perjalanan -->
        <div v-else-if="latestTrips.length > 0" class="mt-6 grid gap-4 md:grid-cols-3">
          <article
            v-for="trip in latestTrips"
            :key="trip.id_perjalanan"
            class="rounded-xl border border-slate-200 p-5 transition hover:border-[#347bd0]"
          >
            <h3 class="font-bold text-[#263a53]">
              {{ trip.judul }}
            </h3>

            <p class="mt-1 text-sm font-medium text-[#347bd0]">
              {{ trip.tujuan_perjalanan || 'Tujuan belum tersedia' }}
            </p>

            <div class="mt-3 space-y-1 text-xs text-slate-500">
              <p>
                <span class="font-semibold">Mulai:</span>
                {{ formatDate(trip.tanggal_mulai) }}
              </p>

              <p>
                <span class="font-semibold">Selesai:</span>
                {{ formatDate(trip.tanggal_selesai) }}
              </p>
            </div>
          </article>
        </div>

        <!-- Belum ada perjalanan -->
        <div
          v-else
          class="mt-6 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center"
        >
          <p class="font-semibold text-slate-600">Kamu belum memiliki perjalanan.</p>

          <p class="mt-1 text-sm text-slate-500">
            Mulai buat rencana perjalanan pertamamu sekarang!
          </p>
        </div>

        <div class="mt-6">
          <button
            type="button"
            class="rounded-lg bg-[#347bd0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            @click="router.push('/trips')"
          >
            Lihat Semua Perjalanan →
          </button>
        </div>
      </div>
    </section>

    <!-- Riwayat Pemesanan -->
    <section v-if="currentUser" class="mx-auto max-w-7xl px-6 pb-6 pt-4 lg:px-10">
      <div class="rounded-2xl bg-white p-6 shadow-md sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wider text-[#347bd0]">
              Aktivitas Saya
            </p>
            <h2 class="mt-1 text-2xl font-bold text-[#263a53]">Riwayat Pemesanan</h2>
            <p class="mt-1 text-sm text-slate-500">
              Lihat tiket penerbangan yang telah kamu pesan.
            </p>
          </div>

          <div class="rounded-xl bg-blue-50 px-5 py-3 text-center">
            <p class="text-3xl font-bold text-[#347bd0]">
              {{ bookings.length }}
            </p>
            <p class="text-xs font-medium text-slate-600">Total Pemesanan</p>
          </div>
        </div>

        <!-- Loading -->
        <div
          v-if="loadingBookings"
          class="mt-6 rounded-xl bg-blue-50 px-5 py-8 text-center text-sm text-slate-600"
        >
          Memuat riwayat pemesanan...
        </div>

        <!-- Error -->
        <div
          v-else-if="bookingError"
          class="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600"
          role="alert"
        >
          Gagal memuat riwayat pemesanan: {{ bookingError }}
        </div>

        <!-- Daftar pemesanan -->
        <div v-else-if="latestBookings.length > 0" class="mt-6 grid gap-4 md:grid-cols-3">
          <article
            v-for="booking in latestBookings"
            :key="booking.id_pemesanan"
            class="rounded-xl border border-slate-200 p-5 transition hover:border-[#347bd0] hover:shadow-sm"
          >
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-bold text-[#263a53]">
                {{ booking.maskapai }}
              </h3>

              <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                {{ booking.status }}
              </span>
            </div>

            <p class="mt-1 text-xs font-medium text-slate-500">
              {{ booking.kode_pemesanan }}
            </p>

            <div class="mt-4">
              <p class="text-sm font-semibold text-[#263a53]">
                {{ booking.bandara_keberangkatan }}
                <span class="text-[#347bd0]">→</span>
                {{ booking.bandara_kedatangan }}
              </p>

              <p class="mt-2 text-xs text-slate-500">
                {{ formatBookingDate(booking.waktu_keberangkatan) }}
              </p>
            </div>

            <div class="mt-4 border-t border-slate-100 pt-3">
              <p class="text-xs text-slate-500">Total pembayaran</p>
              <p class="mt-1 font-bold text-[#347bd0]">
                {{ formatBookingPrice(booking.total_harga) }}
              </p>
            </div>
          </article>
        </div>

        <!-- Belum ada pemesanan -->
        <div
          v-else
          class="mt-6 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center"
        >
          <p class="font-semibold text-slate-600">Kamu belum memiliki pemesanan.</p>
          <p class="mt-1 text-sm text-slate-500">Pesan tiket penerbangan pertamamu di TripMate!</p>
        </div>

        <!-- Tombol lihat semua -->
        <div v-if="bookings.length > 0" class="mt-6">
          <button
            type="button"
            class="rounded-lg bg-[#347bd0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            @click="router.push('/bookings')"
          >
            Lihat Semua Pemesanan →
          </button>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-7xl px-6 pb-8 pt-6 lg:px-10">
      <h2 class="text-xl font-semibold text-[#263a53]">
        Semua yang Kamu Butuhkan untuk Berpergian
      </h2>

      <p class="text-sm text-slate-600">
        Nikmati perjalanan yang lebih praktis dengan fitur pintar dari TripMate.
      </p>

      <div class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="feature in features" :key="feature.title" class="flex items-center gap-3">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/80 text-2xl text-blue-600"
          >
            {{ feature.icon }}
          </div>

          <div>
            <h3 class="text-xs font-bold leading-relaxed text-[#263a53]">
              {{ feature.title }}
            </h3>

            <p class="mt-1 text-[11px] leading-relaxed text-slate-700">
              {{ feature.description }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <!-- Promotion -->
    <section class="mx-auto max-w-6xl px-5 pb-10">
      <div
        class="grid gap-5 rounded-3xl bg-[#f5f9ff] p-5 sm:p-6 md:grid-cols-[1fr_1.2fr] md:items-center"
      >
        <div>
          <h2
            class="max-w-sm text-4xl font-semibold leading-[.95] tracking-tight text-[#263a53] sm:text-5xl"
          >
            Lebih dari pemesanan tiket
          </h2>

          <p class="mt-4 max-w-md text-xs leading-relaxed tracking-[.18em] text-slate-500">
            Nikmati perjalanan yang lebih praktis dengan TripMate. Temukan destinasi baru dan
            rencanakan perjalananmu dengan mudah.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <img
            class="h-24 w-full rounded-xl object-cover sm:h-28"
            src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80"
            alt="Pemandangan balon udara"
            loading="lazy"
          />

          <img
            class="row-span-2 h-full min-h-52 w-full rounded-xl object-cover"
            src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=85"
            alt="Pemandangan pura di Bali"
            loading="lazy"
          />

          <img
            class="h-24 w-full rounded-xl object-cover sm:h-28"
            src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80"
            alt="Bangunan bersejarah"
            loading="lazy"
          />
        </div>
      </div>
    </section>

    <!-- Destinations -->
    <section class="mx-auto max-w-6xl px-5 pb-10">
      <h2 class="mb-5 text-xl font-semibold text-[#263a53]">
        Destinasi Favorit untuk Perjalananmu
      </h2>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="place in destinations"
          :key="place.name"
          class="rounded-2xl bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <img
            :src="place.image"
            :alt="place.name"
            class="h-36 w-full rounded-xl object-cover"
            loading="lazy"
          />

          <h3 class="mt-2 text-sm font-semibold text-[#263a53]">
            {{ place.name }}
          </h3>

          <p class="text-xs text-slate-500">
            {{ place.location }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>
