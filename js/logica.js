/* logica.js — EYS (LOCAL) */
const state = { programacion: [], historico: [], historialOps: [], cortesTurno: [], horariosAlim: {}, usuario: '', totalUnidadesTeoricas: 0 };

const STORAGE_KEY_PROG = 'eys_programacion_v1';
const STORAGE_KEY_HIST = 'eys_historico_v1';
const STORAGE_KEY_USER = 'eys_usuario_v1';
const STORAGE_KEY_TOTAL_TEORICO = 'eys_total_teorico_v1';
const STORAGE_KEY_CORTES = 'eys_cortes_turno_v1';
const STORAGE_KEY_HISTORIAL_OPS = 'eys_historial_ops_v1';
const STORAGE_KEY_ALIMENTACION = 'eys_alimentacion_v1';

// --- NUEVOS MOTORES CLOUD (FIREBASE) ---
async function storageGet(key) {
  try {
    // 1. Intentamos leer de la nube primero
    const docRef = db.collection('eys_planta').doc('estado_global');
    const docSnap = await docRef.get();
    
    if (docSnap.exists && docSnap.data()[key] !== undefined) {
      return docSnap.data()[key];
    }
    // Si no hay datos en la nube aún, leemos del respaldo local
    return window.localStorage.getItem(key);
  } catch (e) {
    console.error("Error leyendo de Firebase:", e);
    return window.localStorage.getItem(key);
  }
}

async function storageSet(key, value) {
  try {
    // 1. Guardamos en el almacenamiento local como respaldo (por si falla el internet)
    window.localStorage.setItem(key, value);
    
    // 2. Enviamos el dato a la nube en tiempo real
    await db.collection('eys_planta').doc('estado_global').set({
      [key]: value
    }, { merge: true });
    
    return true;
  } catch (e) {
    console.error("Error guardando en Firebase:", e);
    return false;
  }
}

function guardarProgramacion(){ return storageSet(STORAGE_KEY_PROG, JSON.stringify(state.programacion)); }
function guardarHistorico(){ return storageSet(STORAGE_KEY_HIST, JSON.stringify(state.historico)); }
function guardarUsuario(){ return storageSet(STORAGE_KEY_USER, state.usuario || ''); }
function guardarTotalTeorico(){ return storageSet(STORAGE_KEY_TOTAL_TEORICO, String(state.totalUnidadesTeoricas || 0)); }
function guardarCortesTurno(){ return storageSet(STORAGE_KEY_CORTES, JSON.stringify(state.cortesTurno)); }
function guardarHistorialOps(){ return storageSet(STORAGE_KEY_HISTORIAL_OPS, JSON.stringify(state.historialOps)); }
function guardarHorariosAlim(){ return storageSet(STORAGE_KEY_ALIMENTACION, JSON.stringify(state.horariosAlim)); }

function seedProgramacionSiVacio(){ state.programacion = SEED_PROGRAMACION.map(p => ({...p})); }

