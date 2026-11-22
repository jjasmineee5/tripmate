<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const bookings = ref([])
const errorMessage = ref('')
const currentUser = ref(null)
const loading = ref(false)
const expandedBooking = ref(null)

const sortedBookings = computed(() => {
  return [...bookings.value].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  )
})

function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(price) || 0)
}

function formatDate(date) {
  if (!date) return '-'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return date

  return parsedDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(date) {
  if (!date) return '-'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return date

  return parsedDate.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function loadBookings() {
  errorMessage.value = ''
  bookings.value = []
  expandedBooking.value = null
  loading.value = true

  const token = localStorage.getItem('tripmate-token')
  const savedUser = localStorage.getItem('tripmate-current-user')

  if (!token) {
    loading.value = false
    router.replace('/login')
    return
  }

  if (savedUser) {
    try {
      currentUser.value = JSON.parse(savedUser)
    } catch {
      currentUser.value = null
    }
  }

  try {
    const response = await fetch('http://localhost:3000/api/history', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      errorMessage.value = result.message || 'Gagal mengambil riwayat pemesanan.'
      return
    }

    bookings.value = (result.data || []).map((item) => ({
      id: item.kode_pemesanan,
      bookingId: item.id_pemesanan,
      status: item.status,
      createdAt: item.tanggal_pemesanan,

      contact: {
        fullName: item.nama_penumpang || '-',
      },

      passengerNames: item.nama_penumpang ? item.nama_penumpang.split(', ') : [],

      flight: {
        airline: item.maskapai,
        code: item.kode_penerbangan,
        origin: item.bandara_keberangkatan,
        destination: item.bandara_kedatangan,
        departureDate: item.waktu_keberangkatan,
        arrivalDate: item.waktu_kedatangan,
        duration: item.durasi,
        totalPrice: item.total_harga,
        price: item.harga,
        currency: item.kode_mata_uang,
      },
    }))
  } catch (error) {
    console.error('History error:', error)
    errorMessage.value = 'Tidak dapat terhubung ke server.'
  } finally {
    loading.value = false
  }
}

function openBooking(bookingId) {
  expandedBooking.value = expandedBooking.value === bookingId ? null : bookingId
}

onMounted(loadBookings)
</script>

<template>
  <main class="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-5xl">
      <!-- HEADER -->
      <div class="mb-8">
        <p class="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">TripMate</p>

        <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">Informasi Pemesanan</h1>

        <p class="mt-3 text-slate-600">
          Lihat kembali riwayat tiket penerbangan yang sudah kamu pesan.
        </p>
      </div>

      <!-- ERROR -->
      <div
        v-if="errorMessage"
        class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <!-- LOADING -->
      <div
        v-else-if="loading"
        class="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm"
      >
        <div class="mb-4 text-4xl">✈️</div>

        <h2 class="text-xl font-bold text-slate-900">Memuat Riwayat Pemesanan</h2>

        <p class="mt-2 text-sm text-slate-500">Sedang mengambil data pemesanan kamu.</p>
      </div>

      <!-- EMPTY -->
      <div
        v-else-if="sortedBookings.length === 0"
        class="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm"
      >
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl"
        >
          ✈️
        </div>

        <h2 class="text-xl font-bold text-slate-900">Belum Ada Pemesanan</h2>

        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Belum ada pemesanan yang tercatat untuk akun kamu. Pemesanan baru akan muncul di halaman
          ini setelah berhasil dibuat.
        </p>

        <button
          type="button"
          class="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          @click="router.push('/flights')"
        >
          Cari Tiket Penerbangan
        </button>

        <button
          type="button"
          class="ml-3 mt-3 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          @click="loadBookings"
        >
          Muat Ulang
        </button>
      </div>

      <!-- BOOKING LIST -->
      <div v-else class="space-y-5">
        <!-- TOTAL & RELOAD -->
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-slate-600">
            Total pemesanan:
            <span class="font-bold text-slate-900">
              {{ sortedBookings.length }}
            </span>
          </p>

          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            @click="loadBookings"
          >
            Muat Ulang
          </button>
        </div>

        <!-- BOOKING CARD -->
        <article
          v-for="booking in sortedBookings"
          :key="booking.bookingId"
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <!-- CARD HEADER -->
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"
          >
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
                Kode Pemesanan
              </p>

              <p class="mt-1 font-bold text-slate-900">
                {{ booking.id || 'Tidak tersedia' }}
              </p>
            </div>

            <span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {{ booking.status || 'Simulasi' }}
            </span>
          </div>

          <!-- CARD SUMMARY -->
          <div class="p-5 sm:p-6">
            <div class="mb-5">
              <p class="text-lg font-bold text-slate-900">
                {{ booking.flight?.airline || 'Penerbangan' }}
              </p>

              <p class="mt-1 text-sm text-slate-500">
                {{ booking.flight?.code || '-' }}
              </p>
            </div>

            <!-- SUMMARY GRID -->
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <p class="text-xs text-slate-500">Kota Asal</p>

                <p class="mt-1 font-semibold text-slate-900">
                  {{ booking.flight?.origin || '-' }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Kota Tujuan</p>

                <p class="mt-1 font-semibold text-slate-900">
                  {{ booking.flight?.destination || '-' }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Tanggal Berangkat</p>

                <p class="mt-1 font-semibold text-slate-900">
                  {{ formatDate(booking.flight?.departureDate) }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Nama Penumpang</p>

                <p class="mt-1 font-semibold text-slate-900">
                  {{ booking.contact?.fullName || '-' }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Jumlah Penumpang</p>

                <p class="mt-1 font-semibold text-slate-900">
                  {{ booking.passengerNames?.length || 1 }}
                  orang
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Total Harga</p>

                <p class="mt-1 font-bold text-blue-700">
                  {{ formatPrice(booking.flight?.totalPrice) }}
                </p>
              </div>
            </div>

            <!-- BUTTON -->
            <div
              class="mt-6 flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"
            >
              <p class="text-xs leading-5 text-slate-500">
                Dibuat:
                {{ formatDateTime(booking.createdAt) }}
              </p>

              <button
                type="button"
                class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                @click="openBooking(booking.bookingId)"
              >
                {{
                  expandedBooking === booking.bookingId ? 'Tutup Detail' : 'Lihat Detail Pemesanan'
                }}
              </button>
            </div>

            <!-- EXPANDED DETAIL -->
            <div
              v-if="expandedBooking === booking.bookingId"
              class="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-5"
            >
              <h2 class="mb-5 text-lg font-bold text-slate-900">Detail Pemesanan</h2>

              <!-- BOOKING INFO -->
              <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p class="text-xs text-slate-500">Kode Pemesanan</p>

                  <p class="mt-1 font-semibold text-slate-900">
                    {{ booking.id || '-' }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-slate-500">Status Pemesanan</p>

                  <p class="mt-1 font-semibold text-amber-700">
                    {{ booking.status || 'Simulasi' }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-slate-500">Tanggal Pemesanan</p>

                  <p class="mt-1 font-semibold text-slate-900">
                    {{ formatDateTime(booking.createdAt) }}
                  </p>
                </div>
              </div>

              <!-- FLIGHT INFO -->
              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <h3 class="mb-4 font-bold text-slate-900">✈️ Informasi Penerbangan</h3>

                <div class="mb-4">
                  <p class="text-sm font-bold text-slate-900">
                    {{ booking.flight?.airline || '-' }}
                  </p>

                  <p class="text-sm text-slate-500">
                    Nomor penerbangan:
                    {{ booking.flight?.code || '-' }}
                  </p>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p class="text-xs text-slate-500">Bandara Keberangkatan</p>

                    <p class="mt-1 font-semibold text-slate-900">
                      {{ booking.flight?.origin || '-' }}
                    </p>

                    <p class="mt-2 text-xs text-slate-500">Waktu Keberangkatan</p>

                    <p class="mt-1 font-medium text-slate-900">
                      {{ formatDateTime(booking.flight?.departureDate) }}
                    </p>
                  </div>

                  <div>
                    <p class="text-xs text-slate-500">Bandara Kedatangan</p>

                    <p class="mt-1 font-semibold text-slate-900">
                      {{ booking.flight?.destination || '-' }}
                    </p>

                    <p class="mt-2 text-xs text-slate-500">Waktu Kedatangan</p>

                    <p class="mt-1 font-medium text-slate-900">
                      {{ formatDateTime(booking.flight?.arrivalDate) }}
                    </p>
                  </div>
                </div>

                <div class="mt-4">
                  <p class="text-xs text-slate-500">Durasi Penerbangan</p>

                  <p class="mt-1 font-medium text-slate-900">
                    {{ booking.flight?.duration || '-' }}
                  </p>
                </div>
              </div>

              <!-- PASSENGERS -->
              <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <h3 class="mb-3 font-bold text-slate-900">👤 Informasi Penumpang</h3>

                <p class="mb-3 text-sm text-slate-500">
                  Jumlah penumpang:
                  <span class="font-semibold text-slate-900">
                    {{ booking.passengerNames?.length || 1 }} orang
                  </span>
                </p>

                <div
                  v-for="(name, index) in booking.passengerNames"
                  :key="index"
                  class="mb-2 flex items-center gap-3 rounded-lg bg-slate-50 p-3 last:mb-0"
                >
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700"
                  >
                    {{ index + 1 }}
                  </div>

                  <div>
                    <p class="text-xs text-slate-500">Penumpang {{ index + 1 }}</p>

                    <p class="font-semibold text-slate-900">
                      {{ name }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- PRICE -->
              <div
                class="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p class="text-sm text-slate-500">Total Harga Pemesanan</p>

                  <p class="mt-1 text-xs text-slate-400">Harga tercatat pada pemesanan</p>
                </div>

                <p class="text-lg font-bold text-blue-700">
                  {{ formatPrice(booking.flight?.totalPrice) }}
                </p>
              </div>

              <p class="mt-4 text-xs leading-5 text-slate-500">
                Data detail ini ditampilkan berdasarkan informasi pemesanan yang tersimpan dan
                diterima dari server TripMate.
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>
