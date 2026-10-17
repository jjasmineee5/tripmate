```vue
<script setup>
import { computed, ref, watch } from 'vue'

const storageKey = 'tripmate-packing-items'

const newItem = ref('')
const items = ref([])
const loaded = ref(false)

try {
  const savedItems = localStorage.getItem(storageKey)
  if (savedItems) {
    items.value = JSON.parse(savedItems)
  }
} catch {
  items.value = []
}

loaded.value = true

watch(
  items,
  (value) => {
    if (loaded.value) {
      localStorage.setItem(storageKey, JSON.stringify(value))
    }
  },
  { deep: true },
)

const packedCount = computed(() => items.value.filter((item) => item.packed).length)

const progress = computed(() => {
  if (items.value.length === 0) return 0
  return Math.round((packedCount.value / items.value.length) * 100)
})

function addItem() {
  const name = newItem.value.trim()

  if (!name) return

  items.value.push({
    id: Date.now(),
    name,
    packed: false,
  })

  newItem.value = ''
}

function deleteItem(id) {
  items.value = items.value.filter((item) => item.id !== id)
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
        <p class="mt-3 text-[#52657d]">Catat barang bawaanmu agar tidak ada yang tertinggal.</p>
      </div>

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

        <form class="mb-6 flex flex-col gap-3 sm:flex-row" @submit.prevent="addItem">
          <input
            v-model="newItem"
            type="text"
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
          <p class="mt-2 text-sm text-slate-500">Tambahkan barang pertama yang ingin kamu bawa.</p>
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
              class="h-5 w-5 accent-[#347bd0]"
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
      </section>
    </section>
  </main>
</template>