async function inicializarEstado(){
  const [progRaw, histRaw, userRaw, totalTeoricoRaw, cortesRaw, historialOpsRaw, alimentacionRaw] = await Promise.all([
    storageGet(STORAGE_KEY_PROG), storageGet(STORAGE_KEY_HIST), storageGet(STORAGE_KEY_USER),
    storageGet(STORAGE_KEY_TOTAL_TEORICO), storageGet(STORAGE_KEY_CORTES), storageGet(STORAGE_KEY_HISTORIAL_OPS), storageGet(STORAGE_KEY_ALIMENTACION)
  ]);

  try { state.programacion = progRaw ? JSON.parse(progRaw) : []; } catch (error) { state.programacion = []; }
  try { state.historico = histRaw ? JSON.parse(histRaw) : []; } catch (error) { state.historico = []; }

  if (!Array.isArray(state.programacion)){ state.programacion = []; await guardarProgramacion(); }
  state.programacion.forEach(function(op){
    if (typeof op.cerrada === 'undefined') op.cerrada = false;
    if (typeof op.iniciada === 'undefined') op.iniciada = false;
    if (typeof op.fechaCierre === 'undefined') op.fechaCierre = null;
    if (typeof op.cerradaPor === 'undefined') op.cerradaPor = null;
  });

  if (!Array.isArray(state.historico)){ state.historico = []; await guardarHistorico(); }

  state.usuario = userRaw || '';
  state.totalUnidadesTeoricas = Number(totalTeoricoRaw || 0);

  try{ state.cortesTurno = cortesRaw ? JSON.parse(cortesRaw) : []; } catch{ state.cortesTurno = []; }
  try{ state.historialOps = historialOpsRaw ? JSON.parse(historialOpsRaw) : []; } catch{ state.historialOps = []; }

  const defaultHorarios = {
    lv_t1_g1: '', lv_t1_pausa: '', lv_t2_g1: '', lv_t2_pausa: '', lv_t3_g1: '', lv_t3_pausa: '',
    s_t1_g1: '',  s_t1_pausa: '',  s_t2_g1: '',  s_t2_pausa: '',  s_t3_g1: '',  s_t3_pausa: '',
    d_t1_g1: '',  d_t1_pausa: '',  d_t2_g1: '',  d_t2_pausa: ''
  };
  
  try {
    const parsed = alimentacionRaw ? JSON.parse(alimentacionRaw) : {};
    state.horariosAlim = { ...defaultHorarios };
    ['lv_t1', 'lv_t2', 'lv_t3', 's_t1', 's_t2', 's_t3', 'd_t1', 'd_t2'].forEach(pref => {
      state.horariosAlim[`${pref}_g1`] = parsed[`${pref}_g1`] || parsed[`${pref}_g2`] || defaultHorarios[`${pref}_g1`] || '';
      state.horariosAlim[`${pref}_pausa`] = parsed[`${pref}_pausa`] || '';
    });
  } catch {
    state.horariosAlim = { ...defaultHorarios };
  }

  // --- INICIO DE SINCRONIZACIÓN EN TIEMPO REAL ---
  if (window.db) {
    const docRef = window.db.collection('eys_planta').doc('estado_global');
    
    // onSnapshot 'escucha' la nube. Si otro operario guarda algo, esto se dispara al instante.
    docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const datosNube = doc.data();
        let huboCambios = false;

        // Actualizamos la programación si cambió en la nube
        if (datosNube[STORAGE_KEY_PROG] && datosNube[STORAGE_KEY_PROG] !== JSON.stringify(state.programacion)) {
          state.programacion = JSON.parse(datosNube[STORAGE_KEY_PROG]);
          huboCambios = true;
        }
        
        // Actualizamos los cortes del turno
        if (datosNube[STORAGE_KEY_CORTES] && datosNube[STORAGE_KEY_CORTES] !== JSON.stringify(state.cortesTurno)) {
          state.cortesTurno = JSON.parse(datosNube[STORAGE_KEY_CORTES]);
          huboCambios = true;
        }

        // Si hubo cambios y la interfaz ya cargó, repintamos la pantalla
        if (huboCambios && typeof renderViews === 'function') {
          renderViews(); // Refresca las tablas sin recargar la página
        }
      }
    }, (error) => {
      console.error("Error en la sincronización en tiempo real:", error);
    });
  }
}

