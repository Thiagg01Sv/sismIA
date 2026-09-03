const axios = require('axios');

const USGS_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

const BOUNDS = {
  minlatitude: process.env.MIN_LATITUDE || 12.5,
  maxlatitude: process.env.MAX_LATITUDE || 14.6,
  minlongitude: process.env.MIN_LONGITUDE || -90.6,
  maxlongitude: process.env.MAX_LONGITUDE || -87.5,
};

const MIN_MAGNITUDE = process.env.MIN_MAGNITUDE || 1.5;


function normalizeFeature(feature) {
  const { properties, geometry, id } = feature;
  return {
    id,
    magnitud: properties.mag,
    lugar: properties.place,
    fecha: new Date(properties.time).toISOString(),
    profundidad_km: geometry.coordinates[2],
    latitud: geometry.coordinates[1],
    longitud: geometry.coordinates[0],
    tipo: properties.type,
    estado: properties.status,
    url: properties.url,
    sentido: properties.felt || 0,
    fuente: 'USGS',
  };
}

/**
 * 
 * @param {Object} opts
 * @param {Date} [opts.starttime] 
 * @param {Date} [opts.endtime] 
 */
async function obtenerSismosElSalvador({ starttime, endtime } = {}) {
  const params = {
    format: 'geojson',
    starttime: (starttime || new Date(Date.now() - 24 * 60 * 60 * 1000)).toISOString(),
    endtime: (endtime || new Date()).toISOString(),
    minmagnitude: MIN_MAGNITUDE,
    orderby: 'time',
    ...BOUNDS,
  };

  const { data } = await axios.get(USGS_BASE_URL, { params, timeout: 10000 });
  return data.features.map(normalizeFeature);
}

module.exports = { obtenerSismosElSalvador, normalizeFeature, BOUNDS };
