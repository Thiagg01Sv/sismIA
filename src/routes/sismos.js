const express = require('express');
const monitor = require('../services/monitor');
const { obtenerSismosElSalvador } = require('../services/usgsService');

const router = express.Router();


router.get('/', (req, res) => {
  const { minMagnitud } = req.query;
  let resultado = monitor.obtenerTodos();

  if (minMagnitud) {
    resultado = resultado.filter((s) => s.magnitud >= Number(minMagnitud));
  }

  res.json({
    total: resultado.length,
    ultima_actualizacion: monitor.ultimaActualizacion,
    sismos: resultado,
  });
});

router.get('/ultimo', (req, res) => {
  const ultimo = monitor.obtenerUltimo();
  if (!ultimo) {
    return res.status(404).json({ mensaje: 'Aún no se ha detectado ningún sismo' });
  }
  res.json(ultimo);
});

router.get('/historico', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const sismos = await obtenerSismosElSalvador({
      starttime: desde ? new Date(desde) : undefined,
      endtime: hasta ? new Date(hasta) : undefined,
    });
    res.json({ total: sismos.length, sismos });
  } catch (err) {
    res.status(502).json({ error: 'No se pudo consultar el servicio de USGS', detalle: err.message });
  }
});

module.exports = router;
