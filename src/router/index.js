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
      component: TripsView,
    },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/packing-list', name: 'packing-list', component: PackingListView },
    { path: '/itinerary', name: 'itinerary', component: ItineraryView },
    { path: '/flights', name: 'flights', component: FlightsView },
    { path: '/destinations', name: 'destinations', component: DestinationsView },
    {
      path: '/flight-details',
      name: 'flight-details',
      component: () => import('../views/FlightDetailsView.vue'),
    },
    {
      path: '/booking',
      name: 'booking',
      component: () => import('../views/BookingView.vue'),
    },
    {
      path: '/booking-confirmation',
      name: 'booking-confirmation',
      component: () => import('../views/BookingConfirmationView.vue'),
    },
    {
      path: '/bookings',
      name: 'bookings',
      component: () => import('../views/BookingsView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
