// ==========================================
// 1. TEMEL AYARLAR VE DURUM YÖNETİMİ
// ==========================================
const API_URL = 'https://oyun-backend-ocbn.onrender.com/api'; // Render Backend Linkin
let currentUser = JSON.parse(localStorage.getItem('arcade_user')) || null;
let isLoginMode = true;
let allGames = [];

// Eğlenceli Başlangıç Oyunları (Veritabanı boşsa veya yüklenene kadar boş durmasın diye)
const FALLBACK_GAMES = [
    {
        _id: "demo_1",
        title: "Neon Tıklayıcı 🚀",
        author: "Sistem",
        likes: ["admin", "oyuncu1"],
        htmlContent: `<div class="container"><h1 id="score">0</h1><button id="tap-btn">TIKLA</button></div>`,
        cssContent: `body{background:#050505;color:white;font-family:sans-serif;margin:0;height:100vh;display:flex;justify-content:center;align-items:center;}.container{text-align:center;}h1{font-size:80px;margin:0 0 20px 0;text-shadow:0 0 20px #00f2fe;color:#00f2fe;}button{background:#ff0055;color:white;border:none;padding:20px 50px;font-size:24px;border-radius:30px;font-weight:bold;box-shadow:0 10px 30px rgba(255,0,85,0.5);}`,
        jsContent: `let score=0;const btn=document.getElementById('tap-btn');const h=document.getElementById('score');btn.onclick=()=>{score++;h.innerText=score;btn.style.transform='scale(0.9)';setTimeout(()=>btn.style.transform='scale(1)',100);}`
    }
];

// ==========================================
// 2. UYGULAMA BAŞLATICI (SPLASH SCREEN)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateUserUI(); // Kullanıcı giriş yapmış mı kontrol et
    fetchGames();   // Veritabanından oyunları çek
    
    // Sahte yükleme süresi (Splash Screen'i göstermek için)
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
        }, 500); // Yarım saniye fade-out animasyonu
    }, 1500); // 1.5 saniye logo döner
});

// ==========================================
// 3. NAVİGASYON (ALT MENÜ & SEKMELER)
// ==========================================
function switchView(viewName, element) {
    // Tüm sayfaları gizle
    document.querySelectorAll('.app-view').forEach(view => view.classList.add('hidden'));
    // Tıklanan sayfayı göster
    document.getElementById(`view-${viewName}`).classList.remove('hidden');

    // Menü ikonlarının renklerini sıfırla
    if(element) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        element.classList.add('active');
    }

    // Özel sayfa tetikleyicileri
    if(viewName === 'discover') renderDiscover();
    if(viewName === 'profile') renderProfile();
}

function switchCodeTab(lang) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.code-area').forEach(area => area.classList.add('hidden'));
    
    event.currentTarget.classList.add('active');
    document.getElementById(`code-${lang}`).classList.remove('hidden');
}

// ==========================================
// 4. VERİ ÇEKME VE EKRANA BASMA (TİKTOK AKIŞI)
// ==========================================
async function fetchGames() {
    try {
        const response = await fetch(`${API_URL}/feed`);
        const data = await response.json();
        allGames = (data && data.length > 0) ? data : FALLBACK_GAMES;
    } catch (error) {
        console.error("Oyunlar yüklenemedi:", error);
        allGames = FALLBACK_GAMES; // Hata olursa boş kalmasın
    }
    renderFeed();
}

