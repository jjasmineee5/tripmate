import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TripsView from '../views/TripsView.vue'
import RegisterView from '../views/RegisterView.vue'
import LoginView from '../views/LoginView.vue'
import PackingListView from '../views/PackingListView.vue'
import ItineraryView from '../views/ItineraryView.vue'
import FlightsView from '../views/FlightsView.vue'
import DestinationsView from '../views/DestinationsView.vue'
import ProfileView from '../views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/trips',
      name: 'trips',
      component: TripsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('../views/AdminDashboardView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/packing-list',
      name: 'packing-list',
      component: PackingListView,
      meta: { requiresAuth: true },
    },
    {
      path: '/itinerary',
      name: 'itinerary',
      component: ItineraryView,
      meta: { requiresAuth: true },
    },
    {
      path: '/flights',
      name: 'flights',
      component: FlightsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/destinations',
      name: 'destinations',
      component: DestinationsView,
    },
    {
      path: '/flight-details',
      name: 'flight-details',
      component: () => import('../views/FlightDetailsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/booking',
      name: 'booking',
      component: () => import('../views/BookingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/booking-confirmation',
      name: 'booking-confirmation',
      component: () => import('../views/BookingConfirmationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/bookings',
      name: 'bookings',
      component: () => import('../views/BookingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

// Ambil informasi pengguna yang sedang login
function getCurrentUser() {
  try {
    const user = localStorage.getItem('tripmate-current-user')
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

// Periksa hak akses sebelum membuka halaman
router.beforeEach((to) => {
  const currentUser = getCurrentUser()
  const isLoggedIn = Boolean(currentUser)

  // Admin yang sudah login langsung menuju dashboard
  if (to.meta.adminGuestOnly && currentUser?.role === 'admin') {
    return { name: 'admin-dashboard' }
  }

  // Halaman khusus admin
  if (to.meta.requiresAdmin) {
    if (!isLoggedIn) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }

    if (currentUser.role !== 'admin') {
      return { name: 'home' }
    }
  }

  // Halaman privat pengguna
  if (to.meta.requiresAuth && !isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  // Pengguna yang sudah login tidak perlu membuka Login/Register lagi
  if (to.meta.guestOnly && isLoggedIn) {
    return { name: 'home' }
  }

  return true
})

export default router
