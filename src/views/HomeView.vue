<script setup>
import { ref } from 'vue'
import heroImage from '../assets/images/hero beranda.png'

const origin = ref('Balikpapan (BPN)')
const destination = ref('Bali (DPS)')
const departureDate = ref('')
const passengers = ref(1)

function searchFlights() {
  if (!origin.value || !destination.value || !departureDate.value) {
    alert('Lengkapi kota asal, kota tujuan, dan tanggal keberangkatan.')
    return
  }

  if (origin.value === destination.value) {
    alert('Kota asal dan tujuan harus berbeda.')
    return
  }

  alert(
    `Pencarian tiket demo:\n${origin.value} → ${destination.value}\nTanggal: ${departureDate.value}\nPenumpang: ${passengers.value} dewasa`,
  )
}

const features = [
  {
    icon: '♧',
    title: 'Tiket Penerbangan Terpercaya',
    description: 'Temukan harga terbaik dari berbagai maskapai.',
  },
  {
    icon: '✧',
    title: 'Itinerary Berbasis AI',
    description: 'Rekomendasi perjalanan sesuai preferensimu.',
  },
  {
    icon: '♧',
    title: 'Packing List Otomatis',
    description: 'Jangan lupa barang penting lagi!',
  },
  {
    icon: '♡',
    title: 'Perjalanan Lebih Terorganisir',
    description: 'Semua rencana perjalanan dalam satu tempat.',
  },
]

const destinations = [
  {
    name: 'Pura Ulun Danu Baratan',
    location: 'Bali, Indonesia',
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Gunung Fuji',
    location: 'Yamanashi, Jepang',
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Menara Eiffel',
    location: 'Paris, Prancis',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=85',
  },
  {
    name: 'Raja Ampat',
    location: 'Papua Barat, Indonesia',
    image:
      'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=700&q=85',
  },
]
</script>

