<template>
  <main class="help-page">
    <section class="help-intro">
      <h1>Pusat Bantuan TripMate</h1>

      <p>Temukan jawaban atas pertanyaan seputar penggunaan TripMate dan persiapan perjalananmu.</p>

      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari pertanyaan atau bantuan..."
          aria-label="Cari pertanyaan bantuan"
        />

        <button
          v-if="searchQuery"
          class="clear-search"
          type="button"
          @click="searchQuery = ''"
          aria-label="Hapus pencarian"
        >
          &times;
        </button>
      </div>
    </section>

    <section class="faq-section">
      <h2>Pertanyaan yang Sering Diajukan</h2>

      <div v-if="filteredFaqs.length > 0" class="faq-list">
        <div v-for="faq in filteredFaqs" :key="faq.question" class="faq-item">
          <button
            class="faq-question"
            type="button"
            @click="toggleFaq(faq.question)"
            :aria-expanded="openFaq === faq.question"
          >
            <span>{{ faq.question }}</span>

            <span class="faq-arrow" :class="{ rotated: openFaq === faq.question }"> ↓ </span>
          </button>

          <div v-if="openFaq === faq.question" class="faq-answer">
            {{ faq.answer }}
          </div>
        </div>
      </div>

      <div v-else class="no-results">
        <h3>Pertanyaan tidak ditemukan</h3>
        <p>Coba gunakan kata kunci lain untuk menemukan bantuan yang kamu cari.</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'

const searchQuery = ref('')
const openFaq = ref(null)

const faqs = [
  {
    question: 'Bagaimana cara mencari tiket pesawat di TripMate?',
    answer:
      'Buka menu Cari Tiket, lalu masukkan bandara keberangkatan, bandara tujuan, tanggal perjalanan, dan jumlah penumpang. Setelah itu, sistem akan menampilkan pilihan penerbangan yang dapat kamu pilih.',
  },
  {
    question: 'Bagaimana cara membuat itinerary perjalanan dengan AI?',
    answer:
      'Buka menu Rencana Perjalanan, kemudian masukkan informasi perjalanan dan preferensi yang dibutuhkan. TripMate akan membantu menyusun rekomendasi itinerary berdasarkan informasi dan preferensi perjalananmu.',
  },
  {
    question: 'Bagaimana cara membuat packing list perjalanan?',
    answer:
      'Buka menu Daftar Perlengkapan atau Packing List untuk menyusun barang bawaan yang perlu dipersiapkan. Kamu dapat menggunakan daftar tersebut sebagai checklist agar persiapan perjalanan lebih teratur.',
  },
  {
    question: 'Bagaimana cara menggunakan rekomendasi AI TripMate?',
    answer:
      'Rekomendasi AI TripMate dapat digunakan untuk membantu merencanakan perjalanan berdasarkan destinasi dan preferensi yang kamu masukkan. Gunakan fitur itinerary untuk memperoleh saran rencana perjalanan yang lebih praktis.',
  },
]

const filteredFaqs = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  if (!keyword) {
    return faqs
  }

  return faqs.filter((faq) => {
    return (
      faq.question.toLowerCase().includes(keyword) || faq.answer.toLowerCase().includes(keyword)
    )
  })
})

function toggleFaq(question) {
  if (openFaq.value === question) {
    openFaq.value = null
  } else {
    openFaq.value = question
  }
}
</script>

<style scoped>
.help-page {
  background-color: #dceafa;
  color: #24364b;
  min-height: 100vh;
  padding: 48px 20px 40px;
  box-sizing: border-box;
}

.help-intro {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
}

.help-intro h1 {
  font-size: 32px;
  color: #111;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 18px;
}

.help-intro p {
  font-size: 16px;
  line-height: 1.9;
  letter-spacing: 1.3px;
  color: #172334;
  margin-bottom: 28px;
}

.search-container {
  position: relative;
  max-width: 500px;
  margin: 0 auto;
}

.search-container input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  border-radius: 9px;
  background: white;
  padding: 16px 45px 16px 20px;
  text-align: center;
  font-size: 14px;
  letter-spacing: 1.3px;
  color: #24364b;
  transition: box-shadow 0.2s ease;
}

.search-container input:focus {
  box-shadow: 0 0 0 3px rgba(52, 120, 212, 0.18);
}

.search-container input::placeholder {
  color: #71829a;
}

.clear-search {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  font-size: 22px;
  color: #71829a;
  cursor: pointer;
}

.faq-section {
  max-width: 800px;
  margin: 16px auto 0;
}

.faq-section h2 {
  text-align: center;
  font-size: 23px;
  font-weight: 600;
  letter-spacing: 1.5px;
  margin-bottom: 18px;
  color: #293b53;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.faq-item {
  background: white;
  border-radius: 9px;
  overflow: hidden;
}

.faq-question {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 22px 30px;
  border: none;
  background: white;
  color: #111;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  letter-spacing: 1.3px;
  transition: background 0.2s ease;
}

.faq-question:hover {
  background: #f8fbff;
}

.faq-arrow {
  font-size: 20px;
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.faq-arrow.rotated {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 30px 24px;
  color: #53657d;
  font-size: 14px;
  line-height: 1.8;
  letter-spacing: 0.5px;
}

.no-results {
  text-align: center;
  background: white;
  border-radius: 10px;
  padding: 35px 20px;
}

.no-results h3 {
  margin-bottom: 10px;
  color: #293b53;
}

.no-results p {
  color: #71829a;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .help-page {
    padding: 35px 20px;
  }

  .help-intro h1 {
    font-size: 27px;
  }

  .help-intro p {
    font-size: 14px;
    letter-spacing: 0.8px;
  }

  .faq-section h2 {
    font-size: 20px;
  }

  .faq-question {
    padding: 20px;
    font-size: 13px;
  }

  .faq-answer {
    padding: 0 20px 20px;
  }
}

@media (max-width: 480px) {
  .help-page {
    padding: 30px 15px;
  }

  .help-intro h1 {
    font-size: 24px;
  }

  .search-container input {
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  .faq-question {
    padding: 18px;
    letter-spacing: 0.5px;
  }
}
</style>
