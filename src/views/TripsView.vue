<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const API_URL = 'http://localhost:3000/api'
const router = useRouter()

const currentUser = JSON.parse(localStorage.getItem('tripmate-current-user') || 'null')

const showForm = ref(false)
const message = ref('')
const editingId = ref(null)
const trips = ref([])
const loading = ref(false)
const saving = ref(false)

// State autocomplete
const destinationSuggestions = ref([])
const searchingDestination = ref(false)
const hasSearchedDestination = ref(false)

let destinationSearchTimer = null

const form = ref({
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  notes: '',
})

const formTitle = computed(() =>
  editingId.value === null ? 'Tambah Perjalanan' : 'Edit Perjalanan',
)

const tripCount = computed(() => trips.value.length)

function getToken() {
  return localStorage.getItem('tripmate-token')
}

// Request ke backend
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Terjadi kesalahan pada server.')
  }

  return result
}

// Mengambil perjalanan dari database
async function loadTrips() {
  loading.value = true

  try {
    const result = await apiRequest('/perjalanan')
    trips.value = result.data || []
  } catch (error) {
    message.value = `Gagal memuat perjalanan: ${error.message}`
  } finally {
    loading.value = false
  }
}

// Mencari saran kota dan negara
function searchDestination() {
  const query = form.value.destination.trim()

  clearTimeout(destinationSearchTimer)

  destinationSuggestions.value = []
  hasSearchedDestination.value = false

  if (query.length < 2) {
    searchingDestination.value = false
    return
  }

  searchingDestination.value = true

  destinationSearchTimer = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=id&format=json`,
      )

      if (!response.ok) {
        throw new Error('Gagal mencari lokasi.')
      }

      const result = await response.json()

      // Menghindari hasil pencarian lama menimpa hasil terbaru
      if (form.value.destination.trim() !== query) return

      destinationSuggestions.value = (result.results || []).map((item) => {
        const parts = [item.name, item.admin1, item.country].filter(
          (value, index, array) => value && array.indexOf(value) === index,
        )

        return {
          ...item,
          label: parts.join(', '),
        }
      })

      hasSearchedDestination.value = true
    } catch {
      if (form.value.destination.trim() === query) {
        destinationSuggestions.value = []
        hasSearchedDestination.value = true
      }
    } finally {
      if (form.value.destination.trim() === query) {
        searchingDestination.value = false
      }
    }
  }, 350)
}

// Memilih saran lokasi
function selectDestination(destination) {
  form.value.destination = destination.label
  destinationSuggestions.value = []
  hasSearchedDestination.value = false
  searchingDestination.value = false

  clearTimeout(destinationSearchTimer)
}

// Membersihkan form
function resetForm() {
  form.value = {
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    notes: '',
  }

  destinationSuggestions.value = []
  searchingDestination.value = false
  hasSearchedDestination.value = false

  clearTimeout(destinationSearchTimer)

  editingId.value = null
}

// Membuka atau menutup form
function toggleForm() {
  if (showForm.value) {
    showForm.value = false
    resetForm()
    message.value = ''
    return
  }

  resetForm()
  message.value = ''
  showForm.value = true
}

// Menambah atau memperbarui perjalanan
async function saveTrip() {
  if (!currentUser?.id || !getToken()) {
    message.value = 'Silakan login terlebih dahulu.'
    return
  }

  const name = form.value.name.trim()
  const destination = form.value.destination.trim()

  if (!name || !destination || !form.value.startDate || !form.value.endDate) {
    message.value = 'Lengkapi nama perjalanan, tujuan perjalanan, dan tanggal perjalanan.'
    return
  }

  if (name.length > 100) {
    message.value = 'Nama perjalanan maksimal 100 karakter.'
    return
  }

  if (destination.length > 255) {
    message.value = 'Tujuan perjalanan maksimal 255 karakter.'
    return
  }

  if (form.value.endDate < form.value.startDate) {
    message.value = 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
    return
  }

  const payload = {
    tujuan_perjalanan: destination,
    judul: name,
    tanggal_mulai: form.value.startDate,
    tanggal_selesai: form.value.endDate,
    catatan: form.value.notes.trim() || null,
  }

  saving.value = true
  message.value = ''

  try {
    if (editingId.value !== null) {
      await apiRequest(`/perjalanan/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      message.value = 'Perjalanan berhasil diperbarui!'
    } else {
      await apiRequest('/perjalanan', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      message.value = 'Perjalanan berhasil ditambahkan!'
    }

    showForm.value = false
    resetForm()

    await loadTrips()
  } catch (error) {
    message.value = `Gagal menyimpan perjalanan: ${error.message}`
  } finally {
    saving.value = false
  }
}

