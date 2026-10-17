<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const origin = ref('')
const destination = ref('')
const departureDate = ref('')
const returnDate = ref('')
const passengers = ref(1)
const searched = ref(false)
const errorMessage = ref('')

const today = new Date().toISOString().split('T')[0]

const sampleFlights = [
  {
    airline: 'Garuda Indonesia',
    code: 'GA-562',
    departure: '08:00',
    arrival: '09:35',
    price: 1250000,
  },
  {
    airline: 'Batik Air',
    code: 'ID-6254',
    departure: '10:30',
    arrival: '12:05',
    price: 890000,
  },
  {
    airline: 'Lion Air',
    code: 'JT-672',
    departure: '14:15',
    arrival: '15:55',
    price: 750000,
  },
]

const filteredFlights = computed(() => {
  if (!searched.value) return []

  return sampleFlights.map((flight) => ({
    ...flight,
    totalPrice: flight.price * Number(passengers.value),
  }))
})

function searchFlights() {
  errorMessage.value = ''
  searched.value = false

  if (!origin.value || !destination.value || !departureDate.value) {
    errorMessage.value = 'Lengkapi kota asal, tujuan, dan tanggal keberangkatan.'
    return
  }

  if (origin.value === destination.value) {
    errorMessage.value = 'Kota asal dan tujuan tidak boleh sama.'
    return
  }

  if (departureDate.value < today) {
    errorMessage.value = 'Tanggal keberangkatan tidak boleh di masa lalu.'
    return
  }

  if (returnDate.value && returnDate.value < departureDate.value) {
    errorMessage.value = 'Tanggal pulang tidak boleh sebelum keberangkatan.'
    return
  }

  searched.value = true
}

function selectFlight(flight) {
  const selectedFlight = {
    ...flight,
    origin: origin.value,
    destination: destination.value,
    departureDate: departureDate.value,
    returnDate: returnDate.value,
    passengers: Number(passengers.value),
  }

  localStorage.setItem('tripmate-selected-flight', JSON.stringify(selectedFlight))

  router.push('/flight-details')
}
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-6xl">
      <div class="mb-8 text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          Temukan penerbanganmu
        </p>

        <h1 class="mt-2 text-3xl font-bold text-[#263951] sm:text-4xl">Cari Tiket Pesawat</h1>

        <p class="mt-3 text-[#52657d]">
          Temukan pilihan penerbangan untuk perjalananmu berikutnya.
        </p>
      </div>

      <section class="rounded-3xl bg-[#f5f9ff] p-5 shadow-sm sm:p-8">
        <form class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" @submit.prevent="searchFlights">
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-[#263951]"> Kota asal </span>

            <select
              v-model="origin"
              required
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            >
              <option value="" disabled>Pilih kota asal</option>
              <option value="Jakarta">Jakarta</option>
              <option value="Balikpapan">Balikpapan</option>
              <option value="Surabaya">Surabaya</option>
              <option value="Denpasar">Denpasar</option>
              <option value="Yogyakarta">Yogyakarta</option>
              <option value="Makassar">Makassar</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-[#263951]"> Kota tujuan </span>

            <select
              v-model="destination"
              required
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            >
              <option value="" disabled>Pilih kota tujuan</option>
              <option value="Jakarta">Jakarta</option>
              <option value="Balikpapan">Balikpapan</option>
              <option value="Surabaya">Surabaya</option>
              <option value="Denpasar">Denpasar</option>
              <option value="Yogyakarta">Yogyakarta</option>
              <option value="Makassar">Makassar</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-[#263951]"> Berangkat </span>

            <input
              v-model="departureDate"
              type="date"
              :min="today"
              required
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-[#263951]"> Pulang (opsional) </span>

            <input
              v-model="returnDate"
              type="date"
              :min="departureDate || today"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-[#263951]"> Jumlah penumpang </span>

            <select
              v-model.number="passengers"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            >
              <option :value="1">1 penumpang</option>
              <option :value="2">2 penumpang</option>
              <option :value="3">3 penumpang</option>
              <option :value="4">4 penumpang</option>
              <option :value="5">5 penumpang</option>
            </select>
          </label>

          <div class="flex items-end">
            <button
              type="submit"
              class="w-full rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Cari Penerbangan
            </button>
          </div>
        </form>

        <p
          v-if="errorMessage"
          class="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {{ errorMessage }}
        </p>
      </section>

      <section v-if="searched" class="mt-8">
        <div class="mb-5">
          <h2 class="text-2xl font-bold text-[#263951]">Hasil Pencarian</h2>

          <p class="mt-2 text-sm text-[#52657d]">
            {{ origin }} → {{ destination }} · {{ departureDate }} · {{ passengers }} penumpang
          </p>

          <p class="mt-1 text-xs text-[#52657d]">
            Contoh data untuk pengujian, bukan jadwal atau harga aktual.
          </p>
        </div>

        <div class="space-y-4">
          <article
            v-for="flight in filteredFlights"
            :key="flight.code"
            class="flex flex-col justify-between gap-5 rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:flex-row sm:items-center"
          >
            <div>
              <p class="font-bold text-[#263951]">
                {{ flight.airline }}
              </p>
              <p class="mt-1 text-sm text-slate-500">
                {{ flight.code }}
              </p>
            </div>

            <div class="flex items-center gap-4">
              <div>
                <p class="text-xl font-bold text-[#263951]">
                  {{ flight.departure }}
                </p>
                <p class="text-xs text-slate-500">{{ origin }}</p>
              </div>

              <div class="text-center text-xs text-slate-500">
                <span>✈</span>
                <div class="my-1 h-px w-12 bg-blue-300"></div>
                Langsung
              </div>

              <div>
                <p class="text-xl font-bold text-[#263951]">
                  {{ flight.arrival }}
                </p>
                <p class="text-xs text-slate-500">{{ destination }}</p>
              </div>
            </div>

            <div class="sm:text-right">
              <p class="text-xs text-slate-500">Total untuk {{ passengers }} penumpang</p>

              <p class="mt-1 text-xl font-bold text-[#347bd0]">
                {{
                  flight.totalPrice.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  })
                }}
              </p>

              <button
                type="button"
                class="mt-3 rounded-lg bg-[#347bd0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                @click="selectFlight(flight)"
              >
                Pilih Penerbangan
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>