function renderFeed() {
    const feedContainer = document.getElementById('feed-scroll-container');
    feedContainer.innerHTML = '';

    allGames.forEach(game => {
        const isLiked = currentUser && game.likes.includes(currentUser.username);
        const card = document.createElement('div');
        card.className = 'game-card';

        // Güvenli İframe Oluşturucu (Mobil Uyumlu)
        const iframeContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>${game.cssContent}</style>
            </head>
            <body>
                ${game.htmlContent}
                <script>${game.jsContent}<\/script>
            </body>
            </html>
        `;

        card.innerHTML = `
            <iframe class="game-iframe" sandbox="allow-scripts allow-same-origin" srcdoc="${escapeHtml(iframeContent)}"></iframe>
            
            <div class="overlay-info">
                <div class="author-line">
                    <span class="author-name">@${game.author}</span>
                    <button class="follow-tag" onclick="handleFollow('${game.author}')">Takip Et</button>
                </div>
                <p class="game-title">${game.title}</p>
            </div>

            <div class="overlay-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${game._id}', this)">
                    <div class="icon-wrapper"><i class="fa-solid fa-heart"></i></div>
                    <span class="like-count">${game.likes.length}</span>
                </button>
                <button class="action-btn" onclick="openComments()">
                    <div class="icon-wrapper"><i class="fa-solid fa-comment-dots"></i></div>
                    <span>Yorum</span>
                </button>
                <button class="action-btn" onclick="shareGame('${game.title}')">
                    <div class="icon-wrapper"><i class="fa-solid fa-share"></i></div>
                    <span>Paylaş</span>
                </button>
            </div>
        `;
        feedContainer.appendChild(card);
    });
}

// ==========================================
// 5. ETKİLEŞİMLER (BEĞENİ, TAKİP, YORUM)
// ==========================================
async function toggleLike(gameId, btnElement) {
    if (!currentUser) return openAuthModal(); // Giriş yapmamışsa modalı aç

    const likeCountSpan = btnElement.querySelector('.like-count');
    let currentCount = parseInt(likeCountSpan.innerText);

    // Animasyon ve anında tepki (Optimistic UI)
    const isLiking = !btnElement.classList.contains('liked');
    btnElement.classList.toggle('liked');
    likeCountSpan.innerText = isLiking ? currentCount + 1 : currentCount - 1;

    try {
        await fetch(`${API_URL}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, username: currentUser.username })
        });
    } catch (error) {
        console.error("Beğeni işlenemedi");
    }
}

async function handleFollow(targetUser) {
    if (!currentUser) return openAuthModal();
    if (targetUser === currentUser.username) {
        alert("Kendi kendini takip edemezsin! 😅");
        return;
    }
    
    // Gelişmiş sistemde burada takip et/ediliyor değişimi yapılır
    alert(`@${targetUser} adlı kullanıcıya takip isteği gönderildi!`);
}

function shareGame(title) {
    if (navigator.share) {
        navigator.share({ title: `ArcadeTok'ta ${title} oyununu oyna!`, url: window.location.href });
    } else {
        alert("Bağlantı kopyalandı!");
    }
}

function openComments() { document.getElementById('comments-modal').classList.remove('hidden'); }
function closeComments() { document.getElementById('comments-modal').classList.add('hidden'); }

// ==========================================
// 6. OYUN YAYINLAMA (STÜDYO)
// ==========================================
async function publishGame() {
    if (!currentUser) return openAuthModal();

    const title = document.getElementById('game-title').value;
    const html = document.getElementById('code-html').value;
    const css = document.getElementById('code-css').value;
    const js = document.getElementById('code-js').value;
    const publishBtn = document.getElementById('publish-game-btn');

    if (!title || !html) {
        alert("En azından bir Oyun Adı ve HTML iskeleti yazmalısın!");
        return;
    }

    publishBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yayınlanıyor...';

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author: currentUser.username, html, css, js })
        });

        if (response.ok) {
            alert("🚀 Oyunun Milyarlara Ulaşmak İçin Canlıda!");
            
            // Formu Temizle
            document.getElementById('game-title').value = '';
            document.getElementById('code-html').value = '';
            document.getElementById('code-css').value = '';
            document.getElementById('code-js').value = '';
            
            // Akışı Yenile ve Ana Sayfaya Dön
            await fetchGames();
            switchView('feed', document.querySelectorAll('.nav-item')[0]);
        }
    } catch (error) {
        alert("Yayınlama sırasında bir hata oluştu.");
    }
    publishBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Canlıya Al ve Yayınla';
}

// ==========================================
// 7. KİMLİK DOĞRULAMA (GİRİŞ / KAYIT)
// ==========================================
function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "ArcadeTok'a Katıl" : "Yeni Profil Oluştur";
    document.getElementById('auth-subtitle').innerText = isLoginMode ? "Devam etmek için giriş yapmalısın." : "Kendi oyunlarını yapmak için kayıt ol.";
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol";
    document.getElementById('auth-switch-text').innerHTML = isLoginMode ? 
        'Hesabın yok mu? <span onclick="toggleAuthMode()">Hemen Kayıt Ol</span>' : 
        'Zaten hesabın var mı? <span onclick="toggleAuthMode()">Giriş Yap</span>';
}

