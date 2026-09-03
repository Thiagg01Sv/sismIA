require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const sismosRouter = require('./routes/sismos');
const monitor = require('./services/monitor');

const PORT = process.env.PORT || 3000;

const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api', (req, res) => {
  res.json({
    servicio: 'API de sismos en tiempo real - El Salvador',
    fuentes: ['USGS (earthquake.usgs.gov)', 'MARN El Salvador (snet.gob.sv)'],
    endpoints: {
      'GET /api/sismos': 'Lista de sismos recientes detectados (últimas 24h, en memoria)',
      'GET /api/sismos/ultimo': 'El sismo más reciente',
      'GET /api/sismos/historico?desde=&hasta=': 'Consulta histórica directa a USGS',
      'GET /health': 'Estado del servicio',
      'WS /': 'Evento "nuevo_sismo" emitido en tiempo real',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({
    estado: 'ok',
    ultima_actualizacion: monitor.ultimaActualizacion,
    ultimo_error: monitor.ultimoError,
    sismos_en_memoria: monitor.obtenerTodos().length,
  });
});

app.use('/api/sismos', sismosRouter);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log(`[ws] Cliente conectado: ${socket.id}`);
 
  const ultimo = monitor.obtenerUltimo();
  if (ultimo) socket.emit('estado_inicial', ultimo);

  socket.on('disconnect', () => {
    console.log(`[ws] Cliente desconectado: ${socket.id}`);
  });
});


monitor.onNuevoSismo((sismo) => {
  console.log(`[monitor] Nuevo sismo detectado: M${sismo.magnitud} - ${sismo.lugar}`);
  io.emit('nuevo_sismo', sismo);
});

monitor.iniciar();

server.listen(PORT, () => {
  console.log(`API de sismos escuchando en http://localhost:${PORT}`);
});
