<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const storageKey = 'tripmate-packing-items'
const flightStorageKey = 'tripmate-selected-flight'
const itineraryStorageKey = 'tripmate-itinerary'

const destination = ref('')
const duration = ref(3)
const tripType = ref('liburan')
const newItem = ref('')
const items = ref([])
const loaded = ref(false)
const isGenerating = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const linkedContext = ref({
  hasFlight: false,
  hasItinerary: false,
  flight: null,
  itinerary: null,
})

function readStorage(key) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function validDate(value) {
  if (typeof value !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime())
}

function getDuration(startDate, endDate) {
  if (!validDate(startDate) || !validDate(endDate)) return null

  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  const days = Math.round((end - start) / 86400000) + 1

  return Number.isInteger(days) && days > 0 && days <= 90 ? days : null
}

function getFlightContext(savedFlight) {
  if (!savedFlight || typeof savedFlight !== 'object') return null

  const outbound = savedFlight.outboundFlight || savedFlight
  const returning = savedFlight.returnFlight || null

  return {
    origin: outbound.origin || outbound.from || '',
    destination: outbound.destination || outbound.to || '',
    departureDate: outbound.departureDate || outbound.date || savedFlight.departureDate || '',
    departureTime: outbound.departureTime || outbound.time || '',
    arrivalTime: outbound.arrivalTime || '',
    airline: outbound.airline || '',
    flightNumber: outbound.flightNumber || outbound.flightCode || '',
    hasReturnFlight: Boolean(returning),
    returnDate: returning ? returning.departureDate || returning.date || '' : '',
    returnDeparture: returning ? returning.departureTime || returning.time || '' : '',
    returnArrival: returning ? returning.arrivalTime || '' : '',
  }
}

function getItineraryContext(savedItinerary) {
  if (!savedItinerary || typeof savedItinerary !== 'object') {
    return null
  }

  const source = savedItinerary.itinerary || savedItinerary
  const days = Array.isArray(source.days) ? source.days : Array.isArray(source) ? source : []

  if (days.length === 0) return null

  return {
    destination: savedItinerary.destination || source.destination || '',
    startDate: savedItinerary.startDate || source.startDate || days[0]?.date || '',
    endDate: savedItinerary.endDate || source.endDate || days[days.length - 1]?.date || '',
    days: days.map((day, index) => ({
      day: Number(day.day) || index + 1,
      date: day.date || '',
      title: day.title || `Hari ${index + 1}`,
      description: day.description || '',
      activities: (Array.isArray(day.activities) ? day.activities : [])
        .map((activity) => ({
          time: activity.time || '',
          name: activity.name || activity.title || '',
          location: activity.location || '',
          description: activity.description || '',
        }))
        .filter((activity) => activity.name || activity.location || activity.description),
    })),
  }
}

function loadLinkedContext() {
  const savedFlight = readStorage(flightStorageKey)
  const savedItinerary = readStorage(itineraryStorageKey)

  const flight = getFlightContext(savedFlight)
  const itinerary = getItineraryContext(savedItinerary)

  linkedContext.value = {
    hasFlight: Boolean(flight),
    hasItinerary: Boolean(itinerary),
    flight,
    itinerary,
  }

  // Utamakan data itinerary karena biasanya mencerminkan
  // rencana perjalanan yang sudah dibuat pengguna.
  const selectedDestination = itinerary?.destination || flight?.destination || ''

  if (selectedDestination && !destination.value.trim()) {
    destination.value = selectedDestination
  }

  const itineraryDuration = getDuration(itinerary?.startDate, itinerary?.endDate)

  const flightDuration = getDuration(flight?.departureDate, flight?.returnDate)

  if (itineraryDuration) {
    duration.value = itineraryDuration
  } else if (flightDuration) {
    duration.value = flightDuration
  } else if (flight?.departureDate && !flight?.hasReturnFlight) {
    // Untuk tiket sekali jalan, jangan menebak tanggal pulang.
    // Pengguna tetap dapat menentukan durasi perjalanan.
    duration.value = Number(duration.value) || 3
  }
}

onMounted(() => {
  try {
    const savedItems = readStorage(storageKey)

    if (Array.isArray(savedItems)) {
      items.value = savedItems
        .map((item, index) => ({
          id: item.id ?? `${Date.now()}-${index}`,
          name: String(item.name || '').trim(),
          packed: Boolean(item.packed),
        }))
        .filter((item) => item.name)
    }
  } catch {
    items.value = []
  }

  loadLinkedContext()
  loaded.value = true
})

