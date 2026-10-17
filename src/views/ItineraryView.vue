```vue
<script setup>
import { computed, ref, watch } from 'vue'

const storageKey = 'tripmate-itinerary'
const tripName = ref('')
const tripDate = ref('')
const activityName = ref('')
const activityTime = ref('09:00')
const activityLocation = ref('')
const activities = ref([])
const selectedDay = ref(1)

try {
  const saved = localStorage.getItem(storageKey)
  if (saved) {
    const data = JSON.parse(saved)
    tripName.value = data.tripName || ''
    tripDate.value = data.tripDate || ''
    activities.value = Array.isArray(data.activities) ? data.activities : []
    selectedDay.value = data.selectedDay || 1
  }
} catch {
  activities.value = []
}

watch(
  [tripName, tripDate, activities, selectedDay],
  () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        tripName: tripName.value,
        tripDate: tripDate.value,
        activities: activities.value,
        selectedDay: selectedDay.value,
      }),
    )
  },
  { deep: true },
)

const dayActivities = computed(() =>
  activities.value
    .filter((activity) => activity.day === selectedDay.value)
    .sort((a, b) => a.time.localeCompare(b.time)),
)

function addActivity() {
  if (!activityName.value.trim()) return

  activities.value.push({
    id: Date.now(),
    day: selectedDay.value,
    name: activityName.value.trim(),
    time: activityTime.value,
    location: activityLocation.value.trim(),
  })

  activityName.value = ''
  activityLocation.value = ''
  activityTime.value = '09:00'
}

function deleteActivity(id) {
  activities.value = activities.value.filter((activity) => activity.id !== id)
}
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-5xl">
      <div class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          Rencanakan petualanganmu
        </p>
        <h1 class="mt-2 text-3xl font-bold text-[#263951] sm:text-4xl">Itinerary Perjalanan</h1>
        <p class="mt-3 text-[#52657d]">
          Susun aktivitas perjalananmu agar setiap hari lebih terencana.
        </p>
      </div>

      <section class="mb-6 rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:p-7">
        <h2 class="mb-4 text-xl font-bold text-[#263951]">Informasi perjalanan</h2>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-[#263951]">Nama perjalanan</span>
            <input
              v-model="tripName"
              type="text"
              placeholder="Contoh: Liburan ke Bali"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-[#263951]">Tanggal mulai</span>
            <input
              v-model="tripDate"
              type="date"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            />
          </label>
        </div>
      </section>

      <section class="rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:p-7">
        <h2 class="mb-4 text-xl font-bold text-[#263951]">Rencana aktivitas</h2>

        <div class="mb-6 flex flex-wrap gap-2">
          <button
            v-for="day in 7"
            :key="day"
            type="button"
            class="rounded-full px-5 py-2 text-sm font-semibold transition"
            :class="
              selectedDay === day
                ? 'bg-[#347bd0] text-white'
                : 'border border-blue-200 bg-white text-[#347bd0] hover:bg-blue-50'
            "
            @click="selectedDay = day"
          >
            Hari {{ day }}
          </button>
        </div>

        <form class="mb-7 grid gap-3 sm:grid-cols-2" @submit.prevent="addActivity">
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-[#263951]">Nama aktivitas</span>
            <input
              v-model="activityName"
              type="text"
              required
              placeholder="Contoh: Mengunjungi pantai"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-[#263951]">Lokasi</span>
            <input
              v-model="activityLocation"
              type="text"
              placeholder="Contoh: Pantai Kuta"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-[#263951]">Waktu</span>
            <input
              v-model="activityTime"
              type="time"
              required
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0]"
            />
          </label>

          <div class="flex items-end">
            <button
              type="submit"
              class="w-full rounded-xl bg-[#347bd0] px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              + Tambah Aktivitas
            </button>
          </div>
        </form>

        <h3 class="mb-4 text-lg font-semibold text-[#263951]">Aktivitas Hari {{ selectedDay }}</h3>

        <div
          v-if="dayActivities.length === 0"
          class="rounded-xl border border-dashed border-blue-200 p-8 text-center"
        >
          <p class="font-semibold text-[#263951]">Belum ada aktivitas</p>
          <p class="mt-2 text-sm text-slate-500">Tambahkan aktivitas pertamamu untuk hari ini.</p>
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="activity in dayActivities"
            :key="activity.id"
            class="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div
              class="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-semibold text-[#347bd0]"
            >
              {{ activity.time }}
            </div>

            <div class="min-w-0 flex-1">
              <p class="break-words font-semibold text-[#263951]">{{ activity.name }}</p>
              <p class="mt-1 break-words text-sm text-slate-500">
                {{ activity.location || 'Lokasi belum ditentukan' }}
              </p>
            </div>

            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              @click="deleteActivity(activity.id)"
            >
              Hapus
            </button>
          </li>
        </ul>
      </section>
    </section>
  </main>
</template>
