<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const origin = ref(String(route.query.origin || 'Balikpapan'))
const destination = ref(String(route.query.destination || 'Denpasar'))
const departureDate = ref(String(route.query.departureDate || ''))
const returnDate = ref(String(route.query.returnDate || ''))
const passengers = ref(Math.min(5, Math.max(1, Number(route.query.passengers) || 1)))

const today = (() => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().split('T')[0]
})()

const cities = ['Jakarta', 'Balikpapan', 'Surabaya', 'Denpasar', 'Yogyakarta', 'Makassar']

const sampleFlights = [
  {
    id: 1,
    airline: 'Garuda Indonesia',
    code: 'GA-562',
    departure: '08:00',
    arrival: '09:35',
    duration: '1j 35m',
    price: 1250000,
  },
  {
    id: 2,
    airline: 'Batik Air',
    code: 'ID-6254',
    departure: '10:30',
    arrival: '12:05',
    duration: '1j 35m',
    price: 890000,
  },
  {
    id: 3,
    airline: 'Lion Air',
    code: 'JT-672',
    departure: '14:15',
    arrival: '15:55',
    duration: '1j 40m',
    price: 750000,
  },
]

const searched = ref(true)
const stage = ref('outbound')
const selectedOutbound = ref(null)

const filteredFlights = computed(() =>
  searched.value
    ? sampleFlights.map((flight) => ({
        ...flight,
        totalPrice: flight.price * passengers.value,
      }))
    : [],
)

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

function searchFlights() {
  if (!origin.value || !destination.value || !departureDate.value) {
    alert('Lengkapi kota asal, kota tujuan, dan tanggal keberangkatan.')
    return
  }

  if (origin.value === destination.value) {
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

  selectedOutbound.value = null
  stage.value = 'outbound'

  // Hapus tiket pilihan lama saat memulai pencarian baru.
  localStorage.removeItem('tripmate-selected-flight')

  router.replace({
    path: '/flights',
    query: {
      origin: origin.value,
      destination: destination.value,
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

    // Jika tidak ada tanggal pulang, langsung lanjut ke detail tiket.
    if (!returnDate.value) {
      saveSelection()
    } else {
      // Pengguna bisa memilih tiket pulang atau melewatinya.
      stage.value = 'return'
    }

    return
  }

  saveSelection(flight)
}

function continueWithoutReturn() {
  if (!selectedOutbound.value) return

  // Simpan hanya tiket pergi meskipun tanggal pulang telah diisi.
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
          <label class="text-sm font-medium text-slate-700">
            Kota Asal

            <select
              v-model="origin"
              required
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            >
              <option v-for="city in cities" :key="city" :value="city">
                {{ city }}
              </option>
            </select>
          </label>

          <label class="text-sm font-medium text-slate-700">
            Kota Tujuan

            <select
              v-model="destination"
              required
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            >
              <option v-for="city in cities" :key="city" :value="city">
                {{ city }}
              </option>
            </select>
          </label>

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

            <select
              v-model.number="passengers"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
            >
              <option v-for="number in 5" :key="number" :value="number">{{ number }} Dewasa</option>
            </select>
          </label>

          <button
            type="submit"
            class="self-end rounded-xl bg-[#347bd0] p-3 font-semibold text-white hover:bg-blue-700"
          >
            Cari Penerbangan
          </button>
        </form>
      </section>

      <section class="mt-8">
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

        <div class="space-y-4">
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

              <p class="mt-3 text-sm text-slate-600">
                {{ flight.duration }} · Penerbangan langsung
              </p>
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
              <p class="text-xs text-slate-500">Total {{ passengers }} penumpang</p>

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
