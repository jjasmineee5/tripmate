<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const booking = ref(null)
const errorMessage = ref('')

try {
  const savedBooking = localStorage.getItem('tripmate-latest-booking')

  if (savedBooking) {
    booking.value = JSON.parse(savedBooking)

    if (!booking.value?.flight) {
      booking.value = null
      errorMessage.value = 'Data penerbangan pada pemesanan tidak tersedia.'
    } else {
      // Pastikan booking terbaru juga tersedia di daftar pemesanan.
      const savedBookings = JSON.parse(localStorage.getItem('tripmate-bookings') || '[]')

      if (!Array.isArray(savedBookings)) {
        throw new Error('Format data pemesanan tidak valid.')
      }

      const bookingExists = savedBookings.some((item) => item.id && item.id === booking.value.id)

      if (!bookingExists) {
        savedBookings.push(booking.value)
        localStorage.setItem('tripmate-bookings', JSON.stringify(savedBookings))
      }
    }
  } else {
    errorMessage.value = 'Data pemesanan belum tersedia.'
  }
} catch {
  errorMessage.value = 'Data pemesanan tidak dapat dibaca. Silakan periksa kembali pemesanan kamu.'
}

const flight = computed(() => booking.value?.flight || null)

const formattedPrice = computed(() => {
  const price = Number(flight.value?.totalPrice || 0)

  return price.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
})

