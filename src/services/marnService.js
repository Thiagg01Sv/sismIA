const axios = require('axios');
const cheerio = require('cheerio');

const MARN_URL = 'https://www.snet.gob.sv/ver/sismologia/monitoreo/sismos+reportados/ultimos+10+sismos/';

function parseNumero(texto) {
  const n = parseFloat(String(texto).replace(',', '.').trim());
  return Number.isNaN(n) ? null : n;
}

function generarId({ fecha, hora, latitud, longitud }) {
  return `marn-${fecha}-${hora}-${latitud}-${longitud}`.replace(/[^a-zA-Z0-9-]/g, '');
}


async function obtenerUltimosSismosMARN() {
  const { data: html } = await axios.get(MARN_URL, {
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; api-sismos-sv/1.0)' },
  });
  const $ = cheerio.load(html);

  const filas = [];

  $('table').each((_, table) => {
    const textoEncabezado = $(table).find('tr').first().text();
    const esTablaDeSismos =
      textoEncabezado.includes('Magnitud') && textoEncabezado.includes('Profundidad');
    if (!esTablaDeSismos) return;

    $(table)
      .find('tr')
      .slice(1) 
      .each((__, tr) => {
        const celdas = $(tr)
          .find('td')
          .map((___, td) => $(td).text().trim())
          .get();
        if (celdas.length < 9) return;

        const [, fecha, hora, latitud, longitud, localizacion, , magnitud, profundidad] = celdas;

        filas.push({
          fecha,
          hora,
          latitud: parseNumero(latitud),
          longitud: parseNumero(longitud),
          localizacion,
          magnitud: parseNumero(magnitud),
          profundidad_km: parseNumero(profundidad),
        });
      });
  });

  return filas
    .filter((s) => s.magnitud !== null && s.fecha && s.hora)
    .map((s) => ({
      id: generarId(s),
      magnitud: s.magnitud,
      lugar: s.localizacion,
      fecha: new Date(`${s.fecha}T${s.hora}-06:00`).toISOString(),
      profundidad_km: s.profundidad_km,
      latitud: s.latitud,
      longitud: s.longitud,
      tipo: 'earthquake',
      estado: 'reviewed',
      url: MARN_URL,
      fuente: 'MARN',
    }));
}

module.exports = { obtenerUltimosSismosMARN };
