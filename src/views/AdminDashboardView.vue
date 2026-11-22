<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const users = ref([])
const destinations = ref([])
const bookings = ref([])

const activeTab = ref('users')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const showDestinationForm = ref(false)
const editingDestinationId = ref(null)
const savingDestination = ref(false)

const destinationForm = ref({
  nama: '',
  negara: '',
  kota: '',
  deskripsi: '',
  tautan_gambar: '',
})

const stats = computed(() => ({
  users: users.value.length,
  destinations: destinations.value.length,
  bookings: bookings.value.length,
}))

function getToken() {
  return localStorage.getItem('tripmate-token')
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  }
}

// Mengambil data dari backend
async function fetchData(endpoint) {
  const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
    headers: authHeaders(),
  })

  const result = await response.json()

  if (response.status === 401 || response.status === 403) {
    throw new Error('Sesi admin tidak valid atau akses ditolak. Silakan login kembali.')
  }

  if (!response.ok) {
    throw new Error(result.message || 'Gagal mengambil data.')
  }

  return result.data || []
}

// Memuat seluruh data dashboard
async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [userData, destinationData, bookingData] = await Promise.all([
      fetchData('admin/users'),
      fetchData('destinasi'),
      fetchData('admin/bookings'),
    ])

    users.value = userData
    destinations.value = destinationData
    bookings.value = bookingData
  } catch (error) {
    console.error('Dashboard error:', error)
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

// Mengosongkan form destinasi
function resetDestinationForm() {
  destinationForm.value = {
    nama: '',
    negara: '',
    kota: '',
    deskripsi: '',
    tautan_gambar: '',
  }

  editingDestinationId.value = null
  showDestinationForm.value = false
}

// Membuka form tambah destinasi
function openDestinationForm() {
  resetDestinationForm()
  showDestinationForm.value = true
  activeTab.value = 'destinations'
}

// Membuka form edit destinasi
function editDestination(destination) {
  editingDestinationId.value = destination.id_destinasi

  destinationForm.value = {
    nama: destination.nama || '',
    negara: destination.negara || '',
    kota: destination.kota || '',
    deskripsi: destination.deskripsi || '',
    tautan_gambar: destination.tautan_gambar || '',
  }

  showDestinationForm.value = true
  activeTab.value = 'destinations'
}

// Menyimpan destinasi baru atau perubahan destinasi
async function saveDestination() {
  if (savingDestination.value) return

  savingDestination.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const isEditing = editingDestinationId.value !== null

    const url = isEditing
      ? `http://localhost:3000/api/destinasi/${editingDestinationId.value}`
      : 'http://localhost:3000/api/destinasi'

    const response = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: authHeaders(),
      body: JSON.stringify(destinationForm.value),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Gagal menyimpan destinasi.')
    }

    successMessage.value = result.message || 'Destinasi berhasil disimpan.'

    resetDestinationForm()
    await loadDashboard()
  } catch (error) {
    console.error('Save destination error:', error)
    errorMessage.value = error.message
  } finally {
    savingDestination.value = false
  }
}

// Format tanggal
function formatDate(date) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Format harga
function formatPrice(price) {
  if (price === null || price === undefined) return '-'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price)
}

onMounted(() => {
  if (!getToken()) {
    router.push('/login')
    return
  }

  loadDashboard()
})
</script>

