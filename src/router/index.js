import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TripsView from '../views/TripsView.vue'
import RegisterView from '../views/RegisterView.vue'
import LoginView from '../views/LoginView.vue'
import PackingListView from '../views/PackingListView.vue'
import ItineraryView from '../views/ItineraryView.vue'
import FlightsView from '../views/FlightsView.vue'
import DestinationsView from '../views/DestinationsView.vue'

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
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

// Periksa status login sebelum membuka halaman
router.beforeEach((to) => {
  const isLoggedIn = Boolean(localStorage.getItem('tripmate-current-user'))

  // Pengguna belum login tidak boleh membuka halaman privat
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
