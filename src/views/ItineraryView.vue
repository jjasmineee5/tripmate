<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const itineraryStorageKey = 'tripmate-itinerary'
const flightStorageKey = 'tripmate-selected-flight'

const destination = ref('')
const startDate = ref('')
const endDate = ref('')
const preferences = ref('Wisata, kuliner, dan tempat populer')
const budget = ref('medium')

const selectedFlight = ref(null)
const itineraryDays = ref([])
const selectedDay = ref(0)

const isGenerating = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isEditing = ref(false)

const newActivityName = ref('')
const newActivityTime = ref('')
const newActivityDescription = ref('')

function readJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function saveItinerary() {
  if (!destination.value.trim()) {
    errorMessage.value = 'Destinasi perjalanan belum diisi.'
    successMessage.value = ''
    return false
  }

  if (!Array.isArray(itineraryDays.value) || itineraryDays.value.length === 0) {
    errorMessage.value = 'Buat itinerary terlebih dahulu sebelum menyimpan.'
    successMessage.value = ''
    return false
  }

  try {
    const savedData = {
      destination: destination.value.trim(),
      startDate: startDate.value,
      endDate: endDate.value,
      preferences: preferences.value,
      budget: budget.value,
      days: JSON.parse(JSON.stringify(itineraryDays.value)),
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem(itineraryStorageKey, JSON.stringify(savedData))

    const verification = localStorage.getItem(itineraryStorageKey)

    if (!verification) {
      throw new Error('Data itinerary tidak ditemukan setelah disimpan.')
    }

    const verifiedData = JSON.parse(verification)

    if (
      verifiedData.destination !== savedData.destination ||
      !Array.isArray(verifiedData.days) ||
      verifiedData.days.length !== savedData.days.length
    ) {
      throw new Error('Verifikasi penyimpanan itinerary gagal.')
    }

    successMessage.value = 'Itinerary berhasil disimpan!'
    errorMessage.value = ''

    return true
  } catch (error) {
    successMessage.value = ''
    errorMessage.value = error.message || 'Itinerary gagal disimpan di browser.'

    return false
  }
}

function loadFlight() {
  const flight = readJson(flightStorageKey)

  selectedFlight.value = flight && flight.selectedAt ? flight : null
}

function loadSavedItinerary() {
  const saved = readJson(itineraryStorageKey)

  if (!saved) return

  destination.value = saved.destination || ''
  startDate.value = saved.startDate || ''
  endDate.value = saved.endDate || ''
  preferences.value = saved.preferences || 'Wisata, kuliner, dan tempat populer'
  budget.value = saved.budget || 'medium'
  itineraryDays.value = normalizeDays(saved.days)
  selectedDay.value = 0
}

function applyBookingContext() {
  if (route.query.fromBooking !== 'true') return

  loadFlight()

  if (route.query.startDate) {
    startDate.value = String(route.query.startDate)
  }

  if (route.query.endDate) {
    endDate.value = String(route.query.endDate)
  }

  if (selectedFlight.value) {
    const flight = selectedFlight.value
    const outbound = flight.outboundFlight || flight
    const returning = flight.returnFlight || null

    destination.value = outbound.destination || flight.destination || destination.value

    startDate.value = startDate.value || outbound.departureDate || ''

    // Tiket satu arah tidak otomatis mendapatkan tanggal pulang.
    if (returning) {
      endDate.value = endDate.value || returning.departureDate || ''
    } else if (!route.query.endDate) {
      endDate.value = ''
    }
  }

  // Booking baru harus dibuatkan itinerary baru.
  itineraryDays.value = []
  selectedDay.value = 0
  errorMessage.value = ''
  successMessage.value = ''
}

loadFlight()
loadSavedItinerary()
applyBookingContext()

const flightSummary = computed(() => {
  if (!selectedFlight.value) return null

  const flight = selectedFlight.value
  const outbound = flight.outboundFlight || flight
  const returning = flight.returnFlight || null

  return {
    airline: outbound.airline || flight.airline || 'Maskapai',
    code: outbound.code || flight.code || '-',
    origin: outbound.origin || flight.origin || '',
    destination: outbound.destination || flight.destination || destination.value,
    departureDate: outbound.departureDate || flight.departureDate || startDate.value,
    departureTime: outbound.departure || outbound.departureTime || '',
    arrivalTime: outbound.arrival || outbound.arrivalTime || '',
    returnFlight: returning
      ? {
          airline: returning.airline || 'Maskapai',
          code: returning.code || '-',
          origin: returning.origin || '',
          destination: returning.destination || '',
          departureDate: returning.departureDate || '',
          departureTime: returning.departure || returning.departureTime || '',
          arrivalTime: returning.arrival || returning.arrivalTime || '',
        }
      : null,
  }
})

const activeDay = computed(() => {
  return itineraryDays.value[selectedDay.value] || null
})

const totalActivities = computed(() => {
  return itineraryDays.value.reduce((total, day) => total + (day.activities?.length || 0), 0)
})

const budgetLabel = computed(() => {
  const labels = {
    low: 'Hemat',
    medium: 'Menengah',
    high: 'Fleksibel',
  }

  return labels[budget.value] || 'Menengah'
})

function formatDate(dateString) {
  if (!dateString) return 'Belum ditentukan'

  const date = new Date(`${dateString}T12:00:00`)

  if (Number.isNaN(date.getTime())) return dateString

  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDayDate(index) {
  if (itineraryDays.value[index]?.date) {
    return formatDate(itineraryDays.value[index].date)
  }

  if (!startDate.value) return `Hari ${index + 1}`

  const date = new Date(`${startDate.value}T12:00:00`)
  date.setDate(date.getDate() + index)

  return formatDate(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`,
  )
}

function normalizeDays(days) {
  if (!Array.isArray(days)) return []

  return days.map((day, index) => ({
    ...day,
    day: Number(day.day) || index + 1,
    date: day.date || '',
    title: day.title || `Hari ${index + 1}`,
    activities: Array.isArray(day.activities)
      ? day.activities.map((activity) => ({
          time: activity.time || '',
          name: activity.name || activity.title || 'Aktivitas',
          description: activity.description || '',
          location: activity.location || '',
          estimatedCost: activity.estimatedCost ?? '',
          completed: Boolean(activity.completed),
        }))
      : [],
  }))
}

async function generateItinerary() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!destination.value.trim()) {
    errorMessage.value = 'Masukkan destinasi perjalanan terlebih dahulu.'
    return
  }

  if (!startDate.value || !endDate.value) {
    errorMessage.value = 'Pilih tanggal mulai dan tanggal selesai perjalanan.'
    return
  }

  if (endDate.value < startDate.value) {
    errorMessage.value = 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
    return
  }

  const start = new Date(`${startDate.value}T12:00:00`)
  const end = new Date(`${endDate.value}T12:00:00`)
  const duration = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

  if (duration > 180) {
    errorMessage.value = 'Durasi perjalanan maksimal 180 hari.'
    return
  }

  isGenerating.value = true

  try {
    const flight = selectedFlight.value
    const outbound = flight ? flight.outboundFlight || flight : null
    const returning = flight?.returnFlight || null

    const response = await fetch('http://localhost:3000/api/itinerary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination: destination.value.trim(),
        startDate: startDate.value,
        endDate: endDate.value,
        preferences: preferences.value,
        budget: budget.value,
        flight: flight
          ? {
              airline: outbound.airline || '',
              code: outbound.code || '',
              origin: outbound.origin || '',
              destination: outbound.destination || destination.value,
              departureDate: outbound.departureDate || startDate.value,
              departureTime: outbound.departure || outbound.departureTime || '',
              arrivalTime: outbound.arrival || outbound.arrivalTime || '',
              returnDate: returning?.departureDate || '',
              returnDeparture: returning?.departure || returning?.departureTime || '',
              returnArrival: returning?.arrival || returning?.arrivalTime || '',
              hasReturnFlight: Boolean(returning),
            }
          : null,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menghasilkan itinerary.')
    }

    const days = normalizeDays(result.itinerary?.days)

    if (!days.length) {
      throw new Error('AI belum menghasilkan agenda. Silakan coba lagi.')
    }

    itineraryDays.value = days
    selectedDay.value = 0
    isEditing.value = false

    // Simpan hasil generate juga agar tidak hilang saat refresh.
    saveItinerary()

    if (!errorMessage.value) {
      successMessage.value = 'Itinerary berhasil dibuat dan disimpan!'
    }
  } catch (error) {
    errorMessage.value =
      error.message ||
      'Tidak dapat terhubung ke backend. Pastikan backend TripMate sedang berjalan.'
    successMessage.value = ''
  } finally {
    isGenerating.value = false
  }
}

function toggleActivity(activity) {
  activity.completed = !activity.completed
  errorMessage.value = ''
  successMessage.value = ''
  saveItinerary()
}

function addActivity() {
  if (!activeDay.value) return

  if (!newActivityName.value.trim()) {
    errorMessage.value = 'Nama aktivitas harus diisi.'
    successMessage.value = ''
    return
  }

  // Terima format 09:00 maupun 09.00
  const inputTime = newActivityTime.value.trim() || '09:00'
  const normalizedTime = inputTime.replace('.', ':')

  // Validasi format jam 24 jam
  const timeMatch = normalizedTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/)

  if (!timeMatch) {
    errorMessage.value = 'Format jam tidak valid. Gunakan HH:mm, misalnya 09:00 atau 20:30.'
    successMessage.value = ''
    return
  }

  activeDay.value.activities.push({
    time: normalizedTime,
    name: newActivityName.value.trim(),
    description: newActivityDescription.value.trim(),
    location: '',
    estimatedCost: '',
    completed: false,
  })

  // Urutkan aktivitas berdasarkan jam paling awal
  activeDay.value.activities.sort((a, b) => {
    const timeA = String(a.time || '23:59').replace('.', ':')
    const timeB = String(b.time || '23:59').replace('.', ':')

    return timeA.localeCompare(timeB)
  })

  // Reset formulir
  newActivityName.value = ''
  newActivityTime.value = ''
  newActivityDescription.value = ''
  errorMessage.value = ''
  successMessage.value = ''

  // Simpan aktivitas beserta urutan yang sudah diperbaiki
  saveItinerary()
}

function removeActivity(index) {
  if (!activeDay.value) return

  activeDay.value.activities.splice(index, 1)
  errorMessage.value = ''
  successMessage.value = ''

  saveItinerary()
}

function saveChanges() {
  if (isSaving.value) return

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const saved = saveItinerary()

    if (saved) {
      isEditing.value = false
    }
  } finally {
    isSaving.value = false
  }
}

function startNewItinerary() {
  destination.value = ''
  startDate.value = ''
  endDate.value = ''
  preferences.value = 'Wisata, kuliner, dan tempat populer'
  budget.value = 'medium'
  itineraryDays.value = []
  selectedDay.value = 0
  errorMessage.value = ''
  successMessage.value = ''
  isEditing.value = false

  try {
    localStorage.removeItem(itineraryStorageKey)
  } catch {
    errorMessage.value = 'Itinerary baru dibuat, tetapi data lama gagal dihapus dari browser.'
  }
}

function goToFlights() {
  router.push('/flights')
}

watch(
  () => route.query.fromBooking,
  (value) => {
    if (value === 'true') {
      applyBookingContext()
    }
  },
)
</script>

<template>
  <main class="min-h-screen bg-[#dceafa] px-4 py-8 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">
      <header class="mb-8">
        <p class="text-sm font-bold uppercase tracking-[0.2em] text-[#347bd0]">
          TripMate · AI Travel Planner
        </p>

        <h1 class="mt-2 text-3xl font-extrabold text-[#263951] sm:text-4xl">
          Rencanakan Perjalananmu
        </h1>

        <p class="mt-3 max-w-2xl text-[#52657d]">
          Buat itinerary yang sesuai dengan destinasi, tanggal perjalanan, preferensi, dan
          anggaranmu.
        </p>
      </header>

      <div
        v-if="flightSummary"
        class="mb-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-[#347bd0]">✈️ Tiket penerbangan terpilih</p>

            <h2 class="mt-1 text-lg font-bold text-[#263951]">
              {{ flightSummary.origin }} → {{ flightSummary.destination }}
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              {{ flightSummary.airline }} ({{ flightSummary.code }})
            </p>
          </div>

          <button
            type="button"
            class="text-sm font-semibold text-[#347bd0] hover:underline"
            @click="goToFlights"
          >
            Ganti tiket
          </button>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl bg-[#f5f9ff] p-3">
            <p class="text-xs text-slate-500">Tanggal berangkat</p>
            <p class="mt-1 font-semibold text-[#263951]">
              {{ formatDate(flightSummary.departureDate) }}
            </p>
            <p class="mt-1 text-sm text-slate-500">
              {{ flightSummary.departureTime || 'Jam belum tersedia' }}
              <span v-if="flightSummary.arrivalTime"> – {{ flightSummary.arrivalTime }} </span>
            </p>
          </div>

          <div class="rounded-xl bg-[#f5f9ff] p-3">
            <p class="text-xs text-slate-500">Tanggal pulang</p>

            <template v-if="flightSummary.returnFlight">
              <p class="mt-1 font-semibold text-[#263951]">
                {{ formatDate(flightSummary.returnFlight.departureDate) }}
              </p>
              <p class="mt-1 text-sm text-slate-500">
                {{ flightSummary.returnFlight.origin }} →
                {{ flightSummary.returnFlight.destination }}
              </p>
            </template>

            <p v-else class="mt-1 font-semibold text-slate-500">Tiket pulang belum dipilih</p>
          </div>
        </div>
      </div>

      <div
        v-else
        class="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-dashed border-blue-300 bg-white/70 p-5 sm:flex-row sm:items-center"
      >
        <div>
          <h2 class="font-bold text-[#263951]">Belum ada tiket aktif yang dipilih</h2>
          <p class="mt-1 text-sm text-[#52657d]">
            Kamu tetap bisa membuat itinerary tanpa tiket penerbangan.
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-xl border border-[#347bd0] px-4 py-2 font-semibold text-[#347bd0] hover:bg-blue-50"
          @click="goToFlights"
        >
          Cari Penerbangan
        </button>
      </div>

      <div
        class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.65fr)]"
      >
        <!-- FORM DETAIL PERJALANAN -->
        <section class="h-fit rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 class="text-xl font-bold text-[#263951]">Detail Perjalanan</h2>
          <p class="mt-1 text-sm text-slate-500">Lengkapi informasi sebelum membuat itinerary.</p>

          <form class="mt-6 space-y-5" @submit.prevent="generateItinerary">
            <div>
              <label for="destination" class="mb-2 block text-sm font-semibold text-[#263951]">
                Destinasi
              </label>
              <input
                id="destination"
                v-model="destination"
                type="text"
                placeholder="Contoh: Yogyakarta"
                required
                class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="startDate" class="mb-2 block text-sm font-semibold text-[#263951]">
                  Tanggal mulai
                </label>
                <input
                  id="startDate"
                  v-model="startDate"
                  type="date"
                  required
                  class="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label for="endDate" class="mb-2 block text-sm font-semibold text-[#263951]">
                  Tanggal selesai
                </label>
                <input
                  id="endDate"
                  v-model="endDate"
                  type="date"
                  :min="startDate || undefined"
                  required
                  class="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label for="preferences" class="mb-2 block text-sm font-semibold text-[#263951]">
                Preferensi perjalanan
              </label>
              <textarea
                id="preferences"
                v-model="preferences"
                rows="3"
                placeholder="Contoh: wisata alam, kuliner lokal, museum, dan tempat foto"
                class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label for="budget" class="mb-2 block text-sm font-semibold text-[#263951]">
                Anggaran perjalanan
              </label>
              <select
                id="budget"
                v-model="budget"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
              >
                <option value="low">Hemat</option>
                <option value="medium">Menengah</option>
                <option value="high">Fleksibel</option>
              </select>
            </div>

            <div
              v-if="errorMessage"
              role="alert"
              class="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {{ errorMessage }}
            </div>

            <div
              v-if="successMessage"
              role="status"
              class="rounded-xl bg-green-50 p-3 text-sm text-green-700"
            >
              ✓ {{ successMessage }}
            </div>

            <button
              type="submit"
              :disabled="isGenerating"
              class="w-full rounded-xl bg-[#347bd0] px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isGenerating ? 'Sedang Membuat Itinerary...' : '✨ Buat Itinerary dengan AI' }}
            </button>
          </form>
        </section>

        <!-- HASIL ITINERARY -->
        <section class="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-xl font-bold text-[#263951]">Itinerary Perjalanan</h2>
              <p class="mt-1 text-sm text-slate-500">
                Agenda perjalanan yang dihasilkan AI bisa kamu sesuaikan.
              </p>
            </div>

            <span
              v-if="itineraryDays.length"
              class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#347bd0]"
            >
              {{ itineraryDays.length }} hari
            </span>
          </div>

          <div
            v-if="!itineraryDays.length"
            class="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
          >
            <div class="text-5xl">🗺️</div>
            <h3 class="mt-4 text-lg font-bold text-[#263951]">Itinerary belum dibuat</h3>
            <p class="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Isi destinasi, tanggal, dan preferensimu. Tekan tombol “Buat Itinerary dengan AI”
              untuk menghasilkan agenda perjalanan.
            </p>
          </div>

          <template v-else>
            <!-- NAVIGASI HARI -->
            <div class="mt-5 flex gap-2 overflow-x-auto pb-2">
              <button
                v-for="(day, index) in itineraryDays"
                :key="`${day.date}-${index}`"
                type="button"
                class="min-w-20 rounded-xl border px-4 py-3 text-left transition"
                :class="
                  selectedDay === index
                    ? 'border-[#347bd0] bg-[#347bd0] text-white'
                    : 'border-slate-200 bg-white text-[#263951] hover:border-blue-300'
                "
                @click="selectedDay = index"
              >
                <span class="block text-xs opacity-80">Hari</span>
                <span class="text-lg font-bold">{{ index + 1 }}</span>
              </button>
            </div>

            <div v-if="activeDay" class="mt-5">
              <p class="text-sm font-semibold text-[#347bd0]">
                {{ getDayDate(selectedDay) }}
              </p>
              <h3 class="mt-1 text-xl font-bold text-[#263951]">
                {{ activeDay.title }}
              </h3>

              <p v-if="activeDay.description" class="mt-2 text-sm leading-6 text-slate-600">
                {{ activeDay.description }}
              </p>

              <div
                v-if="!activeDay.activities.length"
                class="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500"
              >
                Belum ada aktivitas untuk hari ini. Kamu bisa menambahkan aktivitas sendiri.
              </div>

              <!-- DAFTAR AKTIVITAS -->
              <div v-else class="mt-5 space-y-3">
                <article
                  v-for="(activity, index) in activeDay.activities"
                  :key="`${activity.time}-${activity.name}-${index}`"
                  class="rounded-xl border border-slate-200 p-4 transition"
                  :class="activity.completed ? 'bg-green-50/70' : 'bg-white'"
                >
                  <div class="flex items-start gap-3">
                    <input
                      :id="`activity-${selectedDay}-${index}`"
                      :checked="activity.completed"
                      type="checkbox"
                      class="mt-1 h-4 w-4 accent-[#347bd0]"
                      @change="toggleActivity(activity)"
                    />

                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-[#347bd0]">
                        {{ activity.time || 'Waktu fleksibel' }}
                      </p>

                      <label
                        :for="`activity-${selectedDay}-${index}`"
                        class="mt-1 block cursor-pointer font-bold text-[#263951]"
                        :class="activity.completed ? 'line-through opacity-60' : ''"
                      >
                        {{ activity.name }}
                      </label>

                      <p v-if="activity.location" class="mt-1 text-sm text-slate-500">
                        📍 {{ activity.location }}
                      </p>

                      <p v-if="activity.description" class="mt-2 text-sm leading-6 text-slate-600">
                        {{ activity.description }}
                      </p>

                      <p
                        v-if="
                          activity.estimatedCost !== '' &&
                          activity.estimatedCost !== null &&
                          activity.estimatedCost !== undefined
                        "
                        class="mt-2 text-xs font-semibold text-slate-500"
                      >
                        Estimasi biaya:
                        {{
                          typeof activity.estimatedCost === 'number'
                            ? activity.estimatedCost.toLocaleString('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                maximumFractionDigits: 0,
                              })
                            : activity.estimatedCost
                        }}
                      </p>
                    </div>

                    <button
                      v-if="isEditing"
                      type="button"
                      :aria-label="`Hapus ${activity.name}`"
                      class="rounded-lg px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                      @click="removeActivity(index)"
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              </div>

              <!-- TAMBAH AKTIVITAS -->
              <div class="mt-5 rounded-xl bg-[#f5f9ff] p-4">
                <h4 class="font-bold text-[#263951]">Tambah aktivitas</h4>

                <div class="mt-3 grid gap-3 sm:grid-cols-[0.6fr_1.4fr]">
                  <input
                    v-model="newActivityTime"
                    type="text"
                    placeholder="Jam, mis. 09.00"
                    class="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#347bd0]"
                  />

                  <input
                    v-model="newActivityName"
                    type="text"
                    placeholder="Nama aktivitas"
                    class="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#347bd0]"
                  />
                </div>

                <textarea
                  v-model="newActivityDescription"
                  rows="2"
                  placeholder="Deskripsi aktivitas (opsional)"
                  class="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#347bd0]"
                />

                <button
                  type="button"
                  class="mt-3 rounded-lg border border-[#347bd0] px-4 py-2 text-sm font-semibold text-[#347bd0] hover:bg-blue-50"
                  @click="addActivity"
                >
                  + Tambah Aktivitas
                </button>
              </div>
            </div>

            <!-- RINGKASAN -->
            <div class="mt-6 rounded-xl bg-slate-50 p-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-slate-500">Total aktivitas</p>
                  <p class="mt-1 text-xl font-bold text-[#263951]">
                    {{ totalActivities }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-slate-500">Anggaran pilihan</p>
                  <p class="mt-1 text-xl font-bold text-[#263951]">
                    {{ budgetLabel }}
                  </p>
                </div>
              </div>
            </div>

            <!-- TOMBOL AKSI -->
            <div class="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                class="flex-1 rounded-xl border border-[#347bd0] px-4 py-3 font-semibold text-[#347bd0] hover:bg-blue-50"
                @click="isEditing = !isEditing"
              >
                {{ isEditing ? 'Selesai Mengedit' : 'Edit Aktivitas' }}
              </button>

              <button
                type="button"
                :disabled="isSaving || isGenerating"
                class="flex-1 rounded-xl bg-[#347bd0] px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                @click="saveChanges"
              >
                {{ isSaving ? 'Menyimpan...' : 'Simpan Itinerary' }}
              </button>
            </div>

            <!-- NOTIFIKASI PERSIS DI BAWAH TOMBOL SIMPAN -->
            <div
              v-if="successMessage"
              role="status"
              class="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700"
            >
              ✓ {{ successMessage }}
            </div>

            <div
              v-if="errorMessage"
              role="alert"
              class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {{ errorMessage }}
            </div>

            <button
              type="button"
              class="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50"
              @click="startNewItinerary"
            >
              Buat Itinerary Baru
            </button>
          </template>
        </section>
      </div>

      <p class="mt-6 text-center text-xs leading-5 text-slate-500">
        TripMate membantu merencanakan perjalanan. Periksa kembali informasi lokasi, harga, dan jam
        operasional sebelum berangkat.
      </p>
    </div>
  </main>
</template>