async function handleAuth() {
    const userStr = document.getElementById('auth-username').value;
    const passStr = document.getElementById('auth-password').value;
    const btn = document.getElementById('auth-submit-btn');

    if (!userStr || !passStr) return alert("Kullanıcı adı ve şifre zorunludur!");

    btn.innerText = "Bekleniyor...";
    const endpoint = isLoginMode ? '/login' : '/register';

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userStr, password: passStr })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('arcade_user', JSON.stringify(currentUser));
            updateUserUI();
            closeAuthModal();
            // Yeni biri girince akışı yenile ki onun "beğenileri" kırmızı görünsün
            fetchGames(); 
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert("Sunucuya bağlanılamadı! Lütfen tekrar dene.");
    }
    btn.innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol";
}

function logout() {
    localStorage.removeItem('arcade_user');
    currentUser = null;
    updateUserUI();
    fetchGames(); // Beğenileri sıfırlamak için
    alert("Başarıyla çıkış yapıldı!");
}

function updateUserUI() {
    const headerProfilePic = document.getElementById('header-profile-pic');
    
    // Eğer giriş yapmışsa profil ekranını doldur
    if (currentUser) {
        document.getElementById('profile-username').innerText = `@${currentUser.username}`;
        document.getElementById('profile-bio').innerText = "ArcadeTok Geliştiricisi 🔥";
        document.getElementById('stat-followers').innerText = currentUser.followers ? currentUser.followers.length : "0";
        document.getElementById('stat-following').innerText = currentUser.following ? currentUser.following.length : "0";
        
        document.getElementById('profile-login-btn').classList.add('hidden');
        document.getElementById('profile-logout-btn').classList.remove('hidden');
        
        // Üst Header'daki giriş ikonunu kaldırıp yeşil nokta koyalım (Çevrimiçi)
        headerProfilePic.innerHTML = `<i class="fa-solid fa-user-astronaut"></i><div style="position:absolute;bottom:0;right:0;width:8px;height:8px;background:#00ff00;border-radius:50%;border:1px solid #000;"></div>`;
        headerProfilePic.onclick = () => switchView('profile', document.querySelectorAll('.nav-item')[4]);
    } else {
        document.getElementById('profile-username').innerText = "Misafir Kullanıcı";
        document.getElementById('profile-bio').innerText = "Oyun oynamak ve yaratmak için giriş yap.";
        document.getElementById('stat-followers').innerText = "0";
        document.getElementById('stat-following').innerText = "0";
        
        document.getElementById('profile-login-btn').classList.remove('hidden');
        document.getElementById('profile-logout-btn').classList.add('hidden');
        
        headerProfilePic.innerHTML = `<i class="fa-solid fa-user"></i>`;
        headerProfilePic.onclick = openAuthModal;
    }
}

// ==========================================
// 8. YARDIMCI FONKSİYONLAR
// ==========================================
function renderDiscover() {
    // Keşfet sayfasına oyunları yükle
    const grid = document.getElementById('discover-grid');
    grid.innerHTML = '';
    allGames.forEach(game => {
        grid.innerHTML += `
            <div class="grid-item">
                <h4>${game.title}</h4>
                <p>@${game.author}</p>
                <div class="stats"><i class="fa-solid fa-heart"></i> ${game.likes.length} Beğeni</div>
            </div>
        `;
    });
}

function renderProfile() {
    if (!currentUser) return;
    const grid = document.getElementById('profile-games-grid');
    grid.innerHTML = '';
    
    const myGames = allGames.filter(g => g.author === currentUser.username);
    if (myGames.length === 0) {
        grid.innerHTML = '<p style="grid-column: span 2; text-align:center; color:#888; font-size: 13px; margin-top:20px;">Henüz yayınladığın bir oyun yok. Yaratmak için + butonuna bas!</p>';
        return;
    }

    myGames.forEach(game => {
        grid.innerHTML += `
            <div class="grid-item">
                <h4>${game.title}</h4>
                <div class="stats" style="margin-top:10px;"><i class="fa-solid fa-heart"></i> ${game.likes.length} Beğeni</div>
            </div>
        `;
    });
}

function escapeHtml(str) {
    // İframe srcdoc içine yazarken HTML tırnaklarının bozulmasını engeller
    return str.replace(/"/g, '&quot;');
}
