<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const origin = ref(String(route.query.origin || ''))
const destination = ref(String(route.query.destination || ''))
const departureDate = ref(String(route.query.departureDate || ''))
const returnDate = ref(String(route.query.returnDate || ''))
const passengers = ref(Math.max(1, Number(route.query.passengers) || 1))

// Autocomplete bandara dari backend TripMate
const originSuggestions = ref([])
const destinationSuggestions = ref([])
const originOpen = ref(false)
const destinationOpen = ref(false)
let originTimer = null
let destinationTimer = null

async function fetchAirportSuggestions(query, target) {
  if (!query || query.trim().length < 2) {
    target.value = []
    return
  }
  try {
    const response = await fetch(
      `http://localhost:3000/api/airports/search?q=${encodeURIComponent(query.trim())}`,
    )
    const result = await response.json()
    target.value = result?.data || []
  } catch (error) {
    console.error('Gagal mengambil saran bandara:', error)
    target.value = []
  }
}

function onOriginInput() {
  originOpen.value = true
  clearTimeout(originTimer)
  originTimer = setTimeout(() => fetchAirportSuggestions(origin.value, originSuggestions), 250)
}

function onDestinationInput() {
  destinationOpen.value = true
  clearTimeout(destinationTimer)
  destinationTimer = setTimeout(
    () => fetchAirportSuggestions(destination.value, destinationSuggestions),
    250,
  )
}

function selectOrigin(airport) {
  origin.value = airportLabel(airport)
  originSuggestions.value = []
  originOpen.value = false
}

function selectDestination(airport) {
  destination.value = airportLabel(airport)
  destinationSuggestions.value = []
  destinationOpen.value = false
}

function airportLabel(airport) {
  if (airport.type === 'location') {
    return airport.label || `${airport.city}, ${airport.country}`
  }

  return [airport.city || airport.name, airport.iata ? `(${airport.iata})` : '', airport.country]
    .filter(Boolean)
    .join(', ')
}

const today = (() => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().split('T')[0]
})()

// Data penerbangan simulasi sementara
const sampleFlights = [
  {
    id: 1,
    airline: 'Garuda Indonesia',
    code: 'GA-562',
    departure: '08:00',
    arrival: '09:35',
    duration: '1j 35m',
    price: 1250000,
    class: 'Business',
  },
  {
    id: 2,
    airline: 'Batik Air',
    code: 'ID-6254',
    departure: '10:30',
    arrival: '12:05',
    duration: '1j 35m',
    price: 890000,
    class: 'Economy',
  },
  {
    id: 3,
    airline: 'Lion Air',
    code: 'JT-672',
    departure: '14:15',
    arrival: '15:55',
    duration: '1j 40m',
    price: 750000,
    class: 'Economy',
  },
]

// Hasil penerbangan disembunyikan sebelum pencarian
const searched = ref(false)
const stage = ref('outbound')
const selectedOutbound = ref(null)

// Filter penerbangan
const selectedAirline = ref('Semua')
const minPrice = ref(null)
const maxPrice = ref(null)
const appliedMinPrice = ref(null)
const appliedMaxPrice = ref(null)
const selectedClass = ref('Semua')

const airlines = computed(() => [
  'Semua',
  ...new Set(sampleFlights.map((flight) => flight.airline)),
])

const filteredFlights = computed(() => {
  if (!searched.value) return []

  return sampleFlights
    .filter((flight) => {
      const matchesAirline =
        selectedAirline.value === 'Semua' || flight.airline === selectedAirline.value

      const matchesMinPrice =
        appliedMinPrice.value === null || flight.price >= appliedMinPrice.value

      const matchesMaxPrice =
        appliedMaxPrice.value === null || flight.price <= appliedMaxPrice.value

      const matchesClass = selectedClass.value === 'Semua' || flight.class === selectedClass.value

      return matchesAirline && matchesMinPrice && matchesMaxPrice && matchesClass
    })
    .map((flight) => ({
      ...flight,
      totalPrice: flight.price * passengers.value,
    }))
})

function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price)
}

