<script setup>
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'tripmate-trips'

const showForm = ref(false)
const message = ref('')
const editingId = ref(null)

const trips = ref([])
const form = ref({
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  notes: '',
})

function loadTrips() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    trips.value = saved ? JSON.parse(saved) : []

    if (!Array.isArray(trips.value)) {
      trips.value = []
    }
  } catch {
    trips.value = []
  }
}

watch(
  trips,
  (newTrips) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTrips))
  },
  { deep: true },
)

const formTitle = computed(() =>
  editingId.value === null ? 'Tambah Perjalanan' : 'Edit Perjalanan',
)

function resetForm() {
  form.value = {
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    notes: '',
  }
  editingId.value = null
  message.value = ''
}

function toggleForm() {
  if (showForm.value) {
    showForm.value = false
    resetForm()
    return
  }

  resetForm()
  showForm.value = true
}

function saveTrip() {
  const name = form.value.name.trim()
  const destination = form.value.destination.trim()

  if (!name || !destination || !form.value.startDate || !form.value.endDate) {
    message.value = 'Lengkapi nama trip, destinasi, dan tanggal perjalanan.'
    return
  }

  if (form.value.endDate < form.value.startDate) {
    message.value = 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
    return
  }

  if (editingId.value !== null) {
    const index = trips.value.findIndex((trip) => trip.id === editingId.value)

    if (index !== -1) {
      trips.value[index] = {
        ...trips.value[index],
        ...form.value,
        name,
        destination,
      }
      message.value = 'Perjalanan berhasil diperbarui!'
    }
  } else {
    trips.value.push({
      id: Date.now(),
      ...form.value,
      name,
      destination,
      createdAt: new Date().toISOString(),
    })
    message.value = 'Perjalanan berhasil ditambahkan!'
  }

  showForm.value = false
  resetForm()
}

function editTrip(trip) {
  editingId.value = trip.id
  form.value = {
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    notes: trip.notes || '',
  }
  message.value = ''
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function deleteTrip(id) {
  const confirmed = window.confirm('Yakin ingin menghapus perjalanan ini?')

  if (!confirmed) return

  trips.value = trips.value.filter((trip) => trip.id !== id)
  message.value = 'Perjalanan berhasil dihapus.'
}

function formatDate(dateString) {
  if (!dateString) return '-'

  return new Date(`${dateString}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

loadTrips()
</script>

<template>
  <div class="min-h-[60vh] bg-[#dceafa]">
    <section class="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
      <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">My Trip</p>
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
          {{ showForm ? 'Batal' : '+ Tambah Trip' }}
        </button>
      </div>

      <div
        v-if="message"
        class="mt-6 rounded-xl border border-blue-200 bg-white p-4 text-sm text-[#263951]"
        role="status"
      >
        {{ message }}
      </div>

      <section v-if="showForm" class="mt-8 rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:p-8">
        <h2 class="text-xl font-bold text-[#263951]">
          {{ formTitle }}
        </h2>

        <form class="mt-6 space-y-5" @submit.prevent="saveTrip">
          <div class="grid gap-5 sm:grid-cols-2">
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

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700"> Destinasi </span>
              <input
                v-model="form.destination"
                type="text"
                required
                maxlength="100"
                placeholder="Contoh: Bali, Indonesia"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700"> Tanggal mulai </span>
              <input
                v-model="form.startDate"
                type="date"
                required
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-700"> Tanggal selesai </span>
              <input
                v-model="form.endDate"
                type="date"
                required
                :min="form.startDate || undefined"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

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

          <div class="flex flex-wrap gap-3">
            <button
              type="submit"
              class="rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              {{ editingId === null ? 'Simpan Perjalanan' : 'Simpan Perubahan' }}
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

      <section class="mt-8">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-xl font-bold text-[#263951]">Daftar Perjalanan</h2>
          <span class="rounded-full bg-white px-4 py-2 text-sm font-medium text-blue-700">
            {{ trips.length }} trip
          </span>
        </div>

        <div
          v-if="trips.length === 0"
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

        <div v-else class="grid gap-5 md:grid-cols-2">
          <article
            v-for="trip in trips"
            :key="trip.id"
            class="rounded-2xl border border-white bg-[#f5f9ff] p-5 shadow-sm transition hover:shadow-md sm:p-6"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <span class="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Rencana Perjalanan
                </span>
                <h3 class="mt-2 text-xl font-bold text-[#263951]">
                  {{ trip.name }}
                </h3>
                <p class="mt-1 text-sm text-slate-600">
                  <span aria-hidden="true">📍</span>
                  {{ trip.destination }}
                </p>
              </div>
              <span class="text-2xl" aria-hidden="true">🧳</span>
            </div>

            <div class="mt-5 rounded-xl bg-blue-50 p-4">
              <p class="text-xs font-medium text-slate-500">Tanggal perjalanan</p>
              <p class="mt-1 text-sm font-semibold text-[#263951]">
                {{ formatDate(trip.startDate) }}
                <span class="px-1 text-blue-500">→</span>
                {{ formatDate(trip.endDate) }}
              </p>
            </div>

            <p
              v-if="trip.notes"
              class="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600"
            >
              {{ trip.notes }}
            </p>

            <div class="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
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
                @click="deleteTrip(trip.id)"
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
