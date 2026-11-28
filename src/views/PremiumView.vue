<template>
  <div class="premium-page">
    <!-- HERO -->
    <section class="premium-hero">
      <div class="hero-content">
        <span class="premium-tag">✨ TRIPMATE PREMIUM</span>
        <h1>Rencanakan Perjalananmu<br />Lebih Maksimal</h1>
        <p>
          Nikmati pengalaman merencanakan perjalanan yang lebih personal, fleksibel, dan praktis
          bersama TripMate Premium.
        </p>

        <a href="#pilih-paket" class="hero-button"> Lihat Paket Premium → </a>
      </div>

      <div class="hero-decoration">
        <div class="decoration-circle">
          <span class="plane-icon">✈</span>
        </div>
        <div class="decoration-text">
          <span>Plan your trip.</span>
          <span>Enjoy your journey.</span>
        </div>
      </div>
    </section>

    <!-- BENEFIT -->
    <section class="benefit-section">
      <div class="section-heading">
        <span class="section-tag">KEUNTUNGAN PREMIUM</span>
        <h2>Perjalanan yang Lebih Personal</h2>
        <p>Upgrade pengalaman perjalananmu dengan fitur perencanaan yang lebih lengkap.</p>
      </div>

      <div class="benefit-grid">
        <div class="benefit-card">
          <div class="benefit-icon">✦</div>
          <h3>Rencana Lebih Personal</h3>
          <p>
            Dapatkan rekomendasi rencana perjalanan yang lebih menyesuaikan preferensi perjalananmu.
          </p>
        </div>

        <div class="benefit-card">
          <div class="benefit-icon">⌖</div>
          <h3>Rekomendasi Aktivitas</h3>
          <p>Temukan ide aktivitas dan tempat menarik untuk melengkapi perjalananmu.</p>
        </div>

        <div class="benefit-card">
          <div class="benefit-icon">↗</div>
          <h3>Penyesuaian Budget</h3>
          <p>Sesuaikan rencana perjalanan dengan kebutuhan dan anggaran yang kamu miliki.</p>
        </div>

        <div class="benefit-card">
          <div class="benefit-icon">⟳</div>
          <h3>Alternatif Perjalanan</h3>
          <p>Jelajahi alternatif rencana perjalanan untuk menemukan pilihan yang lebih sesuai.</p>
        </div>
      </div>
    </section>

    <!-- PAKET -->
    <section id="pilih-paket" class="package-section">
      <div class="section-heading">
        <span class="section-tag">PILIH LANGGANAN</span>
        <h2>Pilih Paket Premium</h2>
        <p>Pilih durasi langganan yang sesuai dengan kebutuhanmu.</p>
      </div>

      <div class="premium-container">
        <div
          v-for="paket in packages"
          :key="paket.id_paket"
          class="premium-card"
          :class="{ featured: paket.featured }"
        >
          <div v-if="paket.featured" class="popular-label">PALING POPULER</div>

          <div class="package-top">
            <h3>{{ paket.nama }}</h3>
            <p class="duration">{{ paket.durasi }}</p>
          </div>

          <div class="price">
            <span class="currency">Rp</span>
            <span class="amount">{{ formatHarga(paket.harga) }}</span>
          </div>

          <p class="description">
            {{ paket.deskripsi }}
          </p>

          <div class="package-divider"></div>

          <ul class="features">
            <li>
              <span class="check-icon">✓</span>
              Fitur perjalanan Premium
            </li>
            <li>
              <span class="check-icon">✓</span>
              Pengalaman TripMate lebih lengkap
            </li>
            <li>
              <span class="check-icon">✓</span>
              Aktif selama {{ paket.durasi }}
            </li>
            <li>
              <span class="check-icon">✓</span>
              Tanpa perpanjangan otomatis
            </li>
          </ul>

          <button
            class="choose-button"
            :class="{ featuredButton: paket.featured }"
            :disabled="loadingPackage !== null"
            @click="pilihPaket(paket)"
          >
            {{ loadingPackage === paket.id_paket ? 'Memproses...' : 'Pilih Paket' }}
          </button>
        </div>
      </div>

      <div class="payment-note">
        <span class="note-icon">🔒</span>
        <div>
          <strong>Pembayaran Aman</strong>
          <p>
            Pembayaran dilakukan satu kali sesuai paket yang dipilih. Langganan tidak diperpanjang
            secara otomatis.
          </p>
        </div>
      </div>

      <p v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </p>
    </section>
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

let snapScriptPromise = null

function formatHarga(harga) {
  return Number(harga).toLocaleString('id-ID')
}

function formatDurasi(hari) {
  return `${hari} Hari`
}

function getToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('tripmate-token') ||
    localStorage.getItem('tripmate_access_token')
  )
}

async function loadSnapScript() {
  if (window.snap) return

  if (snapScriptPromise) {
    return snapScriptPromise
  }

  const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY

  if (!clientKey) {
    throw new Error('Client Key Midtrans belum dikonfigurasi.')
  }

  snapScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)

    script.onload = () => resolve()

    script.onerror = () => {
      snapScriptPromise = null
      reject(new Error('Gagal memuat Midtrans Snap.'))
    }

    document.head.appendChild(script)
  })

  return snapScriptPromise
}

