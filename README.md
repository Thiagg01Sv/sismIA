# API de Sismos en tiempo real - El Salvador

API en Node.js/Express que combina dos fuentes:

1. **[USGS](https://earthquake.usgs.gov/)** — feed global, filtrado por la zona geográfica de El Salvador. Cobertura mundial pero suele **no captar sismos locales pequeños/medianos** sentidos en el país, o los reporta con retraso.
2. **[MARN El Salvador](https://www.snet.gob.sv/ver/sismologia/monitoreo/sismos+reportados/ultimos+10+sismos/)** (Observatorio de Amenazas) — scraping de su tabla de últimos 10 sismos reportados. Esta es la fuente que sí captura sismos locales sentidos en el país, minutos después de ocurridos.

Ambas se consultan en cada ciclo y se combinan; si una falla, la otra sigue funcionando. El resultado se notifica en tiempo real vía WebSocket (Socket.io).

⚠️ **Nota sobre el scraper del MARN:** no es una API oficial documentada, es HTML parseado con cheerio. Si el MARN cambia el formato de su página, `src/services/marnService.js` puede necesitar ajustes.

## Instalación

```bash
npm install
cp .env.example .env
npm start
```

El servidor queda escuchando en `http://localhost:3000` (configurable en `.env`).

## Frontend

`public/index.html` es el dashboard visual (paleta de El Salvador, tipografía Space Grotesk + IBM Plex Mono + Inter). El servidor lo sirve automáticamente en la raíz (`/`) junto con el resto de la API — no necesita build ni pasos extra. Muestra el último sismo, un feed de actividad reciente y se actualiza solo por WebSocket cuando llega un sismo nuevo.

La info JSON de la API (antes en `/`) se movió a `GET /api`.

## Endpoints REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Dashboard visual (frontend) |
| GET | `/api` | Info general de la API en JSON |
| GET | `/health` | Estado del servicio (última actualización, errores) |
| GET | `/api/sismos` | Sismos detectados en las últimas 24h (memoria, se actualiza solo) |
| GET | `/api/sismos?minMagnitud=3` | Igual, filtrando por magnitud mínima |
| GET | `/api/sismos/ultimo` | El sismo más reciente |
| GET | `/api/sismos/historico?desde=2026-01-01&hasta=2026-02-01` | Consulta histórica directa a USGS |

## Tiempo real (WebSocket)

Conectate por Socket.io a la raíz del servidor:

```js
const socket = io('http://localhost:3000');
socket.on('nuevo_sismo', (sismo) => console.log(sismo));
```

Abrí `http://localhost:3000/` en el navegador para ver el dashboard funcionando en vivo (con el servidor corriendo).

## Cómo funciona

- Cada `POLL_INTERVAL_MS` (30s por defecto), el servidor consulta en paralelo el endpoint de eventos de USGS acotado a El Salvador (`src/services/usgsService.js`) y la tabla del MARN (`src/services/marnService.js`).
- `src/services/monitor.js` combina ambas listas, guarda un historial en memoria y detecta cuáles sismos son nuevos comparando IDs.
- Cuando aparece un sismo nuevo (de cualquiera de las dos fuentes), se emite el evento `nuevo_sismo` por WebSocket a todos los clientes conectados. Cada sismo trae el campo `fuente` (`USGS` o `MARN`) para saber de dónde vino.
- Si una fuente falla y la otra funciona, el servicio sigue operando con la que sí respondió; `ultimo_error` en `/health` deja constancia de cuál falló.

## Configuración (`.env`)

- `PORT`: puerto del servidor.
- `POLL_INTERVAL_MS`: frecuencia de sondeo a USGS.
- `MIN_MAGNITUDE`: magnitud mínima a reportar.
- `MIN_LATITUDE`, `MAX_LATITUDE`, `MIN_LONGITUDE`, `MAX_LONGITUDE`: bounding box del área a monitorear (por defecto, El Salvador con margen).

## Próximos pasos sugeridos

- Persistencia en base de datos (Postgres/SQLite) en vez de memoria, para no perder historial al reiniciar.
- Autenticación (API key) si se va a exponer públicamente.
- Notificaciones push/SMS/Telegram para sismos sobre cierta magnitud.
- Monitorear si el MARN cambia el formato de su página (rompería el scraper) y ajustar `marnService.js` si es necesario.
