const { obtenerSismosElSalvador } = require('./usgsService');
const { obtenerUltimosSismosMARN } = require('./marnService');

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 30000;
const MAX_HISTORIAL = 200;

class MonitorSismos {
  constructor() {
    this.sismos = []; 
    this.idsVistos = new Set();
    this.listeners = []; 
    this.ultimaActualizacion = null;
    this.ultimoError = null;
  }

  onNuevoSismo(callback) {
    this.listeners.push(callback);
  }

  obtenerTodos() {
    return this.sismos;
  }

  obtenerUltimo() {
    return this.sismos[0] || null;
  }

  async _ciclo() {
    try {
     
      const [usgsResultado, marnResultado] = await Promise.allSettled([
        obtenerSismosElSalvador({ starttime: new Date(Date.now() - 24 * 60 * 60 * 1000) }),
        obtenerUltimosSismosMARN(),
      ]);

      const errores = [];
      const encontrados = [];

      if (usgsResultado.status === 'fulfilled') {
        encontrados.push(...usgsResultado.value);
      } else {
        errores.push(`USGS: ${usgsResultado.reason.message}`);
      }

      if (marnResultado.status === 'fulfilled') {
        encontrados.push(...marnResultado.value);
      } else {
        errores.push(`MARN: ${marnResultado.reason.message}`);
      }


      if (usgsResultado.status === 'rejected' && marnResultado.status === 'rejected') {
        throw new Error(errores.join(' | '));
      }

      const nuevos = encontrados.filter((s) => !this.idsVistos.has(s.id));

      if (nuevos.length > 0) {
        nuevos.forEach((s) => this.idsVistos.add(s.id));
        this.sismos = [...nuevos, ...this.sismos]
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .slice(0, MAX_HISTORIAL);

        nuevos.forEach((s) => this.listeners.forEach((cb) => cb(s)));
      }

      this.ultimaActualizacion = new Date().toISOString();
      this.ultimoError = errores.length > 0 ? errores.join(' | ') : null;
    } catch (err) {
      this.ultimoError = err.message;
      console.error('[monitor] Error consultando USGS:', err.message);
    }
  }

  iniciar() {
  
    this._ciclo();
    this.intervalo = setInterval(() => this._ciclo(), POLL_INTERVAL_MS);
    console.log(`[monitor] Sondeando USGS cada ${POLL_INTERVAL_MS / 1000}s`);
  }

  detener() {
    clearInterval(this.intervalo);
  }
}

module.exports = new MonitorSismos();
