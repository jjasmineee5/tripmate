<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const flight = ref(null)
const fullName = ref('')
const email = ref('')
const phone = ref('')
const errorMessage = ref('')
const tripLoadError = ref('')

const currentUser = ref(null)
const trips = ref([])
const selectedTripId = ref('')
const loadingTrips = ref(false)

try {
  const savedUser = localStorage.getItem('tripmate-current-user')

  if (savedUser) {
    currentUser.value = JSON.parse(savedUser)
  }

  const savedFlight = localStorage.getItem('tripmate-selected-flight')

  if (savedFlight) {
    flight.value = JSON.parse(savedFlight)
  }
} catch {
  flight.value = null
  currentUser.value = null
}

const passengerNames = ref(
  Array.from({ length: Math.max(1, Number(flight.value?.passengers) || 1) }, () => ''),
)

const formattedPrice = computed(() => {
  if (!flight.value) return ''

  return Number(flight.value.totalPrice || 0).toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
})

async function loadTrips() {
  loadingTrips.value = true
  tripLoadError.value = ''

  try {
    const token = localStorage.getItem('tripmate-token')

    if (!token) {
      tripLoadError.value = 'Token login tidak ditemukan. Silakan login kembali.'
      return
    }

    const response = await fetch('http://localhost:3000/api/perjalanan', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengambil daftar perjalanan.')
    }

    const tripData = Array.isArray(result)
      ? result
      : Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.perjalanan)
          ? result.perjalanan
          : []

    trips.value = tripData
  } catch (error) {
    tripLoadError.value = error.message || 'Gagal mengambil daftar perjalanan.'
    trips.value = []
  } finally {
    loadingTrips.value = false
  }
}

onMounted(loadTrips)

async function submitBooking() {
  errorMessage.value = ''

  if (!currentUser.value?.id && !currentUser.value?.email) {
    errorMessage.value = 'Sesi login tidak ditemukan. Silakan login kembali sebelum memesan tiket.'
    return
  }

  if (!flight.value) {
    errorMessage.value = 'Data penerbangan tidak ditemukan. Silakan pilih penerbangan lagi.'
    return
  }

  if (!fullName.value.trim() || !email.value.trim() || !phone.value.trim()) {
    errorMessage.value = 'Nama, email, dan nomor telepon wajib diisi.'
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errorMessage.value = 'Masukkan alamat email yang valid.'
    return
  }

  if (!/^[0-9+\-\s()]{8,20}$/.test(phone.value.trim())) {
    errorMessage.value = 'Periksa kembali nomor telepon kamu.'
    return
  }

  if (passengerNames.value.some((name) => !name.trim())) {
    errorMessage.value = 'Nama seluruh penumpang wajib diisi.'
    return
  }

  // Perjalanan bersifat opsional
  const selectedTrip = selectedTripId.value
    ? trips.value.find((trip) => String(trip.id_perjalanan) === String(selectedTripId.value))
    : null

  // Validasi hanya jika pengguna memilih perjalanan
  if (selectedTripId.value && !selectedTrip) {
    errorMessage.value = 'Perjalanan yang dipilih tidak ditemukan. Silakan pilih kembali.'
    return
  }

  try {
    const token = localStorage.getItem('tripmate-token')

    if (!token) {
      errorMessage.value = 'Token login tidak ditemukan. Silakan login kembali.'
      return
    }

    const response = await fetch('http://localhost:3000/api/booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tripId: selectedTrip ? selectedTrip.id_perjalanan : null,
        contact: {
          fullName: fullName.value.trim(),
          email: email.value.trim(),
          phone: phone.value.trim(),
        },
        passengerNames: passengerNames.value.map((name) => name.trim()),
        flight: flight.value,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Pemesanan gagal disimpan.')
    }

    const booking = {
      id: result.data.kode_pemesanan,
      databaseId: result.data.id_pemesanan,
      userId: currentUser.value.id || null,
      userEmail: String(currentUser.value.email || '')
        .trim()
        .toLowerCase(),
      tripId: selectedTrip?.id_perjalanan ?? null,
      tripTitle: selectedTrip?.judul ?? null,
      status: 'Simulasi',
      createdAt: new Date().toISOString(),
      contact: {
        fullName: fullName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
      },
      passengerNames: passengerNames.value.map((name) => name.trim()),
      flight: flight.value,
    }

    const savedBookings = JSON.parse(localStorage.getItem('tripmate-bookings') || '[]')

    savedBookings.push(booking)

    localStorage.setItem('tripmate-bookings', JSON.stringify(savedBookings))
    localStorage.setItem('tripmate-latest-booking', JSON.stringify(booking))

    router.push('/booking-confirmation')
  } catch (error) {
    errorMessage.value = error.message || 'Pemesanan gagal. Periksa koneksi backend kamu.'
  }
}