async function fetchPackages() {
  try {
    errorMessage.value = ''

    const response = await fetch(`${API_URL}/packages`)

    if (!response.ok) {
      throw new Error('Gagal mengambil data paket Premium.')
    }

    const result = await response.json()

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
  if (loadingPackage.value !== null) return

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

    if (!window.snap) {
      throw new Error('Midtrans Snap belum siap.')
    }

    window.snap.pay(snapToken, {
      onSuccess: function () {
        alert('Pembayaran berhasil! Status Premium akan diperbarui.')
        loadingPackage.value = null
      },

      onPending: function () {
        alert('Pembayaran sedang menunggu konfirmasi.')
        loadingPackage.value = null
      },

      onError: function () {
        alert('Pembayaran gagal. Silakan coba kembali.')
        loadingPackage.value = null
      },

      onClose: function () {
        console.log('Popup pembayaran ditutup.')
        loadingPackage.value = null
      },
    })
  } catch (error) {
    errorMessage.value = error.message
    console.error('Error transaksi Premium:', error)
    alert(error.message)

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
  background: #f1f6fd;
  color: #24344d;
  padding-bottom: 70px;
}

/* HERO */

.premium-hero {
  max-width: 1200px;
  margin: 0 auto;
  padding: 75px 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  background: linear-gradient(135deg, #e1efff, #f5f9ff);
  border-radius: 0 0 35px 35px;
  box-sizing: border-box;
}

.hero-content {
  max-width: 620px;
}

.premium-tag {
  display: inline-block;
  background: #d0e6ff;
  color: #2878d0;
  padding: 9px 16px;
  border-radius: 30px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.premium-hero h1 {
  font-size: 42px;
  line-height: 1.25;
  margin: 22px 0;
  color: #2878d0;
}

.premium-hero p {
  color: #64748b;
  font-size: 16px;
  line-height: 1.8;
  max-width: 550px;
}

.hero-button {
  display: inline-block;
  margin-top: 22px;
  background: #3784e5;
  color: white;
  text-decoration: none;
  padding: 14px 25px;
  border-radius: 12px;
  font-weight: 700;
  transition: 0.2s;
}

.hero-button:hover {
  background: #2469bb;
  transform: translateY(-2px);
}

.hero-decoration {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  min-width: 220px;
}

.decoration-circle {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3784e5, #77b8ff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 40px rgba(55, 132, 229, 0.2);
}

.plane-icon {
  font-size: 90px;
  color: white;
  transform: rotate(-15deg);
}

.decoration-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #2878d0;
  font-weight: 700;
  font-size: 16px;
}

/* SECTION HEADING */

.section-heading {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 40px;
}

.section-tag {
  font-size: 12px;
  font-weight: 800;
  color: #3784e5;
  letter-spacing: 1.5px;
}

.section-heading h2 {
  color: #2878d0;
  font-size: 30px;
  margin: 14px 0;
}

.section-heading p {
  color: #64748b;
  line-height: 1.7;
}

/* BENEFITS */

.benefit-section {
  max-width: 1100px;
  margin: 75px auto;
  padding: 0 24px;
}

.benefit-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.benefit-card {
  background: white;
  padding: 28px 24px;
  border-radius: 18px;
  border: 1px solid #e2eaf5;
  box-shadow: 0 5px 20px rgba(35, 80, 140, 0.05);
  transition: 0.2s;
}

.benefit-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(35, 80, 140, 0.1);
}

.benefit-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #e6f2ff;
  color: #3784e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
}

.benefit-card h3 {
  font-size: 17px;
  color: #2878d0;
  margin-bottom: 12px;
}

.benefit-card p {
  font-size: 14px;
  color: #64748b;
  line-height: 1.8;
}

/* PACKAGE */

.package-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

.premium-container {
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 28px;
}

.premium-card {
  position: relative;
  background: white;
  border-radius: 22px;
  padding: 35px 30px;
  width: 310px;
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

.premium-card.featured:hover {
  transform: translateY(-12px);
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

.package-top h3 {
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
  margin: 25px 0 12px;
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
  line-height: 1.7;
}

.package-divider {
  border-top: 1px solid #e8eef6;
  margin: 20px 0;
}

.features {
  list-style: none;
  padding: 0;
  margin: 10px 0 28px;
  flex-grow: 1;
}

.features li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 17px;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.check-icon {
  color: #3784e5;
  font-weight: bold;
}

.choose-button {
  width: 100%;
  padding: 14px;
  border: 1px solid #3784e5;
  border-radius: 12px;
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

/* PAYMENT NOTE */

.payment-note {
  max-width: 700px;
  margin: 45px auto 0;
  background: white;
  border: 1px solid #e2eaf5;
  border-radius: 16px;
  padding: 22px 26px;
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.note-icon {
  font-size: 24px;
}

.payment-note strong {
  color: #2878d0;
  font-size: 15px;
}

.payment-note p {
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.error-message {
  text-align: center;
  color: #dc2626;
  margin-top: 20px;
}

/* RESPONSIVE */

@media (max-width: 900px) {
  .premium-hero {
    padding: 55px 35px;
  }

  .premium-hero h1 {
    font-size: 34px;
  }

  .decoration-circle {
    width: 170px;
    height: 170px;
  }

  .plane-icon {
    font-size: 70px;
  }

  .benefit-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .premium-hero {
    flex-direction: column;
    text-align: center;
    padding: 45px 24px;
  }

  .premium-hero h1 {
    font-size: 30px;
  }

  .premium-hero p {
    font-size: 14px;
  }

  .hero-decoration {
    margin-top: 20px;
  }

  .decoration-circle {
    width: 150px;
    height: 150px;
  }

  .plane-icon {
    font-size: 60px;
  }

  .benefit-section {
    margin: 55px auto;
  }

  .section-heading h2 {
    font-size: 25px;
  }

  .benefit-grid {
    grid-template-columns: 1fr;
  }

  .premium-card.featured,
  .premium-card.featured:hover {
    transform: none;
  }

  .premium-container {
    gap: 25px;
  }

  .premium-card {
    width: 100%;
    max-width: 380px;
  }

  .payment-note {
    padding: 20px;
  }
}
</style>
