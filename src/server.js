const fastify = require('fastify')({ logger: true });
const path = require('path');
require('dotenv').config();

// Registrasi Socket.io untuk komunikasi real-time
fastify.register(require('fastify-socket.io'), {
  cors: {
    origin: "*", // Di produksi, ganti dengan domain neoxy.io
  }
});

// Route dasar untuk testing
fastify.get('/', async (request, reply) => {
  return { status: 'Neoxy.io Backend is Breathing', version: '1.0.0' };
});

// Logic ketika perangkat terhubung via Socket
fastify.ready((err) => {
  if (err) throw err;

  fastify.io.on('connection', (socket) => {
    console.log(`New device connected: ${socket.id}`);

    // Event ketika baterai penuh dideteksi dari Desktop Agent
    socket.on('BATTERY_FULL', (data) => {
      console.log(`Alert! Device ${data.deviceName} is full. Broadcasting to mobile...`);
      // Kirim notifikasi ke perangkat mobile milik user yang sama
      fastify.io.emit('PUSH_NOTIFICATION', {
        title: 'Unplug Now!',
        message: `${data.deviceName} is 100% full. Save the planet by unplugging it.`
      });
    });

    socket.on('disconnect', () => {
      console.log('Device disconnected');
    });
  });
});

// Jalankan Server
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Neoxy Server is running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();