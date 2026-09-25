// SENİN RENDER BAĞLANTIN
const API_URL = 'https://oyun-backend-ocbn.onrender.com/api';
const feedContainer = document.getElementById('feed-container');

// Arayüz butonları için basit animasyonlar (Bağımlılık hissi)
function toggleLike(btn) {
  const icon = btn.querySelector('i');
  icon.classList.toggle('heart-active');
  icon.classList.toggle('fa-solid');
  icon.classList.toggle('fa-regular');
}

function toggleFollow(btn) {
  if(btn.innerText === "Takip Et") {
    btn.innerText = "Ediliyor";
    btn.style.background = "transparent";
    btn.style.border = "1px solid white";
  } else {
    btn.innerText = "Takip Et";
    btn.style.background = "#ff2b54";
    btn.style.border = "none";
  }
}

// Iframe (Oyun Motoru) Birleştirici
function buildIframeContent(html, css, js) {
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body { margin: 0; padding: 0; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; font-family: sans-serif; background: #222;}
          ${css}
        </style>
      </head>
      <body>
        ${html}
        <script>
          try { ${js} } catch(e) { console.log("Oyun hatası:", e); }
        </script>
      </body>
    </html>
  `;
}

// Oyunları Sunucudan Çek ve TikTok Gibi Ekrana Bas
async function loadGames() {
  try {
    const response = await fetch(`${API_URL}/feed`);
    const games = await response.json();
    feedContainer.innerHTML = '';

    if(games.length === 0) {
      feedContainer.innerHTML = '<h3 style="text-align:center; margin-top:50vh;">İlk oyunu sen yarat! Butona bas 👇</h3>';
      return;
    }

    games.forEach(game => {
      const container = document.createElement('div');
      container.className = 'game-container';

      const iframe = document.createElement('iframe');
      iframe.className = 'game-frame';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin'); 
      iframe.srcdoc = buildIframeContent(game.htmlContent, game.cssContent, game.jsContent);

      // TikTok Tarzı Arayüz Giydirmesi
      container.innerHTML = `
        <div class="info-overlay">
          <h3>@${game.author} <button class="follow-btn" onclick="toggleFollow(this)">Takip Et</button></h3>
          <p>${game.title}</p>
        </div>
        <div class="ui-overlay">
          <button class="action-btn" onclick="toggleLike(this)">
            <i class="fa-regular fa-heart"></i>
            <span>${Math.floor(Math.random() * 500) + 10}</span>
          </button>
          <button class="action-btn">
            <i class="fa-solid fa-comment-dots"></i>
            <span>Yorum</span>
          </button>
          <button class="action-btn">
            <i class="fa-solid fa-share"></i>
            <span>Paylaş</span>
          </button>
        </div>
      `;
      
      container.insertBefore(iframe, container.firstChild);
      feedContainer.appendChild(container);
    });
  } catch (error) {
    console.log("Bağlantı hatası");
  }
}

// Modal Aç/Kapat
function toggleModal() {
  document.getElementById('create-modal').classList.toggle('hidden');
}

// Yeni Oyun Yayınla (Veritabanına Gönder)
async function publishGame() {
  const btn = document.getElementById('publish-btn');
  btn.innerText = "Yükleniyor...";
  
  const data = {
    title: document.getElementById('g-title').value,
    author: document.getElementById('g-author').value,
    html: document.getElementById('g-html').value,
    css: document.getElementById('g-css').value,
    js: document.getElementById('g-js').value
  };

  if(!data.title || !data.author) {
    alert("Adını ve Oyun adını girmelisin!");
    btn.innerText = "🚀 Yayınla";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if(response.ok) {
      alert("Oyun Başarıyla Yayınlandı!");
      toggleModal();
      loadGames(); // Listeyi yenile
    } else {
      alert("Güvenlik duvarına takıldı veya hata oluştu.");
    }
  } catch (e) {
    alert("Sunucuya bağlanılamadı.");
  }
  btn.innerText = "🚀 Yayınla";
}

// Başlangıçta Oyunları Yükle
loadGames();