
 # X-Farm Pro: Advanced Anti-Detect & Account Management System

X-Farm, X (Twitter) hesaplarını yönetmek için tasarlanmış, anti-detect (tespit edilemez) özelliklere sahip yüksek performanslı bir masaüstü uygulamasıdır. Electron altyapısı üzerine inşa edilen bu proje, hesapların bot tespit algoritmalarına yakalanmasını engellemek için tarayıcı parmak izlerini manipüle eder ve her hesap için izole edilmiş oturumlar sunar.

# Öne Çıkan Özellikler
- 🎭 Gelişmiş Anti-Detect & Parmak İzi (Fingerprinting)
Deterministik Parmak İzi: Her kullanıcı adı için benzersiz ama tutarlı bir profil (User-Agent, Platform, Donanım bilgileri) oluşturur.
%90 Mobil Uyumluluk: X'in daha az şüpheli bulduğu mobil cihaz profillerini (iPhone 15 Pro, Galaxy S24 Ultra vb.) taklit eder.
Gürültü Enjeksiyonu (Noise Injection): Canvas, WebGL ve AudioContext seviyesinde gürültü ekleyerek gerçek donanım kimliğini gizler.
Otomasyon Gizleme: navigator.webdriver ve Chromium otomasyon bayraklarını tamamen devre dışı bırakır.
- 🛡️ Güvenlik & Bypass Çözümleri
c.png Çözümü: Windows Hello ve WebAuthn (FIDO2) katmanlarını pasifize ederek güvenlik anahtarı sorma sorunlarını kökten çözer.
Timezone & Locale Spoofing: Kullanılan proxy'nin IP adresine göre zaman dilimini otomatik olarak senkronize eder.
WebAuthn İstemci Engelleme: Gerçek kullanıcı davranışını taklit ederek "NotAllowedError" döndürür ve platformun şüphelenmesini önler.
- 📉 Veri Tasarrufu & Ghost Mode
Akıllı Filtreleme: Reklam domainlerini, takip piksellerini ve gereksiz statik dosyaları engeller.
Ghost Mode: Sadece gerekli API çağrılarına izin vererek medya ve görsel yüklemelerini kısıtlar, RAM ve bant genişliği tasarrufu sağlar.
İzole Partitions: Her hesap için tamamen birbirinden bağımsız (isole) çerez (cookie) ve session yönetimi.
- 📊 İstatistik & Yönetim
Proxy Yönetimi: HTTP/HTTPS proxy desteği ve anlık gecikme (latency) testleri.
Aylık Veri Takibi: Hesap bazlı veri kullanımı ve işlem istatistikleri.
İşlem Geçmişi: Yapılan tüm işlemlerin kalıcı olarak loglanması.
- 🛠️ Teknik Altyapı
Framework: Electron.js
Network: Axios & HttpsProxyAgent
Data Persistence: JSON tabanlı dosya sistemi (accounts, fingerprints, history, notes)
Security: Crypto-based deterministic seed generation

# ⚙️ Kurulum
Projeyi yerel makinenizde çalıştırmak için:

- 1- Depoyu klonlayın:git clone https://github.com/kullaniciadi/x-farm-pro.git
- 2- Bağımlılıkları yükleyin:npm install
- 3-Uygulamayı başlatın:npm start


# ⚠️ Yasal Uyarı !
Bu araç eğitim amaçlı ve kişisel kullanım için geliştirilmiştir. X (Twitter) hizmet şartlarını ihlal eden kullanım senaryolarından geliştirici sorumlu tutulamaz. Hesap güvenliğinizi korumak adına her zaman kaliteli proxy kullanmanız önerilir.

Developed with ❤️ for high-performance automation.
