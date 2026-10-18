<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const bookings = ref([])
const errorMessage = ref('')
const currentUser = ref(null)

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

  const parsedDate = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) return date

  return parsedDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function loadBookings() {
  errorMessage.value = ''
  bookings.value = []

  try {
    const savedUser = localStorage.getItem('tripmate-current-user')

    if (!savedUser) {
      currentUser.value = null
      router.replace('/login')
      return
    }

    currentUser.value = JSON.parse(savedUser)

    const userId = currentUser.value?.id
    const userEmail = String(currentUser.value?.email || '')
      .trim()
      .toLowerCase()

    if (!userId && !userEmail) {
      errorMessage.value = 'Identitas akun tidak tersedia. Silakan login kembali.'
      return
    }

    const savedBookings = JSON.parse(localStorage.getItem('tripmate-bookings') || '[]')

    if (!Array.isArray(savedBookings)) {
      errorMessage.value = 'Data pemesanan tidak dapat dibaca.'
      return
    }

    // Hanya tampilkan booking yang identitas pemiliknya cocok
    // dengan pengguna yang sedang login.
    bookings.value = savedBookings.filter((booking) => {
      const sameUserId =
        userId != null && booking.userId != null && String(booking.userId) === String(userId)

      const bookingEmail = String(booking.userEmail || '')
        .trim()
        .toLowerCase()

      const sameUserEmail = userEmail !== '' && bookingEmail === userEmail

      return sameUserId || sameUserEmail
    })
  } catch {
    bookings.value = []
    errorMessage.value = 'Terjadi kesalahan saat membaca data pengguna atau pemesanan.'
  }
}

function openBooking(booking) {
  // Simpan booking yang dipilih agar halaman konfirmasi
  // menampilkan detail booking yang benar.
  localStorage.setItem('tripmate-latest-booking', JSON.stringify(booking))

  router.push('/booking-confirmation')
}

onMounted(loadBookings)
</script>

<template>
  <main class="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-5xl">
      <div class="mb-8">
        <p class="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">TripMate</p>

        <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">Informasi Pemesanan</h1>

        <p class="mt-3 text-slate-600">
          Lihat kembali riwayat tiket penerbangan yang sudah kamu pesan.
        </p>
      </div>

      <div
        v-if="errorMessage"
        class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

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

      <div v-else class="space-y-5">
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

        <article
          v-for="booking in sortedBookings"
          :key="booking.id"
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
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

          <div class="p-5 sm:p-6">
            <div class="mb-5">
              <p class="text-lg font-bold text-slate-900">
                {{ booking.flight?.airline || 'Penerbangan' }}
              </p>

              <p class="mt-1 text-sm text-slate-500">
                {{ booking.flight?.code || '-' }}
              </p>
            </div>

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
                <p class="text-xs text-slate-500">Nama Pemesan</p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{ booking.contact?.fullName || '-' }}
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Jumlah Penumpang</p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{ booking.passengerNames?.length || booking.flight?.passengers || 1 }}
                  orang
                </p>
              </div>

              <div>
                <p class="text-xs text-slate-500">Total Harga</p>
                <p class="mt-1 font-bold text-blue-700">
                  {{ formatPrice(booking.flight?.totalPrice ?? booking.flight?.price) }}
                </p>
              </div>
            </div>

            <div
              class="mt-6 flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"
            >
              <p class="text-xs leading-5 text-slate-500">
                Dibuat:
                {{ booking.createdAt ? new Date(booking.createdAt).toLocaleString('id-ID') : '-' }}
              </p>

              <button
                type="button"
                class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                @click="openBooking(booking)"
              >
                Lihat Detail Pemesanan
              </button>
            </div>
          </div>
        </article>

        <p class="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          Catatan: riwayat pemesanan pada prototipe ini disimpan di browser menggunakan localStorage
          dan belum terhubung ke database atau API penerbangan.
        </p>
      </div>
    </div>
  </main>
</template>
