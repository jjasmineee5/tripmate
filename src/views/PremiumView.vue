<template>
  <div class="premium-page">
    <div class="premium-header">
      <h1>Upgrade ke TripMate Premium ✨</h1>
      <p>Nikmati pengalaman perjalanan yang lebih mudah dengan fitur Premium TripMate.</p>
    </div>

    <div class="premium-container">
      <div
        v-for="paket in packages"
        :key="paket.id_paket"
        class="premium-card"
        :class="{ featured: paket.featured }"
      >
        <div v-if="paket.featured" class="popular-label">PALING POPULER</div>

        <h2>{{ paket.nama }}</h2>
        <p class="duration">{{ paket.durasi }}</p>

        <div class="price">
          <span class="currency">Rp</span>
          <span class="amount">{{ formatHarga(paket.harga) }}</span>
        </div>

        <p class="description">{{ paket.deskripsi }}</p>

        <ul class="features">
          <li>✓ Fitur perjalanan Premium</li>
          <li>✓ Pengalaman TripMate lebih lengkap</li>
          <li>✓ Aktif selama {{ paket.durasi }}</li>
          <li>✓ Tanpa perpanjangan otomatis</li>
        </ul>

        <button
          class="choose-button"
          :class="{ featuredButton: paket.featured }"
          :disabled="loadingPackage === paket.id_paket"
          @click="pilihPaket(paket)"
        >
          {{ loadingPackage === paket.id_paket ? 'Memproses...' : 'Pilih Paket' }}
        </button>
      </div>
    </div>

    <div class="premium-note">
      <p>
        Pembayaran dilakukan satu kali sesuai paket yang dipilih. Langganan tidak diperpanjang
        secara otomatis.
      </p>
    </div>

    <p v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const packages = ref([])
const loadingPackage = ref(null)
const errorMessage = ref('')

const API_URL = 'http://localhost:3000/api/premium'

const packageDescriptions = {
  Monthly: 'Coba pengalaman Premium selama satu bulan.',
  '3 Months': 'Lebih hemat untuk perjalanan dan perencanaan.',
  Yearly: 'Pilihan hemat untuk penggunaan sepanjang tahun.',
}

function formatHarga(harga) {
  return Number(harga).toLocaleString('id-ID')
}

function formatDurasi(hari) {
  return `${hari} Hari`
}

function getToken() {
  // Sesuaikan dengan nama token yang digunakan sistem login TripMate.
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('tripmate-token') ||
    localStorage.getItem('tripmate_access_token')
  )
}

async function loadSnapScript() {
  if (window.snap) return

  const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY

  if (!clientKey) {
    throw new Error('Client Key Midtrans belum dikonfigurasi.')
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)

    script.onload = resolve
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap.'))

    document.head.appendChild(script)
  })
}

async function fetchPackages() {
  try {
    errorMessage.value = ''

    const response = await fetch(`${API_URL}/packages`)

    if (!response.ok) {
      throw new Error('Gagal mengambil data paket Premium.')
    }

    const result = await response.json()

    // Menyesuaikan bentuk respons API
    const data = Array.isArray(result)
      ? result
      : result.packages || result.data || result.paket || []

    if (!Array.isArray(data)) {
      throw new Error('Format data paket dari backend tidak sesuai.')
    }

    packages.value = data.map((paket) => ({
      id_paket: paket.id_paket,
      nama: paket.nama_paket,
      durasi: formatDurasi(paket.durasi_hari),
      harga: paket.harga,
      deskripsi: packageDescriptions[paket.nama_paket] || 'Nikmati fitur Premium TripMate.',
      featured: paket.nama_paket === '3 Months',
    }))
  } catch (error) {
    errorMessage.value = error.message
    console.error('Error mengambil paket Premium:', error)
  }
}

async function pilihPaket(paket) {
  errorMessage.value = ''
  loadingPackage.value = paket.id_paket

  try {
    const token = getToken()

    if (!token) {
      throw new Error('Token login tidak ditemukan. Silakan login kembali.')
    }

    await loadSnapScript()

    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id_paket: paket.id_paket,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Gagal membuat transaksi Premium.')
    }

    const snapToken = data.data?.snap_token

    if (!snapToken) {
      throw new Error('Snap token tidak ditemukan.')
    }

    window.snap.pay(snapToken, {
      onSuccess: function () {
        alert('Pembayaran berhasil! Status Premium akan diperbarui.')
      },

      onPending: function () {
        alert('Pembayaran sedang menunggu konfirmasi.')
      },

      onError: function () {
        alert('Pembayaran gagal. Silakan coba kembali.')
      },

      onClose: function () {
        console.log('Popup pembayaran ditutup.')
      },
    })
  } catch (error) {
    errorMessage.value = error.message
    alert(error.message)
  } finally {
    loadingPackage.value = null
  }
}

onMounted(() => {
  fetchPackages()
})
</script>

<style scoped>
.premium-page {
  min-height: 100vh;
  padding: 60px 24px;
  background: #f4f8ff;
  color: #24344d;
  box-sizing: border-box;
}

.premium-header {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 50px;
}

.premium-header h1 {
  color: #2878d0;
  font-size: 32px;
  margin-bottom: 14px;
}

.premium-header p {
  color: #64748b;
  font-size: 16px;
  line-height: 1.7;
}

.premium-container {
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 28px;
  max-width: 1100px;
  margin: auto;
}

.premium-card {
  position: relative;
  background: white;
  border-radius: 20px;
  padding: 32px 28px;
  width: 300px;
  box-sizing: border-box;
  box-shadow: 0 8px 25px rgba(35, 80, 140, 0.08);
  border: 1px solid #e2eaf5;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.premium-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(35, 80, 140, 0.15);
}

.premium-card.featured {
  border: 2px solid #3784e5;
  transform: translateY(-8px);
}

.popular-label {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #3784e5;
  color: white;
  padding: 7px 18px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
}

.premium-card h2 {
  font-size: 23px;
  margin: 8px 0;
  color: #2878d0;
}

.duration {
  color: #64748b;
  font-size: 14px;
}

.price {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin: 20px 0 10px;
  color: #24344d;
}

.currency {
  font-size: 18px;
  font-weight: 600;
}

.amount {
  font-size: 32px;
  font-weight: 800;
}

.description {
  color: #64748b;
  font-size: 14px;
  min-height: 42px;
  line-height: 1.6;
}

.features {
  list-style: none;
  padding: 0;
  margin: 24px 0;
  flex-grow: 1;
}

.features li {
  margin-bottom: 15px;
  font-size: 14px;
  color: #475569;
}

.choose-button {
  width: 100%;
  padding: 13px;
  border: 1px solid #3784e5;
  border-radius: 10px;
  background: white;
  color: #3784e5;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}

.choose-button:hover:not(:disabled) {
  background: #eaf3ff;
}

.choose-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.featuredButton {
  background: #3784e5;
  color: white;
}

.featuredButton:hover:not(:disabled) {
  background: #2469bb;
}

.premium-note {
  max-width: 800px;
  margin: 40px auto 0;
  text-align: center;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.error-message {
  text-align: center;
  color: #dc2626;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .premium-page {
    padding: 40px 16px;
  }

  .premium-header h1 {
    font-size: 26px;
  }

  .premium-card.featured {
    transform: none;
  }
}
</style>
