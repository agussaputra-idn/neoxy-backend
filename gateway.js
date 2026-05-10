const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { TuyaContext } = require('@tuya/tuya-connector-nodejs'); // 👈 [BARU] Import Tuya

const app = express();
const prisma = new PrismaClient(); 

const PORT = 3001;

app.use(cors());
app.use(express.json());

// 👈 [BARU] SETUP TUYA CLOUD
const tuya = new TuyaContext({
  baseUrl: 'https://openapi-sg.iotbing.com', // URL Data Center Singapore/US
  accessKey: 'ffp8qdrudr9ppq4yt5gm', // 👈 GANTI INI DENGAN ACCESS ID BOS
  secretKey: 'xxxxxxxx', // 👈 GANTI INI DENGAN ACCESS SECRET BOS
});

let defaultUserId = null;

// FUNGSI INIT
async function initSystem() {
  try {
    let user = await prisma.user.findUnique({ where: { email: 'admin@neoxy.io' } });
    if (!user) {
      // 🚨 VERCEL SAFE MODE: Dimatikan sementara karena Vercel menolak tulis file SQLite
      // user = await prisma.user.create({
      //   data: { email: 'admin@neoxy.io', name: 'Neoxy SuperAdmin' }
      // });
      console.log('👑 SuperAdmin Account Bypass (Vercel Mode)');
    }
    // defaultUserId = user.id;
    console.log(`✅ System Ready! Database Connected (Read-Only).`);
  } catch (error) {
    console.error('❌ Database Init Error:', error);
  }
}
// 🚨 VERCEL SAFE MODE: Matikan eksekusi awal yang memaksa tulis database
// initSystem();

// 1. ENDPOINT TERIMA DATA (Mencatat Baterai & Hitung Hemat Energi)
app.post('/report', async (req, res) => {
  const { id, name, type, battery, status, icon } = req.body;
  // if (!defaultUserId) return res.status(500).send({ error: 'System Booting...' });

  try {
    // 🚨 VERCEL SAFE MODE: Bypass database tulis untuk mencegah Crash 500
    /*
    const device = await prisma.device.upsert({
      where: { id: id },
      update: { battery, status, icon, deviceName: name },
      create: {
        id: id, 
        user: { connect: { id: defaultUserId } },
        deviceName: name, 
        deviceType: type,
        operatingSystem: type === 'mobile' ? 'Android/iOS' : 'macOS/Windows', 
        battery: battery, 
        status: status, 
        icon: icon
      }
    });

    const isSavingEnergy = status.toLowerCase().includes('unplugged') || status.toLowerCase().includes('battery');
    if (isSavingEnergy) {
      await prisma.sustainabilityLog.create({
        data: {
          deviceId: id,
          actionType: 'Grid_Independent',
          energySavedWh: 5.0,
          carbonSaved: 2.5,
        }
      });
    }
    */
    
    // Beri respon sukses palsu ke device agar tidak nyangkut
    console.log(`📩 [Vercel-Bypass] ${name} (${battery}%) - Data diterima tapi tidak disimpan ke DB lokal.`);
    res.send({ success: true, note: "Vercel Read-Only Mode Active" });
  } catch (error) {
    console.error("❌ Failed to save to DB:", error);
    res.status(500).send({ error: error.message });
  }
});

// 2. ENDPOINT KIRIM DATA DEVICE (Untuk Layar Atas HP)
app.get('/devices', async (req, res) => {
  try {
    // Membaca data masih diperbolehkan di Vercel (Read-Only)
    const devices = await prisma.device.findMany();
    const formattedDevices = devices.map(d => ({
      id: d.id, name: d.deviceName, type: d.deviceType,
      battery: d.battery, status: d.status, icon: d.icon
    }));
    res.json(formattedDevices);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// 3. ENDPOINT BARU: KIRIM DATA GRAFIK & ECO POINTS (Untuk Layar Bawah HP)
app.get('/sustainability', async (req, res) => {
  try {
    const logs = await prisma.sustainabilityLog.findMany({
      orderBy: { timestamp: 'asc' }
    });

    let totalCarbon = 0;
    let totalEnergyWh = 0;

    logs.forEach(log => {
      totalCarbon += log.carbonSaved;
      totalEnergyWh += log.energySavedWh;
    });

    let rawGraphData = logs.slice(-6).map(log => log.carbonSaved);
    while (rawGraphData.length < 6) {
      rawGraphData.unshift(0);
    }

    const totalKwh = parseFloat((totalEnergyWh / 1000).toFixed(2));
    const treesHelped = Math.floor(totalCarbon / 1000) || 1; 

    res.json({
      totalCarbon: parseFloat(totalCarbon.toFixed(2)),
      totalKwh: totalKwh,
      treesHelped: treesHelped,
      graphData: rawGraphData
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// 4. 👈 [BARU] ENDPOINT KONTROL SMART PLUG (IoT)
app.post('/plug/toggle', async (req, res) => {
  const { status } = req.body; // status harus dikirim berupa true atau false
  const deviceId = 'a3d5602486e07f49bbidyv'; // ID SmartPlug_01 dari tangkapan layar Bos

  try {
    const response = await tuya.request({
        path: `/v1.0/iot-03/devices/${deviceId}/commands`,
        method: 'POST',
        body: {
            commands: [{ code: 'switch_1', value: status }]
        }
    });

    console.log(`🔌 [Tuya API] Smart Plug diubah jadi: ${status ? 'ON 🟢' : 'OFF 🔴'}`);
    res.json({ success: true, result: response });
  } catch (error) {
    console.error("❌ Tuya API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🚨 VERCEL SAFE MODE: Endpoint Dummy bawah dimatikan agar tidak bertabrakan dengan yang atas
/*
app.get('/sustainability', (req, res) => {
  res.json({
    batteryLevel: 85,
    powerSaved: "1.2 kWh",
    status: "Active",
    ecoMode: true
  });
});
*/

module.exports = app;
// Pancingan untuk Vercel