<template>
  <main class="min-h-screen bg-[#dceafa] px-4 py-8 sm:px-8">
    <div class="mx-auto max-w-7xl">
      <!-- Header -->
      <header class="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
            Administrator
          </p>

          <h1 class="mt-1 text-3xl font-bold text-[#263951]">Dashboard TripMate</h1>

          <p class="mt-2 text-sm text-slate-600">
            Kelola data pengguna, destinasi, dan pemesanan tiket.
          </p>
        </div>
      </header>

      <!-- Statistik -->
      <section class="mb-8 grid gap-4 sm:grid-cols-3">
        <article class="rounded-2xl bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">Total Pengguna</p>
          <p class="mt-2 text-3xl font-bold text-[#263951]">
            {{ stats.users }}
          </p>
        </article>

        <article class="rounded-2xl bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">Total Destinasi</p>
          <p class="mt-2 text-3xl font-bold text-[#263951]">
            {{ stats.destinations }}
          </p>
        </article>

        <article class="rounded-2xl bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">Total Pemesanan</p>
          <p class="mt-2 text-3xl font-bold text-[#263951]">
            {{ stats.bookings }}
          </p>
        </article>
      </section>

      <!-- Pesan Error -->
      <div
        v-if="errorMessage"
        class="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <!-- Pesan Berhasil -->
      <div
        v-if="successMessage"
        class="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-700"
        role="status"
      >
        {{ successMessage }}
      </div>

      <!-- Dashboard Content -->
      <section class="overflow-hidden rounded-2xl bg-white shadow-sm">
        <!-- Navigasi Tab -->
        <nav class="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <button
            @click="activeTab = 'users'"
            class="rounded-xl px-4 py-3 text-sm font-semibold transition"
            :class="
              activeTab === 'users'
                ? 'bg-[#347bd0] text-white'
                : 'bg-slate-100 text-[#263951] hover:bg-blue-50'
            "
          >
            Data Pengguna
          </button>

          <button
            @click="activeTab = 'destinations'"
            class="rounded-xl px-4 py-3 text-sm font-semibold transition"
            :class="
              activeTab === 'destinations'
                ? 'bg-[#347bd0] text-white'
                : 'bg-slate-100 text-[#263951] hover:bg-blue-50'
            "
          >
            Data Destinasi
          </button>

          <button
            @click="activeTab = 'bookings'"
            class="rounded-xl px-4 py-3 text-sm font-semibold transition"
            :class="
              activeTab === 'bookings'
                ? 'bg-[#347bd0] text-white'
                : 'bg-slate-100 text-[#263951] hover:bg-blue-50'
            "
          >
            Data Pemesanan
          </button>

          <button
            @click="loadDashboard"
            :disabled="loading"
            class="ml-auto rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-[#347bd0] hover:bg-blue-100 disabled:opacity-50"
          >
            {{ loading ? 'Memuat...' : '↻ Refresh' }}
          </button>
        </nav>

        <div v-if="loading" class="p-10 text-center text-slate-500">Memuat data dashboard...</div>

        <div v-else class="p-5 sm:p-6">
          <!-- DATA PENGGUNA -->
          <div v-if="activeTab === 'users'">
            <h2 class="mb-5 text-xl font-bold text-[#263951]">Daftar Pengguna</h2>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[#edf4fc] text-[#263951]">
                  <tr>
                    <th class="p-3">Nama</th>
                    <th class="p-3">Email</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Tanggal Dibuat</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="user in users"
                    :key="user.id_pengguna"
                    class="border-b border-slate-100"
                  >
                    <td class="p-3 font-medium text-[#263951]">
                      {{ user.nama }}
                    </td>

                    <td class="p-3 text-slate-600">
                      {{ user.email }}
                    </td>

                    <td class="p-3">
                      <span
                        class="rounded-full px-3 py-1 text-xs font-semibold"
                        :class="
                          user.status_premium
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        "
                      >
                        {{ user.status_premium ? 'Premium' : 'Free' }}
                      </span>
                    </td>

                    <td class="p-3 text-slate-600">
                      {{ formatDate(user.tanggal_dibuat) }}
                    </td>
                  </tr>

                  <tr v-if="users.length === 0">
                    <td colspan="4" class="p-6 text-center text-slate-500">
                      Belum ada pengguna terdaftar.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- DATA DESTINASI -->
          <div v-if="activeTab === 'destinations'">
            <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-xl font-bold text-[#263951]">Daftar Destinasi</h2>

              <button
                @click="openDestinationForm"
                class="rounded-xl bg-[#347bd0] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Tambah Destinasi
              </button>
            </div>

            <!-- Form Destinasi -->
            <form
              v-if="showDestinationForm"
              @submit.prevent="saveDestination"
              class="mb-6 grid gap-4 rounded-xl bg-[#f5f9ff] p-5 sm:grid-cols-2"
            >
              <h3 class="text-lg font-bold text-[#263951] sm:col-span-2">
                {{ editingDestinationId ? 'Edit Destinasi' : 'Tambah Destinasi Baru' }}
              </h3>

              <label class="text-sm font-medium text-[#263951]">
                Nama Destinasi

                <input
                  v-model="destinationForm.nama"
                  required
                  class="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:border-[#347bd0]"
                />
              </label>

              <label class="text-sm font-medium text-[#263951]">
                Negara

                <input
                  v-model="destinationForm.negara"
                  required
                  class="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:border-[#347bd0]"
                />
              </label>

              <label class="text-sm font-medium text-[#263951]">
                Kota

                <input
                  v-model="destinationForm.kota"
                  required
                  class="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:border-[#347bd0]"
                />
              </label>

              <label class="text-sm font-medium text-[#263951]">
                Tautan Gambar

                <input
                  v-model="destinationForm.tautan_gambar"
                  type="url"
                  class="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:border-[#347bd0]"
                />
              </label>

              <label class="text-sm font-medium text-[#263951] sm:col-span-2">
                Deskripsi

                <textarea
                  v-model="destinationForm.deskripsi"
                  rows="3"
                  class="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:border-[#347bd0]"
                ></textarea>
              </label>

              <div class="flex flex-wrap gap-3 sm:col-span-2">
                <button
                  type="submit"
                  :disabled="savingDestination"
                  class="rounded-xl bg-[#347bd0] px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ savingDestination ? 'Menyimpan...' : 'Simpan Destinasi' }}
                </button>

                <button
                  type="button"
                  @click="resetDestinationForm"
                  class="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Batal
                </button>
              </div>
            </form>

            <!-- Tabel Destinasi -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[#edf4fc] text-[#263951]">
                  <tr>
                    <th class="p-3">Destinasi</th>
                    <th class="p-3">Kota</th>
                    <th class="p-3">Negara</th>
                    <th class="p-3">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="destination in destinations"
                    :key="destination.id_destinasi"
                    class="border-b border-slate-100"
                  >
                    <td class="p-3 font-medium text-[#263951]">
                      {{ destination.nama }}
                    </td>

                    <td class="p-3">
                      {{ destination.kota }}
                    </td>

                    <td class="p-3">
                      {{ destination.negara }}
                    </td>

                    <td class="p-3">
                      <button
                        @click="editDestination(destination)"
                        class="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-[#347bd0] hover:bg-blue-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>

                  <tr v-if="destinations.length === 0">
                    <td colspan="4" class="p-6 text-center text-slate-500">Belum ada destinasi.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- DATA PEMESANAN -->
          <div v-if="activeTab === 'bookings'">
            <h2 class="mb-5 text-xl font-bold text-[#263951]">Informasi Pemesanan Tiket</h2>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[#edf4fc] text-[#263951]">
                  <tr>
                    <th class="p-3">Kode Pemesanan</th>
                    <th class="p-3">Pengguna</th>
                    <th class="p-3">Maskapai</th>
                    <th class="p-3">Rute</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Total Harga</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="booking in bookings"
                    :key="booking.id_pemesanan"
                    class="border-b border-slate-100"
                  >
                    <td class="p-3 font-semibold text-[#263951]">
                      {{ booking.kode_pemesanan || '-' }}
                    </td>

                    <td class="p-3">
                      <div class="font-medium">
                        {{ booking.nama_pengguna || '-' }}
                      </div>

                      <div class="text-xs text-slate-500">
                        {{ booking.email || '-' }}
                      </div>
                    </td>

                    <td class="p-3">
                      {{ booking.maskapai || '-' }}
                    </td>

                    <td class="p-3">
                      {{ booking.bandara_keberangkatan || '-' }}
                      →
                      {{ booking.bandara_kedatangan || '-' }}
                    </td>

                    <td class="p-3">
                      {{ booking.status || '-' }}
                    </td>

                    <td class="p-3">
                      {{ formatPrice(booking.total_harga) }}
                    </td>
                  </tr>

                  <tr v-if="bookings.length === 0">
                    <td colspan="6" class="p-6 text-center text-slate-500">
                      Belum ada pemesanan tiket.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <p class="mt-6 text-center text-xs text-slate-500">TripMate Administrator Dashboard</p>
    </div>
  </main>
</template>