function backToDetails() {
  router.push('/flight-details')
}
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-4xl">
      <button
        type="button"
        class="mb-6 font-semibold text-[#347bd0] hover:underline"
        @click="backToDetails"
      >
        ← Kembali ke detail penerbangan
      </button>

      <div class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          TripMate · Pemesanan
        </p>

        <h1 class="mt-2 text-3xl font-bold text-[#263951] sm:text-4xl">Form Pemesanan</h1>

        <p class="mt-3 text-[#52657d]">
          Isi data kontak, opsional pilih perjalanan, dan nama penumpang sebelum melanjutkan.
        </p>
      </div>

      <div v-if="!flight" class="rounded-3xl bg-[#f5f9ff] p-8 text-center shadow-sm">
        <h2 class="text-xl font-bold text-[#263951]">Data penerbangan belum tersedia</h2>

        <p class="mt-3 text-[#52657d]">Pilih penerbangan terlebih dahulu sebelum mengisi form.</p>

        <button
          type="button"
          class="mt-6 rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white"
          @click="router.push('/flights')"
        >
          Cari Penerbangan
        </button>
      </div>

      <section v-else class="rounded-3xl bg-[#f5f9ff] p-6 shadow-sm sm:p-8">
        <h2 class="text-xl font-bold text-[#263951]">Ringkasan Penerbangan</h2>

        <!-- Penerbangan pergi -->
        <div class="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div class="flex flex-wrap justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-blue-700">
                Penerbangan pergi
              </p>
              <p class="mt-2 font-bold text-[#263951]">
                {{ flight.outboundFlight?.airline || flight.airline }}
              </p>
              <p class="mt-1 text-sm text-slate-500">
                {{ flight.outboundFlight?.code || flight.code }}
              </p>
            </div>
            <p class="text-sm font-semibold text-[#347bd0]">
              {{ flight.outboundFlight?.departureDate || flight.departureDate }}
            </p>
          </div>

          <div class="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p class="text-xl font-bold text-[#263951]">
                {{ flight.outboundFlight?.departure || flight.departure }}
              </p>
              <p class="text-sm text-slate-500">
                {{ flight.outboundFlight?.origin || flight.origin }}
              </p>
            </div>

            <span class="text-xl text-[#347bd0]">→</span>

            <div class="text-right">
              <p class="text-xl font-bold text-[#263951]">
                {{ flight.outboundFlight?.arrival || flight.arrival }}
              </p>
              <p class="text-sm text-slate-500">
                {{ flight.outboundFlight?.destination || flight.destination }}
              </p>
            </div>
          </div>

          <div class="mt-5 border-t border-slate-200 pt-4">
            <p class="text-sm text-slate-500">{{ flight.passengers }} penumpang</p>
            <p class="mt-1 font-semibold text-[#347bd0]">
              Harga pergi:
              {{
                Number(
                  flight.outboundPrice ??
                    flight.outboundFlight?.totalPrice ??
                    flight.totalPrice ??
                    0,
                ).toLocaleString('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                })
              }}
            </p>
          </div>
        </div>

        <!-- Penerbangan pulang (hanya tampil jika tiket pulang-pergi dipilih) -->
        <div
          v-if="flight.returnFlight"
          class="mt-5 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div class="flex flex-wrap justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Penerbangan pulang
              </p>
              <p class="mt-2 font-bold text-[#263951]">{{ flight.returnFlight.airline }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ flight.returnFlight.code }}</p>
            </div>
            <p class="text-sm font-semibold text-emerald-700">
              {{ flight.returnFlight.departureDate || flight.returnDate }}
            </p>
          </div>

          <div class="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p class="text-xl font-bold text-[#263951]">{{ flight.returnFlight.departure }}</p>
              <p class="text-sm text-slate-500">{{ flight.returnFlight.origin }}</p>
            </div>

            <span class="text-xl text-emerald-700">→</span>

            <div class="text-right">
              <p class="text-xl font-bold text-[#263951]">{{ flight.returnFlight.arrival }}</p>
              <p class="text-sm text-slate-500">{{ flight.returnFlight.destination }}</p>
            </div>
          </div>

          <div class="mt-5 border-t border-slate-200 pt-4">
            <p class="font-semibold text-emerald-700">
              Harga pulang:
              {{
                Number(flight.returnPrice ?? flight.returnFlight?.totalPrice ?? 0).toLocaleString(
                  'id-ID',
                  { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 },
                )
              }}
            </p>
          </div>
        </div>

        <!-- Total harga -->
        <div class="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div class="flex items-center justify-between gap-4">
            <span class="font-semibold text-[#263951]">Total harga simulasi</span>
            <span class="text-xl font-bold text-[#347bd0]">{{ formattedPrice }}</span>
          </div>
        </div>

        <form class="mt-8 space-y-6" @submit.prevent="submitBooking">
          <section>
            <h2 class="text-lg font-bold text-[#263951]">Perjalanan yang Dikaitkan (Opsional)</h2>

            <p class="mt-1 text-sm text-[#52657d]">
              Kamu bisa mengaitkan tiket ini dengan perjalanan yang sudah dibuat, atau memesan tiket
              tanpa mengaitkan perjalanan.
            </p>

            <div v-if="loadingTrips" class="mt-4 text-sm text-slate-500">
              Memuat daftar perjalanan...
            </div>

            <div
              v-if="tripLoadError"
              class="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
            >
              {{ tripLoadError }} Kamu tetap bisa memesan tanpa mengaitkan perjalanan.
            </div>

            <label class="mt-4 block">
              <span class="mb-2 block text-sm font-semibold text-[#263951]">
                Pilih perjalanan
              </span>

              <select
                v-model="selectedTripId"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
              >
                <option value="">Tidak ada perjalanan yang dikaitkan</option>

                <option
                  v-for="trip in trips"
                  :key="trip.id_perjalanan"
                  :value="String(trip.id_perjalanan)"
                >
                  {{ trip.judul }} — {{ trip.tujuan_perjalanan }}
                </option>
              </select>
            </label>

            <p
              v-if="!loadingTrips && trips.length === 0 && !tripLoadError"
              class="mt-3 text-sm text-slate-500"
            >
              Belum ada perjalanan. Kamu tetap bisa memesan tiket tanpa mengaitkan perjalanan.
            </p>
          </section>

          <section>
            <h2 class="text-lg font-bold text-[#263951]">Informasi Kontak</h2>

            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <label class="block sm:col-span-2">
                <span class="mb-2 block text-sm font-semibold text-[#263951]">
                  Nama lengkap pemesan
                </span>

                <input
                  v-model="fullName"
                  type="text"
                  autocomplete="name"
                  required
                  maxlength="100"
                  placeholder="Masukkan nama lengkap"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-[#263951]"> Email </span>

                <input
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  required
                  maxlength="150"
                  placeholder="nama@email.com"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-[#263951]"> Nomor telepon </span>

                <input
                  v-model="phone"
                  type="tel"
                  autocomplete="tel"
                  required
                  maxlength="20"
                  placeholder="Contoh: 081234567890"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
                />
              </label>
            </div>
          </section>

          <section>
            <h2 class="text-lg font-bold text-[#263951]">Data Penumpang</h2>

            <p class="mt-1 text-sm text-[#52657d]">Masukkan nama setiap penumpang.</p>

            <div class="mt-4 space-y-4">
              <label v-for="(_, index) in passengerNames" :key="index" class="block">
                <span class="mb-2 block text-sm font-semibold text-[#263951]">
                  Penumpang {{ index + 1 }}
                </span>

                <input
                  v-model="passengerNames[index]"
                  type="text"
                  required
                  maxlength="100"
                  :placeholder="`Nama penumpang ${index + 1}`"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
                />
              </label>
            </div>
          </section>

          <p v-if="errorMessage" role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {{ errorMessage }}
          </p>

          <p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Pemesanan ini masih simulasi. Tidak ada tiket yang diterbitkan dan tidak ada pembayaran
            yang diproses.
          </p>

          <button
            type="submit"
            :disabled="loadingTrips"
            class="w-full rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Konfirmasi Data Pemesanan
          </button>
        </form>
      </section>
    </section>
  </main>
</template>