function formatDate(dateString) {
  if (!dateString) return 'Belum dipilih'

  return new Date(`${dateString}T12:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function resetFilters() {
  selectedAirline.value = 'Semua'
  minPrice.value = null
  maxPrice.value = null
  appliedMinPrice.value = null
  appliedMaxPrice.value = null
  selectedClass.value = 'Semua'
}

function applyPriceFilter() {
  const min = minPrice.value === '' || minPrice.value === null ? null : Number(minPrice.value)

  const max = maxPrice.value === '' || maxPrice.value === null ? null : Number(maxPrice.value)

  if (min !== null && max !== null && min > max) {
    alert('Harga minimum tidak boleh lebih besar dari harga maksimum.')
    return
  }

  if (
    (min !== null && (!Number.isFinite(min) || min < 0)) ||
    (max !== null && (!Number.isFinite(max) || max < 0))
  ) {
    alert('Harga tidak boleh kurang dari 0.')
    return
  }

  appliedMinPrice.value = min
  appliedMaxPrice.value = max
}

function searchFlights() {
  if (!origin.value.trim() || !destination.value.trim() || !departureDate.value) {
    alert('Lengkapi kota asal, kota tujuan, dan tanggal keberangkatan.')
    return
  }

  if (origin.value.trim().toLowerCase() === destination.value.trim().toLowerCase()) {
    alert('Kota asal dan tujuan harus berbeda.')
    return
  }

  if (departureDate.value < today) {
    alert('Tanggal keberangkatan tidak boleh di masa lalu.')
    return
  }

  if (returnDate.value && returnDate.value < departureDate.value) {
    alert('Tanggal pulang tidak boleh sebelum tanggal berangkat.')
    return
  }

  if (!Number.isInteger(passengers.value) || passengers.value < 1) {
    alert('Jumlah penumpang minimal 1 orang.')
    return
  }

  selectedOutbound.value = null
  stage.value = 'outbound'
  resetFilters()

  localStorage.removeItem('tripmate-selected-flight')

  router.replace({
    path: '/flights',
    query: {
      origin: origin.value.trim(),
      destination: destination.value.trim(),
      departureDate: departureDate.value,
      ...(returnDate.value ? { returnDate: returnDate.value } : {}),
      passengers: String(passengers.value),
    },
  })

  searched.value = true
}

function saveSelection(returnFlight = null) {
  const outbound = selectedOutbound.value

  if (!outbound) {
    alert('Pilih penerbangan pergi terlebih dahulu.')
    return
  }

  const outboundData = {
    ...outbound,
    origin: origin.value,
    destination: destination.value,
    departureDate: departureDate.value,
  }

  const returnData = returnFlight
    ? {
        ...returnFlight,
        origin: destination.value,
        destination: origin.value,
        departureDate: returnDate.value,
      }
    : null

  const saved = {
    ...outboundData,
    origin: origin.value,
    destination: destination.value,
    departureDate: departureDate.value,
    returnDate: returnData ? returnDate.value : '',
    passengers: passengers.value,
    outboundFlight: outboundData,
    returnFlight: returnData,
    outboundPrice: outboundData.totalPrice,
    returnPrice: returnData?.totalPrice || 0,
    totalPrice: outboundData.totalPrice + (returnData?.totalPrice || 0),
    selectedAt: new Date().toISOString(),
  }

  try {
    localStorage.setItem('tripmate-selected-flight', JSON.stringify(saved))
    router.push({ name: 'flight-details' })
  } catch {
    alert('Tiket gagal disimpan. Silakan coba lagi.')
  }
}

function chooseFlight(flight) {
  if (stage.value === 'outbound') {
    selectedOutbound.value = { ...flight }

    if (!returnDate.value) {
      saveSelection()
    } else {
      stage.value = 'return'
    }

    return
  }

  saveSelection(flight)
}

function continueWithoutReturn() {
  if (!selectedOutbound.value) return
  saveSelection(null)
}

function changeOutbound() {
  stage.value = 'outbound'
  selectedOutbound.value = null
}
</script>

<template>
  <main class="min-h-screen bg-[#dceafa] px-4 py-10 sm:px-6 sm:px-10">
    <div class="mx-auto max-w-6xl">
      <button
        type="button"
        class="mb-5 text-sm font-semibold text-blue-700 hover:text-blue-900"
        @click="router.push('/')"
      >
        ← Kembali ke Beranda
      </button>

      <!-- Form Pencarian -->
      <section class="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <p class="text-sm font-semibold text-blue-600">TRIPMATE FLIGHT SEARCH</p>

        <h1 class="mt-2 text-2xl font-bold text-[#263a53] sm:text-3xl">Cari Tiket Penerbangan</h1>

        <p class="mt-2 text-sm text-slate-500">
          Pilih penerbangan pergi. Tiket pulang boleh dipilih atau dilewati.
        </p>

        <form
          class="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          @submit.prevent="searchFlights"
        >
          <div class="relative text-sm font-medium text-slate-700">
            <label for="origin-input">Kota Asal</label>
            <input
              id="origin-input"
              v-model.trim="origin"
              @input="onOriginInput"
              @focus="onOriginInput"
              @blur="originOpen = false"
              type="text"
              required
              autocomplete="off"
              placeholder="Masukkan kota asal"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            />
            <ul
              v-if="originOpen && originSuggestions.length"
              class="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <li
                v-for="(airport, index) in originSuggestions"
                :key="`${airport.iata || airport.label}-${index}`"
                class="cursor-pointer p-3 hover:bg-blue-50"
                @mousedown.prevent="selectOrigin(airport)"
              >
                <div class="font-semibold">
                  {{ airport.label || airport.city || airport.name }}
                  {{ airport.iata ? `(${airport.iata})` : '' }}
                </div>

                <div class="text-xs font-normal text-slate-500">
                  {{
                    airport.type === 'location'
                      ? 'Lokasi'
                      : airport.name + (airport.country ? ' · ' + airport.country : '')
                  }}
                </div>
              </li>
            </ul>
          </div>

          <div class="relative text-sm font-medium text-slate-700">
            <label for="destination-input">Kota Tujuan</label>
            <input
              id="destination-input"
              v-model.trim="destination"
              @input="onDestinationInput"
              @focus="onDestinationInput"
              @blur="destinationOpen = false"
              type="text"
              required
              autocomplete="off"
              placeholder="Masukkan kota tujuan"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            />
            <ul
              v-if="destinationOpen && destinationSuggestions.length"
              class="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <li
                v-for="(airport, index) in destinationSuggestions"
                :key="`${airport.iata || airport.label}-${index}`"
                class="cursor-pointer p-3 hover:bg-blue-50"
                @mousedown.prevent="selectDestination(airport)"
              >
                <div class="font-semibold">
                  {{ airport.label || airport.city || airport.name }}
                  {{ airport.iata ? `(${airport.iata})` : '' }}
                </div>

                <div class="text-xs font-normal text-slate-500">
                  {{
                    airport.type === 'location'
                      ? 'Lokasi'
                      : airport.name + (airport.country ? ' · ' + airport.country : '')
                  }}
                </div>
              </li>
            </ul>
          </div>

          <label class="text-sm font-medium text-slate-700">
            Tanggal Berangkat

            <input
              v-model="departureDate"
              type="date"
              :min="today"
              required
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            />
          </label>

          <label class="text-sm font-medium text-slate-700">
            Tanggal Pulang (opsional)

            <input
              v-model="returnDate"
              type="date"
              :min="departureDate || today"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            />
          </label>

          <label class="text-sm font-medium text-slate-700">
            Penumpang

            <input
              v-model.number="passengers"
              type="number"
              min="1"
              step="1"
              required
              placeholder="Jumlah penumpang"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            />
          </label>

          <button
            type="submit"
            class="self-end rounded-xl bg-[#347bd0] p-3 font-semibold text-white hover:bg-blue-700"
          >
            Cari Penerbangan
          </button>
        </form>
      </section>

      <!-- Filter Penerbangan -->
      <section v-if="searched" class="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-[#263a53]">Filter Penerbangan</h2>
            <p class="mt-1 text-sm text-slate-500">Sesuaikan hasil pencarian dengan kebutuhanmu.</p>
          </div>

          <button
            type="button"
            class="text-sm font-semibold text-blue-700 hover:text-blue-900"
            @click="resetFilters"
          >
            Reset Filter
          </button>
        </div>

        <div class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <label class="text-sm font-medium text-slate-700">
            Maskapai

            <select
              v-model="selectedAirline"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            >
              <option v-for="airline in airlines" :key="airline" :value="airline">
                {{ airline }}
              </option>
            </select>
          </label>

          <label class="text-sm font-medium text-slate-700">
            Kelas Penerbangan

            <select
              v-model="selectedClass"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            >
              <option value="Semua">Semua Kelas</option>
              <option value="Economy">Economy</option>
              <option value="Business">Business</option>
            </select>
          </label>

          <div class="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-1">
            <label for="min-price">Rentang Harga (per orang)</label>

            <div class="mt-2 grid grid-cols-2 gap-2">
              <input
                id="min-price"
                v-model.number="minPrice"
                type="number"
                min="0"
                placeholder="Minimum"
                class="min-w-0 rounded-xl border border-slate-300 p-3"
              />

              <input
                v-model.number="maxPrice"
                type="number"
                min="0"
                placeholder="Maksimum"
                class="min-w-0 rounded-xl border border-slate-300 p-3"
              />
            </div>

            <button
              type="button"
              class="mt-2 rounded-lg bg-[#347bd0] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              @click="applyPriceFilter"
            >
              Terapkan Filter
            </button>
          </div>
        </div>

        <p class="mt-4 text-xs text-slate-500">
          Filter harga menggunakan harga tiket per orang, bukan total seluruh penumpang. Harga yang
          ditampilkan merupakan harga simulasi.
        </p>
      </section>

      <!-- Hasil Penerbangan -->
      <section v-if="searched" class="mt-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold text-[#263a53] sm:text-2xl">
              {{ stage === 'outbound' ? 'Pilih Penerbangan Pergi' : 'Pilih Penerbangan Pulang' }}
            </h2>

            <p class="mt-2 text-sm text-slate-600">
              {{ stage === 'outbound' ? origin : destination }}
              →
              {{ stage === 'outbound' ? destination : origin }}
              ·
              {{ formatDate(stage === 'outbound' ? departureDate : returnDate) }}
              · {{ passengers }} penumpang
            </p>
          </div>

          <button
            v-if="stage === 'return'"
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            @click="continueWithoutReturn"
          >
            Lanjut Tanpa Tiket Pulang
          </button>
        </div>

        <div class="my-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Daftar dan harga penerbangan merupakan data simulasi, bukan jadwal atau harga real-time.
        </div>

        <div v-if="filteredFlights.length > 0" class="space-y-4">
          <article
            v-for="flight in filteredFlights"
            :key="flight.id"
            class="grid grid-cols-1 items-center gap-5 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-[1.2fr_1fr_1fr] sm:p-6"
          >
            <div>
              <h3 class="font-bold text-[#263a53]">
                {{ flight.airline }}
              </h3>

              <p class="mt-1 text-sm text-slate-500">
                {{ flight.code }}
              </p>

              <div class="mt-3 flex flex-wrap gap-2">
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {{ flight.class }}
                </span>

                <span class="text-sm text-slate-600">
                  {{ flight.duration }} · Penerbangan langsung
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4 sm:justify-center">
              <div>
                <p class="text-2xl font-bold text-[#263a53]">
                  {{ flight.departure }}
                </p>

                <p class="text-xs text-slate-500">
                  {{ stage === 'outbound' ? origin : destination }}
                </p>
              </div>

              <div class="flex-1 text-center sm:max-w-20">
                <div class="border-t border-dashed border-slate-400"></div>
                <span class="text-xs text-slate-400">✈</span>
              </div>

              <div class="text-right">
                <p class="text-2xl font-bold text-[#263a53]">
                  {{ flight.arrival }}
                </p>

                <p class="text-xs text-slate-500">
                  {{ stage === 'outbound' ? destination : origin }}
                </p>
              </div>
            </div>

            <div class="sm:text-right">
              <p class="text-xs text-slate-500">Harga per orang</p>

              <p class="text-sm font-semibold text-slate-700">
                {{ formatPrice(flight.price) }}
              </p>

              <p class="mt-2 text-xs text-slate-500">Total {{ passengers }} penumpang</p>

              <p class="mt-1 text-xl font-bold text-blue-700">
                {{ formatPrice(flight.totalPrice) }}
              </p>

              <p class="mb-3 text-xs text-slate-500">Harga simulasi</p>

              <button
                type="button"
                class="w-full rounded-xl bg-[#347bd0] px-5 py-3 font-semibold text-white hover:bg-blue-700 sm:w-auto"
                @click="chooseFlight(flight)"
              >
                {{ stage === 'outbound' ? 'Pilih Penerbangan Pergi' : 'Pilih Penerbangan Pulang' }}
              </button>
            </div>
          </article>
        </div>

        <div
          v-else
          class="rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center"
        >
          <h3 class="font-bold text-[#263a53]">Tidak ada penerbangan yang sesuai</h3>

          <p class="mt-2 text-sm text-slate-500">
            Coba ubah filter maskapai, kelas, atau rentang harga.
          </p>

          <button
            type="button"
            class="mt-4 rounded-xl bg-[#347bd0] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            @click="resetFilters"
          >
            Reset Filter
          </button>
        </div>

        <!-- Ringkasan Tiket Pergi -->
        <div
          v-if="stage === 'return' && selectedOutbound"
          class="mt-5 rounded-xl border border-blue-100 bg-white p-4"
        >
          <p class="text-sm text-slate-700">Penerbangan pergi yang dipilih:</p>

          <p class="mt-1 font-bold text-[#263a53]">
            {{ selectedOutbound.airline }} · {{ selectedOutbound.code }}
          </p>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              class="rounded-xl border border-blue-300 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              @click="changeOutbound"
            >
              Ganti Penerbangan Pergi
            </button>

            <button
              type="button"
              class="rounded-xl bg-[#347bd0] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              @click="continueWithoutReturn"
            >
              Lanjut dengan Tiket Pergi Saja
            </button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
