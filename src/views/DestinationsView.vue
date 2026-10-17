```vue
<script setup>
import { computed, ref } from 'vue'

const searchQuery = ref('')
const selectedCategory = ref('Semua')

const categories = ['Semua', 'Pantai', 'Pegunungan', 'Kota', 'Budaya']

const destinations = [
  {
    id: 1,
    name: 'Bali',
    location: 'Bali, Indonesia',
    category: 'Pantai',
    description: 'Nikmati pantai tropis, budaya lokal, dan matahari terbenam.',
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'Raja Ampat',
    location: 'Papua Barat Daya, Indonesia',
    category: 'Pantai',
    description: 'Jelajahi keindahan laut dan pulau-pulau tropis.',
    image:
      'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: 'Gunung Bromo',
    location: 'Jawa Timur, Indonesia',
    category: 'Pegunungan',
    description: 'Saksikan panorama pegunungan dan matahari terbit.',
    image:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    name: 'Yogyakarta',
    location: 'DI Yogyakarta, Indonesia',
    category: 'Budaya',
    description: 'Temukan warisan budaya, kuliner, dan tempat bersejarah.',
    image:
      'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 5,
    name: 'Jakarta',
    location: 'DKI Jakarta, Indonesia',
    category: 'Kota',
    description: 'Jelajahi pusat kuliner, hiburan, dan kehidupan perkotaan.',
    image:
      'https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 6,
    name: 'Danau Toba',
    location: 'Sumatera Utara, Indonesia',
    category: 'Pegunungan',
    description: 'Nikmati pemandangan danau luas serta budaya Batak.',
    image:
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80',
  },
]

const filteredDestinations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return destinations.filter((destination) => {
    const matchesCategory =
      selectedCategory.value === 'Semua' || destination.category === selectedCategory.value

    const matchesQuery =
      !query ||
      destination.name.toLowerCase().includes(query) ||
      destination.location.toLowerCase().includes(query)

    return matchesCategory && matchesQuery
  })
})

function planTrip(destination) {
  localStorage.setItem(
    'tripmate-selected-destination',
    JSON.stringify({
      name: destination.name,
      location: destination.location,
    }),
  )

  window.alert(
    `Destinasi ${destination.name} tersimpan. Kamu bisa menggunakannya saat merencanakan perjalanan.`,
  )
}

function resetSearch() {
  searchQuery.value = ''
  selectedCategory.value = 'Semua'
}
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-7xl">
      <div class="mb-8 text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          Temukan tempat baru
        </p>
        <h1 class="mt-2 text-3xl font-bold text-[#263951] sm:text-4xl">Jelajahi Destinasi</h1>
        <p class="mx-auto mt-3 max-w-2xl text-[#52657d]">
          Temukan inspirasi liburan dan pilih destinasi yang ingin kamu kunjungi bersama TripMate.
        </p>
      </div>

      <section class="mb-8 rounded-2xl bg-[#f5f9ff] p-5 shadow-sm sm:p-6">
        <label class="mb-2 block text-sm font-semibold text-[#263951]" for="destination-search">
          Cari destinasi
        </label>

        <input
          id="destination-search"
          v-model="searchQuery"
          type="search"
          placeholder="Cari nama kota atau lokasi..."
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#347bd0] focus:ring-2 focus:ring-blue-100"
        />

        <div class="mt-5 flex flex-wrap gap-2">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="
              selectedCategory === category
                ? 'bg-[#347bd0] text-white'
                : 'border border-blue-200 bg-white text-[#347bd0] hover:bg-blue-50'
            "
            @click="selectedCategory = category"
          >
            {{ category }}
          </button>
        </div>
      </section>

      <div class="mb-5 flex items-center justify-between gap-3">
        <h2 class="text-xl font-bold text-[#263951]">Inspirasi perjalanan</h2>
        <p class="text-sm text-[#52657d]">{{ filteredDestinations.length }} destinasi</p>
      </div>

      <div v-if="filteredDestinations.length > 0" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="destination in filteredDestinations"
          :key="destination.id"
          class="overflow-hidden rounded-2xl bg-[#f5f9ff] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <img
            :src="destination.image"
            :alt="destination.name"
            loading="lazy"
            class="h-52 w-full object-cover"
          />

          <div class="p-5">
            <div class="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 class="text-xl font-bold text-[#263951]">
                  {{ destination.name }}
                </h3>
                <p class="mt-1 text-sm text-slate-500">
                  {{ destination.location }}
                </p>
              </div>

              <span
                class="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-[#347bd0]"
              >
                {{ destination.category }}
              </span>
            </div>

            <p class="min-h-12 text-sm leading-relaxed text-[#52657d]">
              {{ destination.description }}
            </p>

            <button
              type="button"
              class="mt-5 w-full rounded-xl bg-[#347bd0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              @click="planTrip(destination)"
            >
              Pilih Destinasi
            </button>
          </div>
        </article>
      </div>

      <div v-else class="rounded-2xl bg-[#f5f9ff] p-10 text-center">
        <h3 class="text-lg font-bold text-[#263951]">Destinasi tidak ditemukan</h3>
        <p class="mt-2 text-sm text-slate-500">Coba kata kunci atau kategori yang berbeda.</p>

        <button
          type="button"
          class="mt-4 rounded-xl bg-[#347bd0] px-5 py-3 text-sm font-semibold text-white"
          @click="resetSearch"
        >
          Reset Pencarian
        </button>
      </div>
    </section>
  </main>
</template>