<template>
  <div class="bg-[#dceafa]">
    <!-- Hero -->
    <section
      class="relative h-[472px] w-full items-start bg-cover bg-center"
      :style="{
        backgroundImage: `linear-gradient(rgba(38, 57, 81, 0.38), rgba(38, 57, 81, 0.38)), url('${heroImage}')`,
      }"
    >
      <div class="mx-auto w-full max-w-[1440px] px-[5.3%] pb-40 pt-14">
        <div class="max-w-xl text-white">
          <h1 class="max-w-[520px] text-3xl font-semibold leading-tight sm:text-[34px]">
            Rencanakan perjalananmu dengan lebih mudah.
          </h1>
          <p class="mt-2 max-w-lg text-sm tracking-wide text-white/95">
            Temukan tiket penerbangan terbaik, dapatkan itinerary personal berbasis AI, dan siapkan
            packing list dalam satu platform.
          </p>
          <a
            href="#pencarian"
            class="mt-5 inline-flex rounded-full bg-[#347bd0] px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Mulai Merencanakan →
          </a>
        </div>
      </div>
    </section>

    <!-- Flight search -->
    <section
      id="pencarian"
      class="relative z-10 mx-auto -mt-[124px] w-full max-w-[1440px] px-[3.2%]"
    >
      <div class="rounded-[24px] bg-[#f5f9ff] p-6 shadow-xl sm:px-6 sm:py-5">
        <div
          class="mb-3 inline-flex border-b-2 border-blue-500 px-2 pb-2 text-sm font-medium text-blue-600"
        >
          ✈ Penerbangan
        </div>

        <form
          class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_0.75fr]"
          @submit.prevent="searchFlights"
        >
          <label class="rounded-xl border border-slate-200 p-3">
            <span class="block text-xs font-medium text-slate-600">Kota Asal</span>
            <span class="mt-2 flex items-center gap-2">
              <span>⌖</span>
              <input
                v-model.trim="origin"
                class="w-full min-w-0 bg-transparent text-sm outline-none"
                placeholder="Kota asal"
                required
              />
            </span>
          </label>

          <label class="rounded-xl border border-slate-200 p-3">
            <span class="block text-xs font-medium text-slate-600">Kota Tujuan</span>
            <span class="mt-2 flex items-center gap-2">
              <span>⌖</span>
              <input
                v-model.trim="destination"
                class="w-full min-w-0 bg-transparent text-sm outline-none"
                placeholder="Kota tujuan"
                required
              />
            </span>
          </label>

          <label class="rounded-xl border border-slate-200 p-3">
            <span class="block text-xs font-medium text-slate-600">Tanggal Keberangkatan</span>
            <input
              v-model="departureDate"
              type="date"
              class="mt-2 w-full min-w-0 bg-transparent text-sm outline-none"
              required
            />
          </label>

          <label class="rounded-xl border border-slate-200 p-3">
            <span class="block text-xs font-medium text-slate-600">Penumpang</span>
            <span class="mt-2 flex items-center gap-2">
              <span>♙</span>
              <select
                v-model.number="passengers"
                class="w-full bg-transparent text-sm outline-none"
              >
                <option :value="1">1 Dewasa</option>
                <option :value="2">2 Dewasa</option>
                <option :value="3">3 Dewasa</option>
                <option :value="4">4 Dewasa</option>
                <option :value="5">5 Dewasa</option>
              </select>
            </span>
          </label>
          <button
            type="submit"
            class="flex min-h-[62px] items-center justify-center gap-2 rounded-xl bg-[#347bd0] px-4 font-semibold text-white transition hover:bg-blue-700"
          >
            Cari Tiket <span>⌕</span>
          </button>
        </form>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-7xl px-6 pb-8 pt-6 lg:px-10">
      <h2 class="text-xl font-semibold text-[#263a53]">Semua yang Kamu Butuhkan untuk Traveling</h2>
      <p class="text-sm text-slate-600">
        Nikmati perjalanan yang lebih praktis dengan fitur pintar dari TripMate.
      </p>

      <div class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="feature in features" :key="feature.title" class="flex items-center gap-3">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/80 text-2xl text-blue-600"
          >
            {{ feature.icon }}
          </div>
          <div>
            <h3 class="text-xs font-bold leading-relaxed text-[#263a53]">
              {{ feature.title }}
            </h3>
            <p class="mt-1 text-[11px] leading-relaxed text-slate-700">
              {{ feature.description }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <!-- Promotion -->
    <section class="mx-auto max-w-6xl px-5 pb-10">
      <div
        class="grid gap-5 rounded-3xl bg-[#f5f9ff] p-5 sm:p-6 md:grid-cols-[1fr_1.2fr] md:items-center"
      >
        <div>
          <h2
            class="max-w-sm text-4xl font-semibold leading-[.95] tracking-tight text-[#263a53] sm:text-5xl"
          >
            Lebih dari pemesanan tiket
          </h2>
          <p class="mt-4 max-w-md text-xs leading-relaxed tracking-[.18em] text-slate-500">
            Nikmati perjalanan yang lebih praktis dengan TripMate. Temukan destinasi baru dan
            rencanakan perjalananmu dengan mudah.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <img
            class="h-24 w-full rounded-xl object-cover sm:h-28"
            src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80"
            alt="Pemandangan balon udara"
          />
          <img
            class="row-span-2 h-full min-h-52 w-full rounded-xl object-cover"
            src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=85"
            alt="Pemandangan pura di Bali"
          />
          <img
            class="h-24 w-full rounded-xl object-cover sm:h-28"
            src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80"
            alt="Bangunan bersejarah"
          />
        </div>
      </div>
    </section>

    <!-- Destinations -->
    <section class="mx-auto max-w-6xl px-5 pb-10">
      <h2 class="mb-5 text-xl font-semibold text-[#263a53]">
        Destinasi Favorit untuk Perjalananmu
      </h2>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="place in destinations"
          :key="place.name"
          class="rounded-2xl bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <img
            :src="place.image"
            :alt="place.name"
            class="h-36 w-full rounded-xl object-cover"
            loading="lazy"
          />
          <h3 class="mt-2 text-sm font-semibold text-[#263a53]">
            {{ place.name }}
          </h3>
          <p class="text-xs text-slate-500">{{ place.location }}</p>
        </article>
      </div>
    </section>
  </div>
</template>