watch(
  items,
  (value) => {
    if (!loaded.value) return

    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      errorMessage.value = 'Daftar tidak dapat disimpan di browser.'
    }
  },
  { deep: true },
)

const packedCount = computed(() => items.value.filter((item) => item.packed).length)

const progress = computed(() => {
  if (items.value.length === 0) return 0
  return Math.round((packedCount.value / items.value.length) * 100)
})

async function generatePackingList() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!destination.value.trim()) {
    errorMessage.value = 'Masukkan tujuan perjalanan terlebih dahulu.'
    return
  }

  if (
    !Number.isInteger(Number(duration.value)) ||
    Number(duration.value) < 1 ||
    Number(duration.value) > 90
  ) {
    errorMessage.value = 'Durasi perjalanan harus antara 1 sampai 90 hari.'
    return
  }

  // Muat ulang data supaya perubahan tiket atau itinerary
  // yang dibuat setelah halaman dibuka ikut terbaca.
  loadLinkedContext()
  isGenerating.value = true

  try {
    const response = await fetch('http://localhost:3000/api/packing-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination: destination.value.trim(),
        duration: Number(duration.value),
        tripType: tripType.value,
        flight: linkedContext.value.flight,
        itinerary: linkedContext.value.itinerary,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Gagal menghasilkan packing list.')
    }

    const generatedItems = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.packingList)
        ? data.packingList
        : []

    const normalizedItems = generatedItems
      .map((item, index) => {
        const name =
          typeof item === 'string' ? item.trim() : String(item?.name || item?.item || '').trim()

        if (!name) return null

        return {
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          packed: false,
        }
      })
      .filter(Boolean)

    if (normalizedItems.length === 0) {
      throw new Error('AI belum menghasilkan daftar barang. Silakan coba lagi.')
    }

    items.value = normalizedItems

    const sources = []
    if (linkedContext.value.hasFlight) sources.push('tiket')
    if (linkedContext.value.hasItinerary) sources.push('itinerary')

    successMessage.value = sources.length
      ? `Berhasil membuat ${normalizedItems.length} barang dengan konteks ${sources.join(' dan ')} perjalanan.`
      : `Berhasil membuat ${normalizedItems.length} barang berdasarkan tujuan, durasi, dan jenis perjalanan.`
  } catch (error) {
    errorMessage.value =
      error.message || 'Tidak dapat menghubungi AI. Pastikan backend TripMate sedang berjalan.'
  } finally {
    isGenerating.value = false
  }
}

function addItem() {
  const name = newItem.value.trim()
  if (!name) return

  items.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    packed: false,
  })

  newItem.value = ''
  errorMessage.value = ''
  successMessage.value = 'Barang berhasil ditambahkan.'
}

function deleteItem(id) {
  items.value = items.value.filter((item) => item.id !== id)
}

