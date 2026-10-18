<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const selectedFlight = ref(null)
const invalidData = ref(false)

try {
  const saved = localStorage.getItem('tripmate-selected-flight')
  selectedFlight.value = saved ? JSON.parse(saved) : null

  if (!selectedFlight.value) invalidData.value = true
} catch {
  invalidData.value = true
}

const outbound = computed(() => selectedFlight.value?.outboundFlight || selectedFlight.value)

const returnFlight = computed(() => selectedFlight.value?.returnFlight || null)

function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(price) || 0)
}

function formatDate(dateString) {
  if (!dateString) return 'Belum dipilih'
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const totalPrice = computed(() => {
  if (!selectedFlight.value) return 0
  return Number(selectedFlight.value.totalPrice) || 0
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

      <div v-else class="rounded-3xl bg-[#f5f9ff] p-6 shadow-sm sm:p-8">
        <p class="text-sm font-semibold uppercase tracking-widest text-[#347bd0]">
          TripMate · Detail perjalanan
        </p>
        <h1 class="mt-2 text-3xl font-bold text-[#263951]">Detail Penerbangan</h1>
        <p class="mt-3 text-[#52657d]">Periksa kembali penerbangan yang kamu pilih.</p>

        <section class="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-blue-700">
                Penerbangan pergi
              </p>
              <h2 class="mt-2 text-xl font-bold text-[#263951]">{{ outbound?.airline }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ outbound?.code }}</p>
            </div>
            <span class="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#347bd0]">
              {{ formatDate(outbound?.departureDate) }}
            </span>
          </div>

          <div class="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div>
              <p class="text-2xl font-bold text-[#263951]">{{ outbound?.departure }}</p>
              <p class="mt-1 font-semibold text-[#263951]">
                {{ outbound?.origin || selectedFlight?.origin }}
              </p>
              <p class="mt-1 text-sm text-slate-500">Berangkat</p>
            </div>
            <div class="text-center text-2xl text-[#347bd0]">→</div>
            <div class="text-right">
              <p class="text-2xl font-bold text-[#263951]">{{ outbound?.arrival }}</p>
              <p class="mt-1 font-semibold text-[#263951]">
                {{ outbound?.destination || selectedFlight?.destination }}
              </p>
              <p class="mt-1 text-sm text-slate-500">Tiba</p>
            </div>
          </div>

          <p class="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            Harga pergi: {{ formatPrice(selectedFlight?.outboundPrice ?? outbound?.totalPrice) }}
          </p>
        </section>

        <section v-if="returnFlight" class="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Penerbangan pulang
              </p>
              <h2 class="mt-2 text-xl font-bold text-[#263951]">{{ returnFlight.airline }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ returnFlight.code }}</p>
            </div>
            <span
              class="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
            >
              {{ formatDate(returnFlight.departureDate) }}
            </span>
          </div>

          <div class="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div>
              <p class="text-2xl font-bold text-[#263951]">{{ returnFlight.departure }}</p>
              <p class="mt-1 font-semibold text-[#263951]">{{ returnFlight.origin }}</p>
              <p class="mt-1 text-sm text-slate-500">Berangkat</p>
            </div>
            <div class="text-center text-2xl text-[#347bd0]">→</div>
            <div class="text-right">
              <p class="text-2xl font-bold text-[#263951]">{{ returnFlight.arrival }}</p>
              <p class="mt-1 font-semibold text-[#263951]">{{ returnFlight.destination }}</p>
              <p class="mt-1 text-sm text-slate-500">Tiba</p>
            </div>
          </div>

          <p class="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            Harga pulang: {{ formatPrice(selectedFlight?.returnPrice) }}
          </p>
        </section>

        <section class="mt-6 space-y-4">
          <h2 class="text-lg font-bold text-[#263951]">Ringkasan perjalanan</h2>

          <div class="flex justify-between gap-4 border-b border-slate-200 pb-3">
            <span class="text-[#52657d]">Asal dan tujuan</span>
            <span class="text-right font-semibold text-[#263951]">
              {{ selectedFlight?.origin }} → {{ selectedFlight?.destination }}
            </span>
          </div>

          <div class="flex justify-between gap-4 border-b border-slate-200 pb-3">
            <span class="text-[#52657d]">Tanggal berangkat</span>
            <span class="text-right font-semibold text-[#263951]">{{
              formatDate(outbound?.departureDate)
            }}</span>
          </div>

          <div
            v-if="selectedFlight?.returnDate"
            class="flex justify-between gap-4 border-b border-slate-200 pb-3"
          >
            <span class="text-[#52657d]">Tanggal pulang</span>
            <span class="text-right font-semibold text-[#263951]">{{
              formatDate(selectedFlight.returnDate)
            }}</span>
          </div>

          <div class="flex justify-between gap-4 border-b border-slate-200 pb-3">
            <span class="text-[#52657d]">Penumpang</span>
            <span class="font-semibold text-[#263951]">{{ selectedFlight?.passengers }} orang</span>
          </div>

          <div class="flex justify-between gap-4 pt-2">
            <span class="font-semibold text-[#263951]">Total harga simulasi</span>
            <span class="text-xl font-bold text-[#347bd0]">{{ formatPrice(totalPrice) }}</span>
          </div>
        </section>

        <p class="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Data penerbangan dan harga merupakan simulasi. Periksa kembali data sebelum bepergian.
        </p>

        <button
          type="button"
          class="mt-6 w-full rounded-xl bg-[#347bd0] px-6 py-3 font-semibold text-white hover:bg-blue-700"
          @click="router.push('/booking')"
        >
          Lanjut ke Pemesanan
        </button>
      </div>
    </section>
  </main>
</template>
