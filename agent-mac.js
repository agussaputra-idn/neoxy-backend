const si = require('systeminformation');
const axios = require('axios');
const os = require('os'); 

// GANTI DENGAN URL NGROK KAMU (Tanpa tanda miring di akhir)
const GATEWAY_URL = "https://blazing-headsman-nearly.ngrok-free.dev";

async function sendReport() {
  try {
    const battery = await si.battery();
    const customName = "MacBook Pro Retina"; 

    const report = {
      id: 'device-macbook-pro', 
      name: customName, 
      type: 'desktop',
      battery: battery.percent,
      // Status otomatis deteksi dari sensor MacBook
      status: battery.isCharging ? 'Charging ⚡' : 'Unplugged',
      icon: '💻',
      lastUpdate: new Date().toLocaleTimeString()
    };

    // UPDATE: Gunakan GATEWAY_URL dari Ngrok
    await axios.post(`${GATEWAY_URL}/report`, report);
    
    console.log(`[${report.lastUpdate}] ✅ Sent: ${report.name} - ${report.battery}% (${report.status})`);
  } catch (e) {
    console.log("❌ Gateway offline or Ngrok issue...");
  }
}

setInterval(sendReport, 5000);
sendReport();