function clearItems() {
  if (items.value.length === 0) return

  if (!window.confirm('Hapus semua barang dari packing list ini?')) return

  items.value = []
  successMessage.value = 'Semua barang berhasil dihapus.'
  errorMessage.value = ''
}
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-4xl">
      <div class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          Persiapan perjalanan
        </p>
        <h1 class="mt-2 text-3xl font-bold text-[#263951] sm:text-4xl">Packing List</h1>
        <p class="mt-3 text-[#52657d]">Siapkan barang bawaan berdasarkan rencana perjalananmu.</p>
      </div>

      <section class="mb-6 rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:p-7">
        <div class="mb-5 flex items-center gap-3">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl"
          >
            ✨
          </div>
          <div>
            <h2 class="text-xl font-bold text-[#263951]">Buat Packing List dengan AI</h2>
            <p class="mt-1 text-sm text-slate-500">
              AI dapat menggunakan informasi tiket dan itinerary yang tersimpan.
            </p>
          </div>
        </div>

        <div class="mb-5 space-y-2">
          <div
            class="rounded-xl border p-3 text-sm"
            :class="
              linkedContext.hasFlight
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-slate-200 bg-white text-slate-500'
            "
          >
            <strong>{{ linkedContext.hasFlight ? '✓' : '○' }} Tiket penerbangan</strong>
            <p class="mt-1">
              {{
                linkedContext.hasFlight
                  ? 'Informasi tiket ditemukan di browser.'
                  : 'Belum ada data tiket yang tersimpan. Kamu tetap bisa melanjutkan.'
              }}
            </p>
          </div>

          <div
            class="rounded-xl border p-3 text-sm"
            :class="
              linkedContext.hasItinerary
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-slate-200 bg-white text-slate-500'
            "
          >
            <strong>{{ linkedContext.hasItinerary ? '✓' : '○' }} Itinerary perjalanan</strong>
            <p class="mt-1">
              {{
                linkedContext.hasItinerary
                  ? 'Aktivitas dari itinerary tersimpan ditemukan.'
                  : 'Belum ada itinerary tersimpan. Kamu tetap bisa membuat daftar.'
              }}
            </p>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="generatePackingList">
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-[#263951]"> Tujuan perjalanan </span>
            <input
              v-model="destination"
              type="text"
              required
              maxlength="100"
              placeholder="Contoh: Bali, Jepang, atau Yogyakarta"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="mb-2 block text-sm font-semibold text-[#263951]">
                Durasi perjalanan
              </span>
              <div class="flex items-center gap-3">
                <input
                  v-model.number="duration"
                  type="number"
                  min="1"
                  max="90"
                  required
                  class="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
                />
                <span class="text-sm text-slate-500">hari</span>
              </div>
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-semibold text-[#263951]">
                Jenis perjalanan
              </span>
              <select
                v-model="tripType"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
              >
                <option value="liburan">Liburan</option>
                <option value="bisnis">Bisnis</option>
                <option value="petualangan">Petualangan</option>
                <option value="keluarga">Wisata keluarga</option>
                <option value="pantai">Wisata pantai</option>
                <option value="pegunungan">Wisata pegunungan</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            :disabled="isGenerating"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{{ isGenerating ? '⏳' : '✨' }}</span>
            {{ isGenerating ? 'AI sedang membuat daftar...' : 'Generate Packing List' }}
          </button>

          <p class="text-xs leading-5 text-slate-500">
            Generate baru mengganti daftar yang sedang tampil jika berhasil. Pastikan daftar lama
            tidak lagi diperlukan sebelum membuat daftar baru.
          </p>
        </form>
      </section>

      <section class="rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:p-7">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-[#263951]">Barang bawaan</h2>
            <p class="mt-1 text-sm text-slate-500">
              {{ packedCount }} dari {{ items.length }} barang sudah dikemas
            </p>
          </div>
          <span class="text-2xl font-bold text-[#347bd0]">{{ progress }}%</span>
        </div>

        <div class="mb-7 h-3 overflow-hidden rounded-full bg-blue-100">
          <div
            class="h-full rounded-full bg-[#347bd0] transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>

        <div
          v-if="successMessage"
          role="status"
          class="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {{ successMessage }}
        </div>

        <div
          v-if="errorMessage"
          role="alert"
          class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <form class="mb-6 flex flex-col gap-3 sm:flex-row" @submit.prevent="addItem">
          <input
            v-model="newItem"
            type="text"
            maxlength="150"
            placeholder="Contoh: Baju ganti"
            aria-label="Nama barang"
            class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            class="rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Tambah Barang
          </button>
        </form>

        <div
          v-if="items.length === 0"
          class="rounded-xl border border-dashed border-blue-200 p-8 text-center"
        >
          <p class="text-lg font-semibold text-[#263951]">Belum ada barang</p>
          <p class="mt-2 text-sm text-slate-500">
            Generate daftar dengan AI atau tambahkan barang secara manual.
          </p>
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="item in items"
            :key="item.id"
            class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <input
              v-model="item.packed"
              type="checkbox"
              :aria-label="`Tandai ${item.name} sudah dikemas`"
              class="h-5 w-5 shrink-0 accent-[#347bd0]"
            />
            <span
              class="min-w-0 flex-1 break-words text-[#263951]"
              :class="{ 'text-slate-400 line-through': item.packed }"
            >
              {{ item.name }}
            </span>
            <button
              type="button"
              class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              :aria-label="`Hapus ${item.name}`"
              @click="deleteItem(item.id)"
            >
              Hapus
            </button>
          </li>
        </ul>

        <div v-if="items.length > 0" class="mt-5 flex justify-end border-t border-slate-200 pt-4">
          <button
            type="button"
            class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            @click="clearItems"
          >
            Hapus Semua Barang
          </button>
        </div>

        <p class="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          Daftar dan status checklist tersimpan otomatis di browser. Data ini belum menggunakan
          database.
        </p>
      </section>
    </section>
  </main>
</template>
