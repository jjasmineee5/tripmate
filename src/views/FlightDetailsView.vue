<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const selectedFlight = ref(null)
const invalidData = ref(false)

try {
  const savedFlight = localStorage.getItem('tripmate-selected-flight')

  if (savedFlight) {
    selectedFlight.value = JSON.parse(savedFlight)
  } else {
    invalidData.value = true
  }
} catch {
  invalidData.value = true
}

const formattedPrice = computed(() => {
  if (!selectedFlight.value) return ''

  return selectedFlight.value.totalPrice.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
})

function backToFlights() {
  router.push('/flights')
}
</script>

<template>
  <main class="min-h-[70vh] bg-[#dceafa] px-5 py-10 sm:px-8">
    <section class="mx-auto max-w-3xl">
      <button
        type="button"
        class="mb-6 font-semibold text-[#347bd0] hover:underline"
        @click="backToFlights"
      >
        ← Kembali ke pencarian
      </button>

      <div v-if="invalidData" class="rounded-3xl bg-[#f5f9ff] p-8 text-center shadow-sm">
        <h1 class="text-2xl font-bold text-[#263951]">Penerbangan belum dipilih</h1>

        <p class="mt-3 text-[#52657d]">Silakan cari dan pilih penerbangan terlebih dahulu.</p>

        <button
          type="button"
          class="mt-6 rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white hover:bg-blue-700"
          @click="backToFlights"
        >
          Cari Penerbangan
        </button>
      </div>

      <div v-else-if="selectedFlight" class="rounded-3xl bg-[#f5f9ff] p-6 shadow-sm sm:p-8">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          TripMate · Detail perjalanan
        </p>

        <h1 class="mt-2 text-3xl font-bold text-[#263951]">Detail Penerbangan</h1>

        <p class="mt-3 text-[#52657d]">Periksa kembali penerbangan yang kamu pilih.</p>

        <div class="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-xl font-bold text-[#263951]">
                {{ selectedFlight.airline }}
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                {{ selectedFlight.code }}
              </p>
            </div>

            <span class="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#347bd0]">
              Penerbangan langsung
            </span>
          </div>

          <div class="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div>
              <p class="text-2xl font-bold text-[#263951]">
                {{ selectedFlight.departure }}
              </p>
              <p class="mt-1 font-semibold text-[#263951]">
                {{ selectedFlight.origin }}
              </p>
              <p class="mt-1 text-sm text-slate-500">Waktu berangkat</p>
            </div>

            <div class="text-center text-2xl text-[#347bd0]">→</div>

            <div class="text-right">
              <p class="text-2xl font-bold text-[#263951]">
                {{ selectedFlight.arrival }}
              </p>
              <p class="mt-1 font-semibold text-[#263951]">
                {{ selectedFlight.destination }}
              </p>
              <p class="mt-1 text-sm text-slate-500">Waktu tiba</p>
            </div>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <h2 class="text-lg font-bold text-[#263951]">Ringkasan perjalanan</h2>

          <div class="flex justify-between gap-4 border-b border-slate-200 pb-3">
            <span class="text-[#52657d]">Tanggal keberangkatan</span>
            <span class="text-right font-semibold text-[#263951]">
              {{ selectedFlight.departureDate }}
            </span>
          </div>

          <div
            v-if="selectedFlight.returnDate"
            class="flex justify-between gap-4 border-b border-slate-200 pb-3"
          >
            <span class="text-[#52657d]">Tanggal pulang</span>
            <span class="text-right font-semibold text-[#263951]">
              {{ selectedFlight.returnDate }}
            </span>
          </div>

          <div class="flex justify-between gap-4 border-b border-slate-200 pb-3">
            <span class="text-[#52657d]">Jumlah penumpang</span>
            <span class="font-semibold text-[#263951]">
              {{ selectedFlight.passengers }} orang
            </span>
          </div>

          <div class="flex justify-between gap-4 pt-2">
            <span class="font-semibold text-[#263951]"> Total harga simulasi </span>
            <span class="text-xl font-bold text-[#347bd0]">
              {{ formattedPrice }}
            </span>
          </div>
        </div>

        <p class="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Ini adalah data simulasi untuk pengembangan TripMate. Penerbangan dan harga belum
          terhubung ke penyedia tiket aktual.
        </p>

        <button
          type="button"
          class="mt-6 w-full rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          @click="router.push('/booking')"
        >
          Lanjut ke Pemesanan
        </button>
      </div>
    </section>
  </main>
</template>