const fmtInt   = n => Math.round(n||0).toLocaleString('es-CO');
const fmtDec   = (n,d=1) => (n||0).toLocaleString('es-CO', {minimumFractionDigits:d, maximumFractionDigits:d});
const fmtPct0  = n => Math.round((n||0)*100) + '%';
const fmtPct1  = n => ((n||0)*100).toLocaleString('es-CO', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';

function horaDecimalATexto(h){ h = ((h % 24) + 24) % 24; const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); const hh2 = mm === 60 ? hh+1 : hh; const mm2 = mm === 60 ? 0 : mm; return String(hh2 % 24).padStart(2,'0') + ':' + String(mm2).padStart(2,'0'); }
function toDecimalHour(date){ return date.getHours() + date.getMinutes()/60 + date.getSeconds()/3600; }
function fechaISO(date){ const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
function obtenerFechaOperativa(fechaHora){ const fecha = new Date(fechaHora); if (fecha.getHours() < 14){ fecha.setDate(fecha.getDate() - 1); } return fechaISO(fecha); }
function fechaTexto(iso){ const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; }
function horaTexto(date){ return String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0')+':'+String(date.getSeconds()).padStart(2,'0'); }
function horaDeRegistro(hStr){ return parseInt(hStr.split(':')[0],10); }
function uid(){ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function buscarProgramacion(linea, op){ const l = (linea||'').trim().toUpperCase(); const o = (op==null? '': String(op)).trim(); return state.programacion.find(p => p.linea.trim().toUpperCase()===l && String(p.op).trim()===o) || null; }

function registrarInicioTramoOP(prog, fechaInicio){
  const existe = state.historialOps.find(function(item){ return (item.linea === prog.linea && item.op === prog.op && item.finReal === null); });
  if (existe) return;
  state.historialOps.push({ linea: prog.linea, op: prog.op, uph: prog.uph, inicioReal: fechaInicio, finReal: null });
  guardarHistorialOps();
}

function calcularDescuentoAlimentacion(linea, fechaInicio, fechaFin) {
  if (!state.horariosAlim) return 0;

  let descuentoHoras = 0;
  const pausasAplicadas = new Set();
  const getDiaOperativo = (fecha) => {
    const d = new Date(fecha);
    if (d.getHours() < 6) d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const diaOpInicio = getDiaOperativo(fechaInicio);
  const diaOpFin = getDiaOperativo(fechaFin);

  const diasOperativos = [];
  let currentOp = new Date(diaOpInicio);
  while (currentOp <= diaOpFin) {
    diasOperativos.push(new Date(currentOp));
    currentOp.setDate(currentOp.getDate() + 1);
  }
  // Evalúa el grupo único de alimentación (50 min) y la pausa activa (10 min) para todas las líneas
  const configuracionPausas = [
    { sufijo: 'g1', duracionMin: 50, tipo: 'ALIM' },
    { sufijo: 'pausa', duracionMin: 10, tipo: 'PAUSA' }
  ];
  diasOperativos.forEach(diaOp => {
    const dayOfWeek = diaOp.getDay();
    let pfx = 'lv';
    if (dayOfWeek === 6) pfx = 's';
    else if (dayOfWeek === 0) pfx = 'd';

    ['t1', 't2', 't3'].forEach(t => {
      configuracionPausas.forEach(cfg => {
        const horaStr = state.horariosAlim[`${pfx}_${t}_${cfg.sufijo}`];
        if (!horaStr) return;

        const [h, m] = horaStr.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return;

        const inicioPausa = new Date(diaOp);
        if (t === 't3' && h < 14) {
          inicioPausa.setDate(inicioPausa.getDate() + 1);
        }
        inicioPausa.setHours(h, m, 0, 0);

        const pausaId = `${cfg.tipo}_${inicioPausa.getTime()}`;
        if (pausasAplicadas.has(pausaId)) return;

        const pausaFin = new Date(inicioPausa.getTime() + (cfg.duracionMin * 60000));
        const maxInicio = new Date(Math.max(fechaInicio, inicioPausa));
        const minFin = new Date(Math.min(fechaFin, pausaFin));

        if (maxInicio < minFin) {
          descuentoHoras += (minFin - maxInicio) / 3600000;
          pausasAplicadas.add(pausaId);
        }
      });
    });
  });

  return Math.min(descuentoHoras, 3.0);
}
function registrarProduccion(opts){
  const { linea: lineaIn, op: opIn, acumuladoStr, usuario, observacion, timestamp, forzarSobreproduccion, guardar = true } = opts;
  const linea = (lineaIn || '').trim();
  if (!linea) return { ok:false, icon:'warning', title:'Dato obligatorio', message:'Seleccione una línea.' };
  const op = (opIn == null ? '' : String(opIn)).trim();
  if (!op) return { ok:false, icon:'warning', title:'Dato obligatorio', message:'Seleccione o escriba una OP.' };
  const cantidadHora = Number(acumuladoStr);
  if (acumuladoStr === '' || acumuladoStr == null || Number.isNaN(cantidadHora)){ return { ok:false, icon:'warning', title:'Dato incorrecto', message:'Digite las unidades producidas en la hora.' }; }
  if (cantidadHora < 0){ return { ok:false, icon:'warning', title:'Dato incorrecto', message:'Las unidades producidas en la hora no pueden ser negativas.' }; }
  
  const ahora = timestamp || new Date();
  const prog = buscarProgramacion(linea, op);
  if (!prog) return { ok:false, icon:'error', title:'OP no válida', message:`La OP ${op} no pertenece a la línea ${linea} o no está disponible.` };
  if (prog.cerrada === true) return { ok:false, icon:'warning', title:'OP cerrada', message:`La OP ${op} fue cerrada y ya no admite registros.` };
  if (prog.iniciada !== true) return { ok:false, icon:'warning', title:'OP no iniciada', message:`La OP ${op} aún no se ha iniciado. Presione "INICIAR OP".` };

  registrarInicioTramoOP(prog, ahora.toISOString());

  const previos = state.historico.filter(r => r.linea.toUpperCase() === linea.toUpperCase() && String(r.op).trim() === op).sort((a,b) => a.ts.localeCompare(b.ts));
  const acumuladoAnterior = previos.length ? previos[previos.length - 1].acumulado : 0;
  const acumuladoNum = acumuladoAnterior + cantidadHora;

  if (prog.cantidad > 0 && acumuladoNum > prog.cantidad && !forzarSobreproduccion){
    return { ok:'confirm', icon:'warning', title:'Confirmar sobreproducción', message:`El acumulado supera la cantidad programada de ${fmtInt(prog.cantidad)} unidades.\n¿Desea guardar el registro?`, pending:{ linea, op, acumuladoStr, usuario, observacion, timestamp, guardar } };
  }

  const nowDec = toDecimalHour(ahora);
  let planAcumulado = 0;

  if (prog.uph > 0) {
    let horasTranscurridas = 0;
    let descuentoAlimentacion = 0; 
    const tramosOp = state.historialOps.filter(item => item.linea === linea && String(item.op) === op);

    if (tramosOp.length > 0) {
      tramosOp.forEach(tramo => {
        if (tramo.inicioReal) {
          const inicio = new Date(tramo.inicioReal);
          const fin = tramo.finReal ? new Date(tramo.finReal) : ahora;
          horasTranscurridas += (fin - inicio) / 3600000;
          descuentoAlimentacion += calcularDescuentoAlimentacion(linea, inicio, fin);
        }
      });
    } else {
      horasTranscurridas = nowDec - prog.horaInicio;
      if (String(prog.turno || '').toUpperCase() === 'T3' && horasTranscurridas < 0) horasTranscurridas += 24;
    }

    horasTranscurridas -= descuentoAlimentacion;
    if (horasTranscurridas < 0) horasTranscurridas = 0;
    if (Number.isFinite(Number(prog.duracion)) && Number(prog.duracion) > 0) horasTranscurridas = Math.min(horasTranscurridas, Number(prog.duracion));
    planAcumulado = horasTranscurridas * Number(prog.uph);
    if (Number(prog.cantidad) > 0 && planAcumulado > Number(prog.cantidad)) planAcumulado = Number(prog.cantidad); 
  }
   //cumplimiento cantidad hora / en uph
  const diferencia = acumuladoNum - planAcumulado;
  const uphObjetivo = Number(prog.uph || 0);
  const cumplimiento = uphObjetivo > 0 ? Number(cantidadHora) / uphObjetivo : 0;
  
  let estado = 'PENDIENTE';
  if (uphObjetivo > 0) estado = cumplimiento >= 1 ? 'ADELANTADO' : (cumplimiento >= 0.95 ? 'EN TIEMPO' : 'ATRASADO');


  const objetivoHora = Number(prog.uph);
  let estadoHora = 'NO CUMPLE';
  let colorEstadoHora = 'rojo';

  if (cantidadHora >= objetivoHora && cantidadHora <= (objetivoHora + 5)){ estadoHora = 'CUMPLE'; colorEstadoHora = 'verde'; }
  else if (cantidadHora > (objetivoHora + 5)){ estadoHora = 'SUPERA'; colorEstadoHora = 'azul'; }

  const record = {
    id: uid(), ts: ahora.toISOString(), fecha: fechaISO(ahora), fechaOperativa: obtenerFechaOperativa(ahora), hora: horaTexto(ahora),
    linea, op, acumulado: acumuladoNum, usuario: (usuario || '').trim() || 'Operador', observacion: (observacion || '').trim(),
    cantidadHora, planAcumulado, diferencia, cumplimiento, estado, estadoHora, colorEstadoHora, uphPlan: prog.uph, producto: prog.producto
  };

  state.historico.push(record);
  if (guardar) guardarHistorico();
  return { ok:true, record, cantidadHora, cumplimiento };
}

function computeDashboard(){
  const fecha = obtenerFechaOperativa(new Date());
  const regsHoy = state.historico.filter(r => obtenerFechaOperativa(r.ts) === fecha);

  const unidadesProducidas = regsHoy.reduce((s,r)=>s+r.cantidadHora, 0);
  const planDelDia = Number(state.totalUnidadesTeoricas) > 0 ? Number(state.totalUnidadesTeoricas) : state.programacion.reduce((total, programa) => { const cantidad = Number(programa.cantidad); return total + (Number.isFinite(cantidad) ? cantidad : 0); }, 0);
  const cumplimientoGlobal = planDelDia > 0 ? unidadesProducidas/planDelDia : 0;
  const registros = regsHoy.filter(r=>r.op).length;
  
  const ultimosEstadosPorLinea = {};
  regsHoy.forEach(registro => { const linea = registro.linea; if (!ultimosEstadosPorLinea[linea] || registro.ts > ultimosEstadosPorLinea[linea].ts) ultimosEstadosPorLinea[linea] = registro; });
  const lineasNoCumplen = Object.values(ultimosEstadosPorLinea).filter(registro => registro.estadoHora === 'NO CUMPLE').length;
  const lineasActivas = new Set(regsHoy.filter(r=>r.cantidadHora>0).map(r=>r.linea)).size;

  const porLinea = LINEAS.map(linea => {
    const regs = regsHoy.filter(r=>r.linea===linea);
    const unidades = regs.reduce((s,r)=>s+r.cantidadHora, 0);
    
    let plan = 0;
    const opsDelDia = [...new Set(regs.map(r => String(r.op)))];
    opsDelDia.forEach(opName => { const regsOp = regs.filter(r => String(r.op) === opName).sort((a,b) => a.ts.localeCompare(b.ts)); if(regsOp.length > 0) plan += regsOp[regsOp.length - 1].planAcumulado; });
    const diferencia = unidades - plan;
    const prog = state.programacion.find(p=>p.linea===linea);

    let opActiva = '', uphPlan = prog ? prog.uph : 0, uphReal = 0;
    const sinRegistros = !regs.length;
    if (regs.length){ 
      const ultimo = regs.slice().sort((a,b)=>a.ts.localeCompare(b.ts)).pop(); 
      opActiva = ultimo.op; 
      uphPlan = ultimo.uphPlan; 
      uphReal = ultimo.cantidadHora; 
    }

    // Cumplimiento exclusivo para esta tabla: UPH real / UPH plan
    const cumplimiento = uphPlan > 0 ? (uphReal / uphPlan) : 0;

    let estado = 'SIN REGISTRO';
    if (regs.length){ 
      const ultimo = regs.slice().sort((a,b)=>a.ts.localeCompare(b.ts)).pop(); 
      estado = ultimo.estadoHora || 'SIN REGISTRO'; 
    }
    
    let inicioReal = null;
    const opBusqueda = opActiva || (prog ? prog.op : '');
    if (opBusqueda) { 
      const tramos = state.historialOps.filter(item => item.linea === linea && String(item.op) === String(opBusqueda)); 
      if (tramos.length > 0) { 
        const tramoActivo = tramos.find(t => t.finReal === null) || tramos[tramos.length - 1]; 
        if (tramoActivo && tramoActivo.inicioReal) {
          inicioReal = tramoActivo.inicioReal; 
        }
      } 
    }
    
    return { linea, opActiva, unidades, plan, diferencia, cumplimiento, uphPlan, uphReal, estado, sinRegistros, opProgramada: prog ? prog.op : '', inicioReal };
  });

  const horas = [];
  for (let horaOperativa = 14; horaOperativa <= 37; horaOperativa++) {
    const horaReloj = ((horaOperativa % 24) + 24) % 24;
    const registrosHora = regsHoy.filter(registro => horaDeRegistro(registro.hora) === horaReloj);
    const realHora = registrosHora.reduce((total, registro) => total + Number(registro.cantidadHora || 0), 0);
    const planHora = registrosHora.reduce((total, registro) => total + Number(registro.uphPlan || 0), 0);
    horas.push({ hora: horaOperativa, real: realHora, plan: planHora });
  }
  
  return { fecha, unidadesProducidas, planDelDia, cumplimientoGlobal, registros, lineasNoCumplen, lineasActivas, porLinea, horas };
}

function obtenerDefinicionTurnos(fechaObj) {
  const dia = fechaObj.getDay();
  const hora = fechaObj.getHours() + (fechaObj.getMinutes() / 60);
  const esHorarioSabado = (dia === 6 && hora >= 6) || (dia === 0 && hora < 6);
  if (esHorarioSabado) return { T1: { turno: 'T1', inicio: 6, fin: 13 }, T2: { turno: 'T2', inicio: 13, fin: 20 }, T3: { turno: 'T3', inicio: 20, fin: 30 } };
  return { T1: { turno: 'T1', inicio: 6, fin: 14 }, T2: { turno: 'T2', inicio: 14, fin: 22 }, T3: { turno: 'T3', inicio: 22, fin: 30 } };
}
function obtenerTurnoActual(fechaParam = new Date()){
  const definicion = obtenerDefinicionTurnos(fechaParam);
  const horaReal = fechaParam.getHours() + (fechaParam.getMinutes() / 60);
  const horaOperativa = horaReal < 6 ? horaReal + 24 : horaReal;
  if (horaOperativa >= definicion.T1.inicio && horaOperativa < definicion.T1.fin) return definicion.T1;
  if (horaOperativa >= definicion.T2.inicio && horaOperativa < definicion.T2.fin) return definicion.T2;
  return definicion.T3;
}
function calcularTiempoEfectivoTurno(){
  const ahora = new Date();
  const turno = obtenerTurnoActual(ahora);
  const inicioTurnoReal = turno.inicio >= 24 ? turno.inicio - 24 : turno.inicio;
  const inicioTurnoFecha = new Date(ahora);
  inicioTurnoFecha.setHours(Math.floor(inicioTurnoReal), 0, 0, 0);

  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;
  if (turno.turno === 'T3' && horaActual < 6) {
    inicioTurnoFecha.setDate(inicioTurnoFecha.getDate() - 1);
  }

  const horasTranscurridas = Math.max(0, (ahora - inicioTurnoFecha) / 3600000);
  const descuento = calcularDescuentoAlimentacion('GENERAL', inicioTurnoFecha, ahora);
  return { turno: turno.turno, horasEfectivas: Math.max(0, horasTranscurridas - descuento) };
}
function calcularCorteTurno(opts){
  const datosTurno = calcularTiempoEfectivoTurno(opts);
  const fechaCorte = new Date().toISOString();
  const fechaOperativa = obtenerFechaOperativa(new Date()); 
  const resultado = [];
  const lineasUnicas = [...new Set(state.programacion.map(x => x.linea))];
  let totalProgramado = 0; let totalReal = 0;
  lineasUnicas.forEach(function(linea){
    const programado = calcularProgramadoLineaCorte(linea, fechaCorte);
    const real = state.historico.filter(r => r.linea === linea && r.fechaOperativa === fechaOperativa).reduce((total, r) => total + Number(r.cantidadHora || 0), 0);
    const opActiva = state.programacion.find(p => p.linea === linea && p.iniciada === true && p.cerrada !== true);
    const uphActual = opActiva ? Number(opActiva.uph || 0) : 0;
    const cumplimiento = programado > 0 ? real / programado : (real > 0 ? 1 : 0);
    totalProgramado += programado; totalReal += real;
    resultado.push({ linea, programado: Math.round(programado), uph: uphActual, real: Math.round(real), cumplimiento });
  });
  return { turno: datosTurno.turno, horasEfectivas: datosTurno.horasEfectivas, totalProgramado: Math.round(totalProgramado), totalReal: Math.round(totalReal), cumplimientoGlobal: totalProgramado > 0 ? totalReal / totalProgramado : 0, detalle: resultado };
}
function calcularProgramadoLineaCorte(linea, fechaCorte){
  const corte = new Date(fechaCorte);
  const datosTurno = obtenerTurnoActual(corte);
  const inicioTurnoReal = datosTurno.inicio >= 24 ? datosTurno.inicio - 24 : datosTurno.inicio;
  const inicioTurnoFecha = new Date(corte);
  inicioTurnoFecha.setHours(Math.floor(inicioTurnoReal), 0, 0, 0);
  const horaCorteDecimal = corte.getHours() + (corte.getMinutes() / 60);
  if (datosTurno.turno === 'T3' && horaCorteDecimal < 6) inicioTurnoFecha.setDate(inicioTurnoFecha.getDate() - 1);

  let totalProgramado = 0; let horasTotales = 0; let descuentoTotal = 0;
  const tramosLinea = state.historialOps.filter(x => x.linea === linea);
  tramosLinea.forEach(function(tramo){
    if (!tramo.inicioReal) return;
    const inicioReal = new Date(tramo.inicioReal);
    const finReal = tramo.finReal ? new Date(tramo.finReal) : corte;
    let inicioTramo = new Date(inicioReal); let finTramo = new Date(finReal);
    if (finTramo <= inicioTurnoFecha) return;
    if (inicioTramo < inicioTurnoFecha) inicioTramo = new Date(inicioTurnoFecha);
    const horas = (finTramo - inicioTramo) / 3600000;
    if (horas <= 0) return;
    horasTotales += horas;
    totalProgramado += horas * Number(tramo.uph || 0);
    descuentoTotal += calcularDescuentoAlimentacion(linea, inicioTramo, finTramo);
  });
  const horasTurnoTranscurridas = (corte - inicioTurnoFecha) / 3600000;
  if (horasTotales > horasTurnoTranscurridas && horasTurnoTranscurridas > 0) { totalProgramado = totalProgramado * (horasTurnoTranscurridas / horasTotales); horasTotales = horasTurnoTranscurridas; }
  if (horasTotales > 0) {
    let horasDescuento = Math.min(descuentoTotal, horasTotales);
    if (horasDescuento > 0) { const uphPromedio = totalProgramado / horasTotales; totalProgramado -= (horasDescuento * uphPromedio); }
  }
  return Math.max(0, totalProgramado);
}