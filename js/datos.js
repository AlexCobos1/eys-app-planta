/* datos.js — EYS_APP */
const LINEAS_RESPALDO = [
  "LINEA 1 EYS", "LINEA 2 EYS", "LINEA 3 EYS", "ACCUROFILL 1", "ACCUROFILL 2",
  "LINEA 4 EYS", "TUBOS 1", "TUBOS 2", "LINEA 5 EYS", "DESODORANTES 1",
  "LINEA 6 EYS", "LINEA 7 EYS", "LINEA 8 EYS", "AXIOMATICA", "DESODORANTES 2", "LINEA 8 (MAQ)"
];
const SEED_PROGRAMACION_RESPALDO = [
  { linea: "LINEA 2 EYS", op: "12753759", codigo: "20-0111393", producto: "CZ MYMOMENT CP LISO 200ML", uph: 1020, horaInicio: 6, duracion: 4.33, cantidad: 4418 },
  { linea: "TUBOS 1", op: "12753459", codigo: "20-0121690", producto: "ES EXPRESSION SPIRIT CP 130ML", uph: 1985, horaInicio: 6, duracion: 4.65, cantidad: 9240 }
];
const ANALISTA_PIN_RESPALDO = 'Analista123';
const AUTORIZACION_CAUSALES_PIN_RESPALDO = 'Analista123';
const CAUSALES_PARO_RESPALDO = [
  
  { id: 'ALIMENTACION', nombre: 'Tiempo de alimentación', requiereRevision: false, activa: true },
  { id: 'PAUSA_ACTIVA', nombre: 'Pausa activa', requiereRevision: false, activa: true },
  { id: 'SET_UP', nombre: 'Ajuste de Máquina (Set Up)', requiereRevision: true, activa: true },
  { id: 'CAMBIO_TURNO', nombre: 'Cambio de turno', requiereRevision: true, activa: true }
];

let LINEAS = LINEAS_RESPALDO.slice();
let SEED_PROGRAMACION = SEED_PROGRAMACION_RESPALDO.map(p=>({...p}));
let ANALISTA_PIN = ANALISTA_PIN_RESPALDO;
let AUTORIZACION_CAUSALES_PIN = AUTORIZACION_CAUSALES_PIN_RESPALDO;
let CAUSALES_PARO = CAUSALES_PARO_RESPALDO.map(causal => ({ ...causal }));

function turnoDe(horaInicio){
  if (horaInicio >= 6 && horaInicio < 14) return 'T1';
  if (horaInicio >= 14 && horaInicio < 22) return 'T2';
  return 'T3';
}

async function cargarJSON(ruta){
  try{ const resp = await fetch(ruta); if (!resp.ok) return null; return await resp.json(); }catch(e){ return null; }
}

async function cargarConfiguracion(){
  const [config, parametros, progInicial] = await Promise.all([
    cargarJSON('json/config.json'), cargarJSON('json/parametros.json'), cargarJSON('json/programacion-inicial.json'),
  ]);

  if (config && typeof config.claveAnalista === 'string' && config.claveAnalista.trim() !== '') ANALISTA_PIN = config.claveAnalista.trim();
  if (config && typeof config.claveAutorizacionCausales === 'string' && config.claveAutorizacionCausales.trim() !== '') AUTORIZACION_CAUSALES_PIN = config.claveAutorizacionCausales.trim();
  
  const tituloEl = document.querySelector('.brand-text b');
  const subtituloEl = document.querySelector('.brand-text span');
  if (config && config.tituloApp && tituloEl) tituloEl.textContent = config.tituloApp;
  if (config && config.subtituloApp && subtituloEl) subtituloEl.textContent = config.subtituloApp;
  if (config && config.tituloApp) document.title = config.tituloApp + ' · Dashboard';

  if (parametros && Array.isArray(parametros.lineas) && parametros.lineas.length) LINEAS = parametros.lineas;
  if (parametros && Array.isArray(parametros.causalesParo) && parametros.causalesParo.length){
    CAUSALES_PARO = parametros.causalesParo.filter(c => c && typeof c.nombre === 'string' && c.nombre.trim() !== '').map((c, i) => ({
        id: String(c.id || 'CAUSAL_' + (i + 1)).trim().toUpperCase(), nombre: c.nombre.trim(), requiereRevision: c.requiereRevision === true, activa: c.activa !== false
      }));
  }
  if (progInicial && Array.isArray(progInicial.programacion) && progInicial.programacion.length){
    SEED_PROGRAMACION = progInicial.programacion;
  }
}
// =================================================================
// ☁️ FUNCIONES CLOUD FIREBASE (Sincronización en tiempo real)
// =================================================================

// 1. Envía los datos de una OP a la base de datos en la nube
async function guardarOP_Firebase(codigoOP, datosCompletos) {
  try {
    if (!codigoOP) return;
    // 'merge: true' hace que solo actualice lo que cambió, sin borrar lo demás
    await db.collection("ordenes_produccion").doc(String(codigoOP)).set(datosCompletos, { merge: true });
    // console.log(`OP ${codigoOP} guardada en la nube.`);
  } catch (error) {
    console.error("Error guardando en la nube:", error);
  }
}

// 2. Escucha la base de datos en tiempo real (La magia del modo multijugador)
function iniciarSincronizacion(callbackActualizacion) {
  // onSnapshot se dispara automáticamente en milisegundos si CUALQUIER operario hace un cambio
  db.collection("ordenes_produccion").onSnapshot((snapshot) => {
    let opsSincronizadas = [];
    snapshot.forEach((doc) => {
      opsSincronizadas.push(doc.data());
    });
    // Avisamos a la aplicación que hay nuevos datos frescos
    callbackActualizacion(opsSincronizadas);
  });
}