// Mengisi form edit
function editTrip(trip) {
  editingId.value = trip.id_perjalanan

  form.value = {
    name: trip.judul || '',
    destination: trip.tujuan_perjalanan || '',
    startDate: trip.tanggal_mulai ? String(trip.tanggal_mulai).slice(0, 10) : '',
    endDate: trip.tanggal_selesai ? String(trip.tanggal_selesai).slice(0, 10) : '',
    notes: trip.catatan || '',
  }

  destinationSuggestions.value = []
  hasSearchedDestination.value = false
  message.value = ''
  showForm.value = true

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Menghapus perjalanan
async function deleteTrip(id) {
  const confirmed = window.confirm('Yakin ingin menghapus perjalanan ini?')

  if (!confirmed) return

  try {
    await apiRequest(`/perjalanan/${id}`, {
      method: 'DELETE',
    })

    message.value = 'Perjalanan berhasil dihapus.'
    await loadTrips()
  } catch (error) {
    message.value = `Gagal menghapus perjalanan: ${error.message}`
  }
}

// Membuka halaman Itinerary AI
function openItinerary(trip) {
  router.push({
    path: '/itinerary',
    query: {
      tripId: String(trip.id_perjalanan),
    },
  })
}

// Format tanggal
function formatDate(dateString) {
  if (!dateString) return '-'

  return new Date(`${String(dateString).slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

onMounted(async () => {
  if (!currentUser?.id || !getToken()) {
    message.value = 'Silakan login terlebih dahulu untuk melihat perjalanan.'
    return
  }

  await loadTrips()
})

onUnmounted(() => {
  clearTimeout(destinationSearchTimer)
})
</script>

<template>
  <div class="min-h-[60vh] bg-[#dceafa]">
    <section class="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
      <!-- Header -->
      <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
            Perjalanan Saya
          </p>

          <h1 class="text-3xl font-bold text-[#263951] sm:text-4xl">Perjalanan Saya</h1>

          <p class="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            Atur semua rencana perjalananmu di satu tempat bersama TripMate.
          </p>
        </div>

        <button
          type="button"
          class="rounded-xl bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          @click="toggleForm"
        >
          {{ showForm ? 'Batal' : '+ Tambah Perjalanan' }}
        </button>
      </div>

      <!-- Pesan -->
      <div
        v-if="message"
        class="mt-6 rounded-xl border border-blue-200 bg-white p-4 text-sm text-[#263951]"
        role="status"
      >
        {{ message }}
      </div>

      <!-- Form Perjalanan -->
      <section v-if="showForm" class="mt-8 rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:p-8">
        <h2 class="text-xl font-bold text-[#263951]">
          {{ formTitle }}
        </h2>

        <form class="mt-6 space-y-5" @submit.prevent="saveTrip">
          <div class="grid gap-5 sm:grid-cols-2">
            <!-- Nama Perjalanan -->
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700"> Nama perjalanan </span>

              <input
                v-model="form.name"
                type="text"
                required
                maxlength="100"
                placeholder="Contoh: Liburan Akhir Tahun"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <!-- Tujuan Perjalanan -->
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700"> Tujuan perjalanan </span>

              <div class="relative">
                <input
                  v-model="form.destination"
                  @input="searchDestination"
                  type="text"
                  required
                  maxlength="255"
                  autocomplete="off"
                  placeholder="Cari kota atau negara, contoh: Tokyo"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <!-- Sedang mencari -->
                <p v-if="searchingDestination" class="mt-2 text-xs text-slate-500">
                  Mencari lokasi...
                </p>

                <!-- Daftar saran -->
                <div
                  v-if="destinationSuggestions.length > 0"
                  class="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <button
                    v-for="(destination, index) in destinationSuggestions"
                    :key="`${destination.id}-${index}`"
                    type="button"
                    class="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition last:border-0 hover:bg-blue-50"
                    @click="selectDestination(destination)"
                  >
                    <span class="block font-semibold text-[#263951]">
                      {{ destination.name }}
                    </span>

                    <span class="mt-1 block text-xs text-slate-500">
                      {{ destination.admin1 ? destination.admin1 + ', ' : '' }}
                      {{ destination.country }}
                    </span>
                  </button>
                </div>

                <!-- Tidak ditemukan -->
                <p
                  v-if="
                    hasSearchedDestination &&
                    !searchingDestination &&
                    destinationSuggestions.length === 0
                  "
                  class="mt-2 text-xs text-slate-500"
                >
                  Tidak ada saran lokasi. Kamu tetap bisa menggunakan tujuan yang diketik secara
                  manual.
                </p>
              </div>

              <span class="mt-2 block text-xs text-slate-500">
                Ketik minimal 2 karakter untuk melihat saran lokasi.
              </span>
            </label>

            <!-- Tanggal Mulai -->
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700"> Tanggal mulai </span>

              <input
                v-model="form.startDate"
                type="date"
                required
                :min="new Date().toLocaleDateString('en-CA')"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <!-- Tanggal Selesai -->
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700"> Tanggal selesai </span>

              <input
                v-model="form.endDate"
                type="date"
                required
                :min="form.startDate || new Date().toLocaleDateString('en-CA')"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <!-- Catatan -->
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-slate-700">
              Catatan perjalanan (opsional)
            </span>

            <textarea
              v-model="form.notes"
              rows="3"
              maxlength="1000"
              placeholder="Tulis rencana atau catatan pentingmu..."
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            ></textarea>
          </label>

          <!-- Tombol Form -->
          <div class="flex flex-wrap gap-3">
            <button
              type="submit"
              :disabled="saving"
              class="rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{
                saving
                  ? 'Menyimpan...'
                  : editingId === null
                    ? 'Simpan Perjalanan'
                    : 'Simpan Perubahan'
              }}
            </button>

            <button
              type="button"
              class="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-600 transition hover:bg-slate-100"
              @click="toggleForm"
            >
              Batal
            </button>
          </div>
        </form>
      </section>

      <!-- Daftar Perjalanan -->
      <section class="mt-8">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-xl font-bold text-[#263951]">Daftar Perjalanan</h2>

          <span class="rounded-full bg-white px-4 py-2 text-sm font-medium text-blue-700">
            {{ tripCount }} perjalanan
          </span>
        </div>

        <!-- Loading -->
        <div
          v-if="loading"
          class="rounded-2xl bg-white/70 px-5 py-14 text-center text-sm text-slate-600"
        >
          Memuat data perjalanan...
        </div>

        <!-- Kosong -->
        <div
          v-else-if="trips.length === 0"
          class="rounded-2xl border border-dashed border-blue-200 bg-white/70 px-5 py-14 text-center"
        >
          <div class="text-5xl" aria-hidden="true">✈</div>

          <h3 class="mt-4 text-lg font-bold text-[#263951]">Belum ada perjalanan</h3>

          <p class="mt-2 text-sm text-slate-600">Yuk, buat rencana perjalanan pertamamu!</p>

          <button
            type="button"
            class="mt-5 rounded-xl bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            @click="toggleForm"
          >
            + Buat Perjalanan
          </button>
        </div>

        <!-- Kartu Perjalanan -->
        <div v-else class="grid gap-5 md:grid-cols-2">
          <article
            v-for="trip in trips"
            :key="trip.id_perjalanan"
            class="rounded-2xl border border-white bg-[#f5f9ff] p-5 shadow-sm transition hover:shadow-md sm:p-6"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <span class="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Rencana Perjalanan
                </span>

                <h3 class="mt-2 text-xl font-bold text-[#263951]">
                  {{ trip.judul }}
                </h3>

                <p class="mt-1 text-sm text-slate-600">
                  <span aria-hidden="true">📍</span>
                  {{ trip.tujuan_perjalanan }}
                </p>
              </div>

              <span class="text-2xl" aria-hidden="true">🧳</span>
            </div>

            <div class="mt-5 rounded-xl bg-blue-50 p-4">
              <p class="text-xs font-medium text-slate-500">Tanggal perjalanan</p>

              <p class="mt-1 text-sm font-semibold text-[#263951]">
                {{ formatDate(trip.tanggal_mulai) }}
                <span class="px-1 text-blue-500">→</span>
                {{ formatDate(trip.tanggal_selesai) }}
              </p>
            </div>

            <p
              v-if="trip.catatan"
              class="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600"
            >
              {{ trip.catatan }}
            </p>

            <div class="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                class="rounded-lg bg-[#347bd0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                @click="openItinerary(trip)"
              >
                Buat Itinerary AI
              </button>

              <button
                type="button"
                class="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                @click="editTrip(trip)"
              >
                Edit
              </button>

              <button
                type="button"
                class="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                @click="deleteTrip(trip.id_perjalanan)"
              >
                Hapus
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>
