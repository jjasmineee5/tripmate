<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import heroImage from '../assets/images/hero beranda.png'

const router = useRouter()

const origin = ref('Balikpapan')
const destination = ref('Denpasar')
const departureDate = ref('')
const passengers = ref(1)

const showOriginSuggestions = ref(false)
const showDestinationSuggestions = ref(false)

// Data pengguna dan riwayat perjalanan
const currentUser = ref(null)
const trips = ref([])

try {
  const savedUser = localStorage.getItem('tripmate-current-user')
  const savedTrips = localStorage.getItem('tripmate-trips')

  currentUser.value = savedUser ? JSON.parse(savedUser) : null

  const parsedTrips = savedTrips ? JSON.parse(savedTrips) : []
  trips.value = Array.isArray(parsedTrips) ? parsedTrips : []
} catch {
  currentUser.value = null
  trips.value = []
}

// Perjalanan milik pengguna yang sedang login
const myTrips = computed(() => {
  if (!currentUser.value?.id) return []

  return trips.value
    .filter((trip) => String(trip.userId) === String(currentUser.value.id))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
})

// Maksimal tiga perjalanan terbaru
const latestTrips = computed(() => myTrips.value.slice(0, 3))

function formatDate(date) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const cities = [
  'Balikpapan',
  'Samarinda',
  'Jakarta',
  'Surabaya',
  'Denpasar',
  'Yogyakarta',
  'Makassar',
  'Banjarmasin',
  'Pontianak',
  'Bandung',
  'Medan',
  'Lombok',
  'Manado',
  'Palembang',
  'Semarang',
  'Malang',
  'Batam',
  'Padang',
  'Aceh',
  'Kupang',
  'Jayapura',
  'Solo',
  'Pekanbaru',
  'Jambi',
  'Bengkulu',
]

const today = (() => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().split('T')[0]
})()

const filteredOrigins = computed(() => {
  const query = origin.value.trim().toLowerCase()

  if (!query) return cities

  return cities.filter((city) => city.toLowerCase().includes(query))
})

const filteredDestinations = computed(() => {
  const query = destination.value.trim().toLowerCase()

  if (!query) return cities

  return cities.filter((city) => city.toLowerCase().includes(query))
})

function selectOrigin(city) {
  origin.value = city
  showOriginSuggestions.value = false
}

function selectDestination(city) {
  destination.value = city
  showDestinationSuggestions.value = false
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

  showOriginSuggestions.value = false
  showDestinationSuggestions.value = false

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
                  @focus="showOriginSuggestions = true"
                  @input="showOriginSuggestions = true"
                />
              </span>
            </label>

            <div
              v-if="showOriginSuggestions && filteredOrigins.length"
              class="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              <button
                v-for="city in filteredOrigins"
                :key="city"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                @mousedown.prevent="selectOrigin(city)"
              >
                <span aria-hidden="true">⌖</span>
                {{ city }}
              </button>
            </div>
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
                  @focus="showDestinationSuggestions = true"
                  @input="showDestinationSuggestions = true"
                />
              </span>
            </label>

            <div
              v-if="showDestinationSuggestions && filteredDestinations.length"
              class="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              <button
                v-for="city in filteredDestinations"
                :key="city"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                @mousedown.prevent="selectDestination(city)"
              >
                <span aria-hidden="true">⌖</span>
                {{ city }}
              </button>
            </div>
          </div>

          <!-- Tanggal Keberangkatan -->
          <label class="rounded-xl border border-slate-200 p-3">
            <span class="block text-xs font-medium text-slate-600">Tanggal Keberangkatan</span>
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
            <span class="block text-xs font-medium text-slate-600">Penumpang</span>
            <span class="mt-2 flex items-center gap-2">
              <span aria-hidden="true">♙</span>
              <select
                v-model.number="passengers"
                class="w-full cursor-pointer bg-transparent text-sm outline-none"
              >
                <option :value="1">1 Dewasa</option>
                <option :value="2">2 Dewasa</option>
                <option :value="3">3 Dewasa</option>
                <option :value="4">4 Dewasa</option>
                <option :value="5">5 Dewasa</option>
              </select>
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
          Ketik nama kota untuk melihat rekomendasi, atau masukkan nama kota secara manual.
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

        <div v-if="latestTrips.length > 0" class="mt-6 grid gap-4 md:grid-cols-3">
          <article
            v-for="trip in latestTrips"
            :key="trip.id"
            class="rounded-xl border border-slate-200 p-5 transition hover:border-[#347bd0]"
          >
            <h3 class="font-bold text-[#263a53]">
              {{ trip.name }}
            </h3>

            <p class="mt-1 text-sm font-medium text-[#347bd0]">
              {{ trip.destination }}
            </p>

            <div class="mt-3 space-y-1 text-xs text-slate-500">
              <p>
                <span class="font-semibold">Mulai:</span>
                {{ formatDate(trip.startDate) }}
              </p>
              <p>
                <span class="font-semibold">Selesai:</span>
                {{ formatDate(trip.endDate) }}
              </p>
            </div>
          </article>
        </div>

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
          <p class="text-xs text-slate-500">{{ place.location }}</p>
        </article>
      </div>
    </section>
  </div>
</template>
