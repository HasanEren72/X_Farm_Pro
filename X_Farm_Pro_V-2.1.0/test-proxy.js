const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// BURAYA TEST ETMEK İSTEDİĞİN PROXY'Yİ YAPIŞTIR (Kullanıcı:Şifre dahil)
const testProxy = "isp.decodo.com:10001:sp8alvkucy:flC8AhJp1Lnk7"; 

async function simpleTest() {
    const p = testProxy.split(':');
    const proxyUrl = `http://${p[2]}:${p[3]}@${p[0]}:${p[1]}`;
    const agent = new HttpsProxyAgent(proxyUrl);

    console.log(`--- Test Başlıyor: ${p[0]}:${p[1]} ---`);
    
    try {
        const res = await axios.get('https://api.ipify.org?format=json', { 
            httpsAgent: agent, 
            timeout: 10000 
        });
        console.log("✅ BAĞLANTI BAŞARILI!");
        console.log("Proxy IP Adresiniz:", res.data.ip);
    } catch (err) {
        console.log("❌ BAĞLANTI HATASI!");
        console.log("Hata Mesajı:", err.message);
        console.log("\nİpucu: Eğer '407 Proxy Authentication Required' alıyorsan şifre yanlıştır.");
        console.log("Eğer 'timeout' alıyorsan proxy sunucusu cevap vermiyordur.");
    }
}

simpleTest();