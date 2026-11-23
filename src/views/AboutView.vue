<template>
  <main class="about-page">
    <!-- Header halaman -->
    <section class="about-intro">
      <h1>Tentang TripMate</h1>

      <p class="intro-description">
        TripMate adalah aplikasi perencanaan perjalanan berbasis AI yang membantu kamu merencanakan
        perjalanan dengan lebih mudah, mulai dari pencarian tiket hingga rekomendasi itinerary dan
        daftar barang bawaan.
      </p>
    </section>

    <!-- Fitur utama -->
    <section class="feature-section">
      <div class="feature-card">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9Z"
              stroke="currentColor"
              stroke-width="1.7"
            />
            <path
              d="M7 9v6M17 9v6M12 9v1m0 4v1"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <div class="feature-content">
          <h2>Pencarian Tiket</h2>
          <p>Membantu pengguna mencari tiket pesawat untuk perjalanan yang direncanakan.</p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9Z"
              stroke="currentColor"
              stroke-width="1.7"
            />
            <path
              d="M7 9v6M17 9v6M12 9v1m0 4v1"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <div class="feature-content">
          <h2>AI Itinerary</h2>
          <p>
            Memberikan rekomendasi rencana perjalanan berdasarkan destinasi dan preferensi pengguna.
          </p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9Z"
              stroke="currentColor"
              stroke-width="1.7"
            />
            <path
              d="M7 9v6M17 9v6M12 9v1m0 4v1"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <div class="feature-content">
          <h2>Packing List</h2>
          <p>Membantu menyusun daftar barang bawaan sesuai kebutuhan perjalanan.</p>
        </div>
      </div>
    </section>

    <!-- Alasan memilih TripMate -->
    <section class="why-section">
      <h2>Mengapa Memilih TripMate?</h2>

      <p>
        TripMate membantu kamu merencanakan perjalanan dengan lebih praktis melalui integrasi
        pemesanan tiket dan rekomendasi perjalanan berbasis AI. Dengan satu platform, kamu bisa
        mempersiapkan perjalanan sesuai destinasi dan preferensimu.
      </p>
    </section>
  </main>
</template>

<style scoped>
.about-page {
  background-color: #dceafa;
  color: #24364b;
  min-height: 100vh;
  padding: 48px 6% 40px;
  box-sizing: border-box;
}

.about-intro {
  text-align: center;
  max-width: 760px;
  margin: 0 auto 36px;
}

.about-intro h1 {
  color: #111827;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 22px;
}

.intro-description {
  font-size: 16px;
  line-height: 1.9;
  letter-spacing: 1.3px;
  color: #172334;
  margin: 0;
}

/* Card fitur */
.feature-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 40px;
  max-width: 1100px;
  margin: 0 auto;
}

.feature-card {
  background-color: white;
  border-radius: 12px;
  padding: 28px;
  min-height: 175px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-sizing: border-box;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 22px rgba(40, 70, 110, 0.12);
}

.feature-icon {
  width: 68px;
  height: 68px;
  min-width: 68px;
  border-radius: 50%;
  background-color: #f5f9ff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.2);
  color: #3478d4;
}

.feature-icon svg {
  width: 28px;
  height: 28px;
}

.feature-content h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #293b53;
}

.feature-content p {
  font-size: 14px;
  line-height: 1.6;
  color: #222;
  margin: 0;
}

/* Mengapa TripMate */
.why-section {
  max-width: 950px;
  margin: 36px auto 0;
  text-align: center;
}

.why-section h2 {
  font-size: 23px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #293b53;
}

.why-section p {
  font-size: 22px;
  line-height: 1.5;
  color: #657b98;
  margin: 0;
}

/* Tablet */
@media (max-width: 900px) {
  .feature-section {
    gap: 20px;
  }

  .feature-card {
    padding: 20px;
    flex-direction: column;
    text-align: center;
  }

  .feature-content p {
    font-size: 14px;
  }

  .why-section p {
    font-size: 19px;
  }
}

/* Mobile */
@media (max-width: 650px) {
  .about-page {
    padding: 35px 20px;
  }

  .about-intro h1 {
    font-size: 26px;
  }

  .intro-description {
    font-size: 14px;
    letter-spacing: 0.7px;
  }

  .feature-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .feature-card {
    flex-direction: row;
    text-align: left;
    min-height: auto;
  }

  .why-section h2 {
    font-size: 20px;
  }

  .why-section p {
    font-size: 16px;
  }
}
</style>