function formatDate(value) {
  if (!value) return 'Belum ditentukan'

  const date = new Date(`${value}T12:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function goToFlights() {
  router.push('/flights')
}

function goToHome() {
  router.push('/')
}

function goToBookings() {
  router.push('/bookings')
}

function createItinerary() {
  if (!booking.value || !flight.value) return

  const outbound = flight.value.outboundFlight || flight.value
  const returnFlight = flight.value.returnFlight || null

  const selectedFlight = {
    ...flight.value,
    outboundFlight: outbound,
    returnFlight,
    origin: outbound.origin || flight.value.origin || '',
    destination: outbound.destination || flight.value.destination || '',
    departureDate: outbound.departureDate || flight.value.departureDate || '',
    returnDate: returnFlight?.departureDate || flight.value.returnDate || '',
    totalPrice: Number(flight.value.totalPrice) || 0,
    passengers: Number(flight.value.passengers) || booking.value.passengerNames?.length || 1,
    selectedAt: new Date().toISOString(),
    sourceBookingId: booking.value.id || '',
  }

  localStorage.setItem('tripmate-selected-flight', JSON.stringify(selectedFlight))

  const startDate = selectedFlight.departureDate
  const endDate = selectedFlight.returnDate || ''

  router.push({
    path: '/itinerary',
    query: {
      fromBooking: 'true',
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    },
  })
}
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-2xl">
      <div class="rounded-3xl bg-[#f5f9ff] p-6 text-center shadow-sm sm:p-10">
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700"
        >
          ✓
        </div>

        <template v-if="booking">
          <p class="mt-5 text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
            TripMate · Konfirmasi
          </p>

          <h1 class="mt-2 text-3xl font-bold text-[#263951]">Pemesanan Berhasil Dicatat!</h1>

          <p class="mt-3 text-[#52657d]">Data pemesanan simulasi kamu berhasil disimpan.</p>

          <div class="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-left">
            <p class="text-sm text-slate-500">Kode booking simulasi</p>
            <p class="mt-1 text-2xl font-bold text-[#347bd0]">
              {{ booking.id || '-' }}
            </p>

            <div class="mt-5 space-y-4">
              <div>
                <p class="text-sm text-slate-500">Nama pemesan</p>
                <p class="font-semibold text-[#263951]">
                  {{ booking.contact?.fullName || '-' }}
                </p>
              </div>

              <div>
                <p class="text-sm text-slate-500">Email</p>
                <p class="font-semibold text-[#263951]">
                  {{ booking.contact?.email || '-' }}
                </p>
              </div>

              <div>
                <p class="text-sm text-slate-500">Penerbangan pergi</p>
                <p class="font-semibold text-[#263951]">
                  {{ flight.airline || 'Penerbangan' }}
                  ({{ flight.code || '-' }})
                </p>
                <p class="mt-1 text-sm text-slate-600">
                  {{ flight.origin || '-' }} →
                  {{ flight.destination || '-' }}
                </p>
                <p class="mt-1 text-sm text-slate-600">
                  {{ formatDate(flight.departureDate) }} ·
                  {{ flight.departure || 'Jam tidak tersedia' }}–{{
                    flight.arrival || 'Jam tidak tersedia'
                  }}
                </p>
              </div>

              <div v-if="flight.returnFlight">
                <p class="text-sm text-slate-500">Penerbangan pulang</p>
                <p class="font-semibold text-[#263951]">
                  {{ flight.returnFlight.airline }}
                  ({{ flight.returnFlight.code || '-' }})
                </p>
                <p class="mt-1 text-sm text-slate-600">
                  {{ flight.returnFlight.origin || '-' }} →
                  {{ flight.returnFlight.destination || '-' }}
                </p>
                <p class="mt-1 text-sm text-slate-600">
                  {{ formatDate(flight.returnFlight.departureDate) }} ·
                  {{ flight.returnFlight.departure || 'Jam tidak tersedia' }}–{{
                    flight.returnFlight.arrival || 'Jam tidak tersedia'
                  }}
                </p>
              </div>

              <div>
                <p class="text-sm text-slate-500">Jumlah penumpang</p>
                <p class="font-semibold text-[#263951]">
                  {{ booking.passengerNames?.length || flight.passengers || 1 }}
                  orang
                </p>
              </div>

              <div v-if="booking.passengerNames?.length">
                <p class="text-sm text-slate-500">Nama penumpang</p>
                <ul class="list-inside list-disc text-[#263951]">
                  <li v-for="(name, index) in booking.passengerNames" :key="index">
                    {{ name }}
                  </li>
                </ul>
              </div>

              <div class="border-t border-slate-200 pt-4">
                <p class="text-sm text-slate-500">Total harga simulasi</p>
                <p class="mt-1 text-2xl font-bold text-[#347bd0]">
                  {{ formattedPrice }}
                </p>
              </div>
            </div>
          </div>

          <p class="mt-5 rounded-xl bg-amber-50 p-4 text-left text-sm text-amber-800">
            Ini adalah pemesanan simulasi, bukan tiket pesawat sungguhan. Belum ada pembayaran atau
            penerbitan tiket aktual.
          </p>

          <button
            type="button"
            class="mt-6 w-full rounded-xl border border-[#347bd0] bg-white px-6 py-3 font-semibold text-[#347bd0] transition hover:bg-blue-50"
            @click="goToBookings"
          >
            Lihat Informasi Pemesanan
          </button>

          <button
            type="button"
            class="mt-3 w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
            @click="createItinerary"
          >
            ✨ Buat Itinerary dari Tiket Ini
          </button>

          <button
            type="button"
            class="mt-3 w-full rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            @click="goToFlights"
          >
            Cari Penerbangan Lagi
          </button>
        </template>

        <template v-else>
          <h1 class="mt-5 text-2xl font-bold text-[#263951]">Konfirmasi Belum Tersedia</h1>

          <p class="mt-3 text-[#52657d]">
            {{ errorMessage }}
          </p>

          <button
            type="button"
            class="mt-6 w-full rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white hover:bg-blue-700"
            @click="goToFlights"
          >
            Kembali ke Pencarian
          </button>
        </template>

        <button
          type="button"
          class="mt-4 font-semibold text-[#347bd0] hover:underline"
          @click="goToHome"
        >
          Kembali ke Beranda
        </button>
      </div>
    </section>
  </main>
</template>
