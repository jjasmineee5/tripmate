<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import tripmateLogo from './assets/images/TripMate logo.png'

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const currentUser = ref(null)

const navLinks = [
  { label: 'Beranda', path: '/' },
  { label: 'Cari Tiket', path: '/flights' },
  { label: 'Itinerary', path: '/itinerary' },
  { label: 'Packing List', path: '/packing-list' },
  { label: 'Destinasi', path: '/destinations' },
]

const isLoggedIn = computed(() => currentUser.value !== null)

function loadCurrentUser() {
  try {
    const savedUser = localStorage.getItem('tripmate-current-user')
    currentUser.value = savedUser ? JSON.parse(savedUser) : null
  } catch {
    currentUser.value = null
  }
}

function handleStorageChange(event) {
  if (event.key === 'tripmate-current-user' || event.key === null) {
    loadCurrentUser()
  }
}

function logout() {
  localStorage.removeItem('tripmate-current-user')
  currentUser.value = null
  menuOpen.value = false
  router.push('/')
}

watch(
  () => route.fullPath,
  () => {
    loadCurrentUser()
    menuOpen.value = false
  },
)

onMounted(() => {
  loadCurrentUser()
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('focus', loadCurrentUser)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('focus', loadCurrentUser)
})
</script>

<template>
  <div class="min-h-screen w-full bg-[#dceafa]">
    <header class="relative z-20 w-full bg-[#f5f9ff]">
      <nav
        class="mx-auto flex min-h-[72px] w-full max-w-[1440px] items-center justify-between gap-5 px-5 lg:px-8"
      >
        <RouterLink to="/" aria-label="TripMate Beranda" class="shrink-0">
          <img :src="tripmateLogo" alt="TripMate" class="h-[75px] w-[222px] object-contain" />
        </RouterLink>

        <div class="hidden items-center gap-7 lg:flex">
          <RouterLink
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="border-b-2 py-2 text-[15px] transition"
            :class="
              route.path === link.path
                ? 'border-[#347bd0] font-semibold text-[#263951]'
                : 'border-transparent text-[#263951] hover:border-[#347bd0]'
            "
          >
            {{ link.label }}
          </RouterLink>
        </div>

        <div class="hidden shrink-0 items-center gap-2 md:flex">
          <template v-if="!isLoggedIn">
            <RouterLink
              to="/login"
              class="rounded-full border border-[#347bd0] px-6 py-2 text-sm text-[#347bd0] transition hover:bg-blue-50"
            >
              Login
            </RouterLink>

            <RouterLink
              to="/register"
              class="rounded-full bg-[#347bd0] px-6 py-2 text-sm text-white transition hover:bg-blue-700"
            >
              Daftar
            </RouterLink>
          </template>

          <template v-else>
            <span class="max-w-[150px] truncate text-sm font-semibold text-[#263951]">
              Hai, {{ currentUser.name }}
            </span>

            <button
              type="button"
              class="rounded-full border border-[#347bd0] px-5 py-2 text-sm text-[#347bd0] transition hover:bg-blue-50"
              @click="logout"
            >
              Keluar
            </button>
          </template>
        </div>

        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-2 text-xl md:hidden"
          :aria-expanded="menuOpen"
          aria-label="Buka menu navigasi"
          @click="menuOpen = !menuOpen"
        >
          {{ menuOpen ? '✕' : '☰' }}
        </button>
      </nav>

      <div v-if="menuOpen" class="border-t border-slate-200 bg-[#f5f9ff] p-4 md:hidden">
        <div class="flex flex-col gap-1">
          <RouterLink
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="rounded-lg px-3 py-3 text-sm hover:bg-blue-50"
            @click="menuOpen = false"
          >
            {{ link.label }}
          </RouterLink>

          <template v-if="!isLoggedIn">
            <RouterLink
              to="/login"
              class="rounded-lg px-3 py-3 text-sm hover:bg-blue-50"
              @click="menuOpen = false"
            >
              Login
            </RouterLink>

            <RouterLink
              to="/register"
              class="rounded-lg bg-[#347bd0] px-3 py-3 text-center text-sm text-white"
              @click="menuOpen = false"
            >
              Daftar
            </RouterLink>
          </template>

          <template v-else>
            <div class="px-3 py-3 text-sm font-semibold text-[#263951]">
              Hai, {{ currentUser.name }}
            </div>

            <button
              type="button"
              class="rounded-lg border border-[#347bd0] px-3 py-3 text-left text-sm text-[#347bd0]"
              @click="logout"
            >
              Keluar
            </button>
          </template>
        </div>
      </div>
    </header>

    <main class="w-full">
      <RouterView />
    </main>

    <footer class="w-full bg-gradient-to-b from-[#293f58] to-[#3478ba] text-white">
      <div
        class="mx-auto grid w-full max-w-[1280px] gap-8 px-6 py-10 md:grid-cols-2 lg:grid-cols-[2fr_0.8fr_1fr_1fr] lg:px-10"
      >
        <div class="lg:pr-8">
          <RouterLink to="/" aria-label="TripMate Beranda" class="inline-block">
            <img :src="tripmateLogo" alt="TripMate" class="h-[105px] w-[290px] object-contain" />
          </RouterLink>
          <p class="mt-3 max-w-sm text-base leading-relaxed text-blue-100">
            Rencanakan perjalananmu dengan mudah bersama TripMate.
          </p>
        </div>

        <div class="border-white/20 lg:border-l lg:pl-8">
          <h2 class="mb-3 font-semibold">Jelajahi</h2>
          <div class="flex flex-col items-start gap-2 text-sm text-blue-100">
            <RouterLink
              v-for="link in navLinks"
              :key="link.path"
              :to="link.path"
              class="hover:text-white"
            >
              {{ link.label }}
            </RouterLink>
          </div>
        </div>

        <div class="border-white/20 lg:border-l lg:pl-8">
          <h2 class="mb-3 font-semibold">Hubungi Kami</h2>
          <a href="mailto:hello@tripmate.example" class="text-sm text-blue-100 hover:text-white">
            ✉ Email
          </a>
          <h3 class="mb-2 mt-4 font-semibold tracking-widest">Ikuti Kami</h3>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
            class="text-sm text-blue-100 hover:text-white"
          >
            ◎ Instagram
          </a>
        </div>

        <div class="border-white/20 lg:border-l lg:pl-8">
          <h2 class="mb-3 font-semibold">Tentang &amp; Bantuan</h2>
          <div class="flex flex-col gap-3 text-sm text-blue-100">
            <RouterLink to="/about" class="hover:text-white">Tentang Kami</RouterLink>
            <RouterLink to="/help" class="hover:text-white">Pusat Bantuan</RouterLink>
          </div>
        </div>
      </div>

      <div
        class="mx-auto w-full max-w-[1200px] border-t border-white/20 px-5 py-5 text-center text-sm text-blue-100"
      >
        © 2026 TripMate. All rights reserved.
      </div>
    </footer>
  </div>
</template>
