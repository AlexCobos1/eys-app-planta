// --- SISTEMA DE LOGIN TEMPORAL (Preparado para Firebase) ---
// 1. Función para aplicar el acceso
function concederAcceso(rol) {
  if (rol === 'auxiliar') {
    document.body.classList.add('rol-auxiliar');
    // Forzamos a que su vista inicial sea "Control Operador"
    document.querySelectorAll('#mainNav button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelector('button[data-view="control"]').classList.add('active');
    document.getElementById('view-control').classList.add('active');
  } else {
    document.body.classList.remove('rol-auxiliar');
  }
  // Ocultamos pantalla de login
  document.getElementById('loginOverlay').style.display = 'none';
}

// 2. Revisar si ya habíamos iniciado sesión antes de recargar la página
const sesionGuardada = localStorage.getItem('eys_sesion_rol');
if (sesionGuardada) {
  concederAcceso(sesionGuardada);
}

// 3. Evento al enviar el formulario
document.getElementById('formLogin').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const password = document.getElementById('loginPassword').value;
  const rolSeleccionado = document.querySelector('input[name="rol"]:checked').value;

  const passAuxiliar = "auxiliar123";
  const passProgramador = "Analista123";

  if (rolSeleccionado === 'auxiliar' && password !== passAuxiliar) {
    await modalError('Acceso denegado', 'La contraseña para AUXILIAR es incorrecta.');
    return; 
  }
  
  if (rolSeleccionado === 'programador' && password !== passProgramador) {
    await modalError('Acceso denegado', 'La contraseña para PROGRAMADOR es incorrecta.');
    return; 
  }

  // Si la contraseña es correcta, guardamos en la memoria del navegador y damos acceso
  localStorage.setItem('eys_sesion_rol', rolSeleccionado);
  concederAcceso(rolSeleccionado);
  document.getElementById('loginPassword').value = ''; 
});

// 4. Botón visible de Cerrar Sesión
const btnSalir = document.getElementById('btnSalir');
if (btnSalir) {
  btnSalir.addEventListener('click', async () => {
    const ok = await modalConfirmar('Cerrar sesión', '¿Deseas cerrar la sesión actual y salir del sistema?');
    if (ok) {
      localStorage.removeItem('eys_sesion_rol'); // Borramos la sesión de la memoria
      window.location.reload(); // Recargamos la página para volver al inicio
    }
  });
}

document.getElementById('mainNav').addEventListener('click', (e)=>{ const btn = e.target.closest('button[data-view]'); if (!btn) return; document.querySelectorAll('#mainNav button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); document.getElementById('view-'+btn.dataset.view).classList.add('active'); if (btn.dataset.view === 'dashboard') renderChartHoras(computeDashboard().horas); });
document.getElementById('fLinea').addEventListener('change', function(){ actualizarOpOptions(); actualizarReadout(); });
document.getElementById('fOP').addEventListener('input', function(){ actualizarReadout(); });
document.getElementById('formControl').addEventListener('submit', manejarSubmitControl);
document.getElementById('btnCerrarOpActual').addEventListener('click', cerrarOpActual);

// --- NUEVO: INICIAR OP (PIDIENDO UNIDADES POR CAJA) ---
document.getElementById('btnIniciarOp').addEventListener('click', async function(){
  const linea = document.getElementById('fLinea').value; const op = document.getElementById('fOP').value.trim();
  if (!linea || !op){ await modalAlerta('Seleccione una OP', 'Debe seleccionar una línea y una OP antes de iniciar.'); return; }
  const prog = buscarProgramacion(linea, op);
  if (!prog){ await modalError('OP no encontrada', 'No se encontró la OP seleccionada.'); return; }
  if (prog.cerrada === true){ await modalError('OP cerrada', 'La OP está cerrada.'); return; }
  if (prog.iniciada === true){ await modalAlerta('OP ya iniciada', 'La OP ya se encuentra en producción.'); return; }
  const opActivaEnLinea = state.programacion.find(p => p.linea.trim().toUpperCase() === linea.trim().toUpperCase() && p.iniciada === true && p.cerrada !== true && p.op !== prog.op);
  if (opActivaEnLinea) { await modalError('Línea ocupada', `No puedes iniciar esta orden. La OP ${opActivaEnLinea.op} está activa.\n\nDebes presionar "🔒 CERRAR OP ACTUAL" antes de iniciar una nueva.`); return; }
  // 1. Preguntamos las unidades por caja
  const undPorCajaStr = prompt(`INICIO DE OP ${op}\n\n¿Cuántas unidades vienen embaladas por caja en esta OP?`);
  if (undPorCajaStr === null) return; // Si el operario cancela
  const undPorCaja = Number(undPorCajaStr);
  if (isNaN(undPorCaja) || undPorCaja <= 0) {
    await modalError('Dato inválido', 'Debe ingresar un número válido mayor a 0 para las unidades por caja.');
    return;
  }
  // 2. Guardamos ese número en la programación de esta OP
  prog.undPorCaja = undPorCaja;
  prog.iniciada = true;
  state.historialOps.push({ linea: prog.linea, op: prog.op, uph: prog.uph, inicioReal: new Date().toISOString(), finReal: null });

  await guardarProgramacion(); await guardarHistorialOps();
  // 3. Reiniciamos el contador de la "Última Caja" a Cero al iniciar una OP nueva
  localStorage.setItem(`ultimaCaja_${op}`, "0"); 
  actualizarReadout(); renderTodo();
  await modalExito('OP iniciada', `La OP ${prog.op} inició correctamente.\nEl sistema calculará ${undPorCaja} unidades por cada caja ingresada.`);
});
document.getElementById('formProgramacion').addEventListener('submit', manejarSubmitProgramacion);
document.getElementById('buscarHistorico').addEventListener('input', renderHistorico);
document.getElementById('btnExportarHistorico').addEventListener('click', exportarHistoricoXLSX);
document.getElementById('btnResetDemo').addEventListener('click', confirmarResetDemo);
document.getElementById('btnCorteTurno').addEventListener('click', function(){ document.getElementById('corteOverlay').classList.add('show'); });
document.getElementById('btnCerrarCorte').addEventListener('click', function(){ document.getElementById('corteOverlay').classList.remove('show'); });

document.getElementById('btnCalcularCorte').addEventListener('click', async function(){
  const resultadoCorte = calcularCorteTurno({});
  let ultimoNumero = 0;
  if (state.cortesTurno.length > 0) { const ultimoCorte = state.cortesTurno[state.cortesTurno.length - 1]; const partesId = ultimoCorte.id.split('-'); if (partesId.length === 2) { ultimoNumero = parseInt(partesId[1], 10) || 0; } }
  const idFormateado = 'CORTE-' + String(ultimoNumero + 1).padStart(4, '0');
  const nuevoCorte = { id: idFormateado, fecha: fechaISO(new Date()), hora: horaTexto(new Date()), ...resultadoCorte };
  state.cortesTurno.push(nuevoCorte);
  await guardarCortesTurno();
  document.getElementById('corteOverlay').classList.remove('show');
  renderHistorialCortes();
  mostrarDetalleCorte(nuevoCorte);
});

document.getElementById('modalOverlay').addEventListener('click', (e)=>{ if (e.target.id === 'modalOverlay'){ cerrarModal(); if (_modalResolve) _modalResolve(false); } });
document.getElementById('corteOverlay').addEventListener('click', function(e){ if (e.target.id === 'corteOverlay'){ document.getElementById('corteOverlay').classList.remove('show'); } });
window.addEventListener('resize', ()=>{ clearTimeout(window._spResizeT); window._spResizeT = setTimeout(()=>{ if(document.getElementById('view-dashboard').classList.contains('active')) renderChartHoras(computeDashboard().horas); }, 150); });

let _importParsed = null;
let _excelDataRows = null; // Almacenará los datos del Excel nativo

function parseNumero(raw){
  if (raw === null || raw === undefined) return NaN;
  let texto = String(raw).trim().replace(/\s/g, '');
  if (texto === '') return NaN;
  if (texto.includes(',') && texto.includes('.')){ const ultimaComa = texto.lastIndexOf(','); const ultimoPunto = texto.lastIndexOf('.'); if (ultimaComa > ultimoPunto){ texto = texto.replace(/\./g, '').replace(',', '.'); } else { texto = texto.replace(/,/g, ''); } } 
  else if (texto.includes(',')){ const partes = texto.split(','); const parteFinal = partes[partes.length - 1]; if (partes.length > 2 || parteFinal.length === 3){ texto = texto.replace(/,/g, ''); } else { texto = texto.replace(',', '.'); } } 
  else if ((texto.match(/\./g) || []).length > 1){ texto = texto.replace(/\./g, ''); }
  const numero = Number(texto); return Number.isFinite(numero) ? numero : NaN;
}

function parseHoraCampo(raw){
  if (raw == null) return NaN; const s = String(raw).trim(); if (s === '') return NaN;
  if (s.includes(':')){ const partes = s.split(':').map(Number); return (partes[0]||0) + (partes[1]||0)/60 + (partes[2]||0)/3600; }
  const n = parseNumero(s); if (Number.isNaN(n)) return NaN; return (n > 0 && n < 1) ? n*24 : n; 
}

function normalizarLinea(raw){
  let s = (raw||'').trim().toUpperCase();
  s = s.replace(/\r\n|\r|\n/g, ' ').replace(/\(.*?\)/g, '').trim();
  s = s.replace(/\s+/g, ' '); 
  s = s.replace('LÍNEA', 'LINEA'); 
  s = s.trim();
  const compacta = s.replace(/\s+/g,'');
  const encontrada = LINEAS.find(l => l.replace(/\s+/g,'').replace('LÍNEA', 'LINEA') === compacta);
  return encontrada || s;
}

function abrirImportModal(){ document.getElementById('importStepPin').style.display = ''; document.getElementById('importStepPaste').style.display = 'none'; document.getElementById('importStepConfirm').style.display = 'none'; document.getElementById('importPinInput').value = ''; document.getElementById('importPinError').textContent = ''; document.getElementById('importOverlay').classList.add('show'); setTimeout(()=>document.getElementById('importPinInput').focus(), 50); }
function cerrarImportModal(){ document.getElementById('importOverlay').classList.remove('show'); _excelDataRows = null; document.getElementById('importPreview').innerHTML = ''; document.getElementById('importPasteAnalizar').style.display = 'none'; document.getElementById('importFileInput').value = ''; }

document.getElementById('btnCargarPrograma').addEventListener('click', abrirImportModal);
document.getElementById('importPinCancel').addEventListener('click', cerrarImportModal);
document.getElementById('importPasteCancel').addEventListener('click', cerrarImportModal);
document.getElementById('importOverlay').addEventListener('click', (e)=>{ if (e.target.id === 'importOverlay') cerrarImportModal(); });

document.getElementById('importPinSubmit').addEventListener('click', ()=>{ const val = document.getElementById('importPinInput').value; if (val !== ANALISTA_PIN){ document.getElementById('importPinError').textContent = 'Clave incorrecta.'; return; } document.getElementById('importStepPin').style.display = 'none'; document.getElementById('importStepPaste').style.display = ''; document.getElementById('importPreview').innerHTML = ''; _excelDataRows = null; document.getElementById('importPasteAnalizar').style.display = 'none'; });
document.getElementById('importPinInput').addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); document.getElementById('importPinSubmit').click(); } });

// --- LÓGICA DRAG & DROP PARA LEER EL EXCEL ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('importFileInput');
const btnAnalizar = document.getElementById('importPasteAnalizar');
const importPreview = document.getElementById('importPreview');

if (dropZone) {
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = 'rgba(0, 229, 255, 0.15)'; });
  dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.background = 'rgba(0, 229, 255, 0.05)'; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.style.background = 'rgba(0, 229, 255, 0.05)';
    if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; procesarArchivoExcel(fileInput.files[0]); }
  });
  fileInput.addEventListener('change', (e) => { if (e.target.files.length) procesarArchivoExcel(e.target.files[0]); });
}

function procesarArchivoExcel(file) {
  // Mostramos el mensaje, la pantalla no se congelará más
  importPreview.innerHTML = '<span style="color:var(--blue-300);">⏳ Procesando.....</span>';
  btnAnalizar.style.display = 'none';
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    
    // Creamos un "Trabajador en Segundo Plano" (Web Worker)
    const workerCode = `
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      self.onmessage = function(e) {
        try {
          const workbook = XLSX.read(e.data, {
            type: 'array', cellFormula: false, cellHTML: false, cellStyles: false, sheetStubs: false
          });
          let sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('PLANTILLA')) || workbook.SheetNames[0];
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1, raw: false, defval: null});
          self.postMessage({ status: 'ok', rows: rows });
        } catch(err) {
          self.postMessage({ status: 'error', error: err.message });
        }
      };
    `;
    
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      // Cuando el trabajador de fondo termina, nos avisa aquí:
      worker.onmessage = function(msg) {
        if (msg.data.status === 'ok') {
          _excelDataRows = msg.data.rows;
          if (_excelDataRows.length > 0) {
            importPreview.innerHTML = `<span style="color:var(--st-entiempo); font-weight:700;">✅ Archivo cargado</span>&nbsp;- Listo para analizar.`;
            btnAnalizar.style.display = 'inline-flex';
          } else {
            importPreview.innerHTML = '<span style="color:var(--st-atrasado); font-weight:700;">❌ El archivo está vacío.</span>';
          }
        } else {
          importPreview.innerHTML = '<span style="color:var(--st-atrasado); font-weight:700;">❌ Error al leer: ' + msg.data.error + '</span>';
        }
        worker.terminate(); // Apagamos el trabajador para liberar memoria RAM
      };
      
      // Le enviamos el archivo al trabajador de fondo para que empiece
      worker.postMessage(data);
      
    } catch(error) {
      importPreview.innerHTML = '<span style="color:var(--st-atrasado); font-weight:700;">❌ Error iniciando el proceso en segundo plano.</span>';
    }
  };
  reader.readAsArrayBuffer(file);
}

// --- ANALIZAR Y EXTRAER OPs ---
document.getElementById('importPasteAnalizar').addEventListener('click', function(){
  if (!_excelDataRows || !_excelDataRows.length) return;
  try{
    const resultado = []; const lineasDesconocidas = new Set(); let totalUnidadesTeoricas = 0;
    
    _excelDataRows.forEach(cols => {
      if (!cols || !cols.length) return;
      
      // 1. Buscar la celda TOTAL UNI. PROG
      const indiceEtiqueta = cols.findIndex(col => {
        const txt = String(col || '').toUpperCase().replace(/\s+/g, ' ').trim();
        return txt.includes('TOTAL UNI. PROG') || txt.includes('TOTAL UNI PROG') || txt.includes('TOTAL UNIDADES PROGRAMADAS') || txt.includes('TOTAL UNI.PROG');
      });

      if (indiceEtiqueta !== -1) {
        for (let i = indiceEtiqueta + 1; i < cols.length; i++) {
          const valor = parseNumero(cols[i]);
          if (Number.isFinite(valor) && valor > 0) { totalUnidadesTeoricas = valor; break; }
        }
        return; // Salta esta fila para no meterla como OP
      }

      // 2. Si no es etiqueta, procesar OP normal (al menos 16 columnas)
      if (cols.length < 16) return;
      const lineaRaw = cols[0]; const turno = cols[1]; const op = cols[4];
      if (!turno || !lineaRaw || !op || String(op).toUpperCase().includes('OP') || String(turno).toUpperCase().includes('TOTAL')) return;

      const uph = parseNumero(cols[12]); 
      if (!Number.isFinite(uph) || uph <= 0) return;
      const linea_norm = normalizarLinea(lineaRaw);
      if (!LINEAS.includes(linea_norm)) lineasDesconocidas.add(lineaRaw);

      const hInicio = parseHoraCampo(cols[14]); const hFin = parseHoraCampo(cols[15]);
      let duracion = null;
      if (Number.isFinite(hInicio) && Number.isFinite(hFin)){ duracion = hFin - hInicio; if (duracion < 0) duracion += 24; }
      if (duracion == null || !Number.isFinite(duracion) || duracion <= 0) duracion = 8;
      const saldo = parseNumero(cols[10]); 

      resultado.push({
        turno: String(turno).toUpperCase(), linea: linea_norm, op: String(op), codigo: cols[5] || '', producto: cols[6] || '',
        uph, horaInicio: Number.isFinite(hInicio) ? hInicio : 0, duracion, cantidad: Number.isFinite(saldo) ? saldo : 0,
      });
    });

    // 3. Fallback: Si alguien borra la etiqueta "TOTAL UNI PROG" del excel, sumamos los saldos de la tabla como salvavidas
    if (totalUnidadesTeoricas === 0 && resultado.length > 0) {
       resultado.forEach(r => { totalUnidadesTeoricas += r.cantidad > 0 ? r.cantidad : r.duracion * r.uph; });
    }
    state.totalUnidadesTeoricas = totalUnidadesTeoricas; guardarTotalTeorico();
    
    _importParsed = resultado;
    if (!resultado.length){ importPreview.innerHTML = '<span style="color:var(--st-atrasado); font-weight:600;">No se encontraron OPs válidas en la hoja PLANTILLA.</span>'; return; }
    
    const lineasSet = new Set(resultado.map(r => r.linea));
    let mensaje = `<b style="color:var(--blue-300); font-family:var(--font-display); font-size:14px;">Plan del día detectado: ${fmtInt(totalUnidadesTeoricas)} u.</b><br>`;
    mensaje += `<span style="color:var(--ink-soft);">${resultado.length} OPs válidas en ${lineasSet.size} líneas.</span>`;
    if (lineasDesconocidas.size){ mensaje += `<br><span style="color:var(--st-enriesgo); font-weight:600;">Líneas no reconocidas: ${Array.from(lineasDesconocidas).join(', ')}.</span>`; }
    importPreview.innerHTML = mensaje;

    const pasoPegar = document.getElementById('importStepPaste'); const pasoConfirmar = document.getElementById('importStepConfirm'); const mensajeConfirmacion = document.getElementById('importConfirmMsg');
    const cantidadActual = window.state && Array.isArray(window.state.programacion) ? window.state.programacion.length : 0;
    mensajeConfirmacion.textContent = `Esto reemplazará las ${cantidadActual} OPs actuales por las ${resultado.length} recién extraídas. ¿Confirmas la carga?`;
    pasoPegar.style.display = 'none'; pasoConfirmar.style.display = 'block';
  }catch(error){ importPreview.innerHTML = '<span style="color:var(--st-atrasado); font-weight:600;">Error al procesar el Excel: ' + String(error.message || error) + '</span>'; }
});
document.getElementById('importConfirmOk').addEventListener('click', async function(){
  const boton = document.getElementById('importConfirmOk');
  try{
    if (!_importParsed || !Array.isArray(_importParsed) || !_importParsed.length){ await modalError('Sin información', 'No hay una programación analizada para guardar.'); return; }
    if (boton){ boton.disabled = true; boton.textContent = 'Guardando...'; }
    state.historialOps.forEach(t => { if (t.finReal === null) { t.finReal = new Date().toISOString(); } });
    await guardarHistorialOps();
    
    // Reemplaza únicamente la programación vigente, los horarios de alimentación y pausas persisten automáticamente
    state.programacion = _importParsed.map(function(programa){
      const opPrevia = state.programacion.find(p => p.linea === programa.linea && String(p.op) === String(programa.op));
      return { ...programa, iniciada: opPrevia ? opPrevia.iniciada : false, cerrada: opPrevia ? opPrevia.cerrada : false, fechaCierre: opPrevia ? opPrevia.fechaCierre : null, cerradaPor: opPrevia ? opPrevia.cerradaPor : null };
    });
    
    await guardarProgramacion(); 
    renderProgramacion(); 
    actualizarOpOptions(); 
    actualizarReadout(); 
    renderDashboard(); 
    cerrarImportModal();
    await modalExito('Programación cargada', `Se cargaron ${state.programacion.length} OP desde PLANTILLA. Los horarios y pausas configurados se mantienen vigentes.`);
  }catch(error){ await modalError('No se pudo guardar', String(error.message || error));
  }finally{ if (boton){ boton.disabled = false; boton.textContent = 'Sí, reemplazar'; } }
});

function exportarHistoricoXLSX(){
  if (!state.historico.length){ modalAlerta('Sin datos', 'Todavía no hay registros en el Histórico para exportar.'); return; }
  if (typeof XLSX === 'undefined'){ modalError('Excel no disponible', 'No se pudo cargar el motor de Excel. Verifica tu conexión e inténtalo de nuevo.'); return; }
  const registros = state.historico.slice().sort((a,b)=>a.ts.localeCompare(b.ts));
  const filas = registros.map(r=>({ 'Fecha': fechaTexto(r.fecha), 'Fecha Operativa': r.fechaOperativa ? fechaTexto(r.fechaOperativa) : '', 'Hora': r.hora, 'Línea': r.linea, 'OP': r.op, 'Acumulado Real': Math.round(r.acumulado), 'Usuario': r.usuario, 'Observación': r.observacion || '', 'Cantidad Hora': Math.round(r.cantidadHora), 'Estado Hora': r.estadoHora || '', 'Plan Acumulado': Math.round(r.planAcumulado), 'Diferencia': Math.round(r.diferencia), 'Cumplimiento': r.cumplimiento, 'Estado': r.estado, }));
  const ws = XLSX.utils.json_to_sheet(filas);
  const headers = Object.keys(filas[0]); const colCumplimiento = headers.indexOf('Cumplimiento');
  registros.forEach((r, i)=>{ const addr = XLSX.utils.encode_cell({ r: i+1, c: colCumplimiento }); if (ws[addr]) ws[addr].z = '0.0%'; });
  ws['!cols'] = [ {wch:11}, {wch:13}, {wch:9}, {wch:12}, {wch:14}, {wch:14}, {wch:12}, {wch:26}, {wch:12}, {wch:16}, {wch:13}, {wch:11}, {wch:13}, {wch:12} ];
  ws['!autofilter'] = { ref: ws['!ref'] }; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'PRODUCCION'); XLSX.writeFile(wb, `historico_produccion_${fechaISO(new Date())}.xlsx`);
}

let pesoDatosAnterior = "";
async function verificarActualizaciones() {
  try {
    const histRaw = await storageGet(STORAGE_KEY_HIST) || "[]"; const progRaw = await storageGet(STORAGE_KEY_PROG) || "[]"; const opsRaw  = await storageGet(STORAGE_KEY_HISTORIAL_OPS) || "[]";
    const pesoActual = histRaw.length + "-" + progRaw.length + "-" + opsRaw.length;
    if (pesoDatosAnterior === "") { pesoDatosAnterior = pesoActual; return; }
    if (pesoActual !== pesoDatosAnterior) { console.log("Nuevos datos detectados en BD. Actualizando pantalla..."); await inicializarEstado(); pesoDatosAnterior = pesoActual; renderTodo(); }
  } catch (error) { console.error("Error validando actualizaciones:", error); }
}

function calcularHoraFinTexto(horaInicioStr, minutosSumar) {
  if (!horaInicioStr || !horaInicioStr.includes(':')) return 'Sin programar';
  const [h, m] = horaInicioStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 'Sin programar';
  const totalMin = (h * 60 + m + minutosSumar) % (24 * 60);
  const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  return `${horaInicioStr} → ${hh}:${mm}`;
}

function renderHorariosAlim() {
  const tbody = document.getElementById('tbodyHorariosAlim'); if (!tbody) return;
  const filas = [
    { id: 'lv_t1', jornada: 'Lunes a Viernes', turno: 'Turno 1' }, { id: 'lv_t2', jornada: 'Lunes a Viernes', turno: 'Turno 2' }, { id: 'lv_t3', jornada: 'Domingo a Viernes', turno: 'Turno 3' }, 
    { id: 's_t1',  jornada: 'Sábados', turno: 'Turno 1' }, { id: 's_t2',  jornada: 'Sábados', turno: 'Turno 2' }, { id: 's_t3',  jornada: 'Sábados', turno: 'Turno 3' },
    { id: 'd_t1',  jornada: 'Domingos', turno: 'Turno 1' }, { id: 'd_t2',  jornada: 'Domingos', turno: 'Turno 2' }
  ];

  tbody.innerHTML = filas.map(f => {
    const valAlim = state.horariosAlim[`${f.id}_g1`] || '';
    const valPausa = state.horariosAlim[`${f.id}_pausa`] || '';
    
    // Un turno se considera "sin operación" o incompleto si ambos campos están vacíos
    const turnoInactivo = !valAlim && !valPausa;

    const sinAlim = !valAlim;
    const sinPausa = !valPausa;

    // Si tiene operación (tiene horas), el texto es opaco (var(--muted)). Si está vacío, se pone en amarillo neón.
    const estiloAlim = sinAlim ? 'color: #FFC800; font-weight: 700; text-shadow: 0 0 8px rgba(255, 200, 0, 0.4);' : 'color: var(--muted);';
    const textoAlim = sinAlim ? '⚠️ FALTA HORA ALIM.' : calcularHoraFinTexto(valAlim, 50);

    const estiloPausa = sinPausa ? 'color: #FFC800; font-weight: 700; text-shadow: 0 0 8px rgba(255, 200, 0, 0.4);' : 'color: var(--muted);';
    const textoPausa = sinPausa ? '⚠️ FALTA PAUSA' : calcularHoraFinTexto(valPausa, 10);

    const estiloFila = turnoInactivo ? 'background: rgba(255, 200, 0, 0.03);' : '';
    
    // El botón se pinta de amarillo neón SOLO si está inactivo. Si tiene horas, se muestra opaco (var(--muted)).
    const estiloBoton = turnoInactivo 
      ? 'color: #FFC800; border-color: #FFC800; text-shadow: 0 0 8px rgba(255, 200, 0, 0.4); font-weight: 700;' 
      : 'color: var(--muted); border-color: var(--border); font-weight: normal;';

    return `
      <tr style="${estiloFila}">
        <td class="strong">${f.jornada}</td>
        <td>${f.turno}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="time" id="alim_${f.id}_g1" value="${valAlim}" data-min="50" data-badge="badge_${f.id}_g1" style="padding:6px 10px; border:1px solid var(--border); border-radius:4px; font-family:var(--font-display); outline:none;">
            <span id="badge_${f.id}_g1" style="font-size:11px; ${estiloAlim}">${textoAlim}</span>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="time" id="alim_${f.id}_pausa" value="${valPausa}" data-min="10" data-badge="badge_${f.id}_pausa" style="padding:6px 10px; border:1px solid var(--border); border-radius:4px; font-family:var(--font-display); outline:none;">
            <span id="badge_${f.id}_pausa" style="font-size:11px; ${estiloPausa}">${textoPausa}</span>
          </div>
        </td>
        <td>
          <button type="button" class="btn btn-ghost btn-sm" onclick="marcarTurnoSinOperacion('${f.id}')" style="${estiloBoton}" title="Dejar este turno sin operación ni cálculos">∅ Sin Operación</button>
        </td>
      </tr>`;
  }).join('');

  // Validación interactiva en tiempo real al escribir en los inputs
  tbody.querySelectorAll('input[type="time"]').forEach(inp => {
    inp.addEventListener('input', () => {
      const badge = document.getElementById(inp.dataset.badge);
      const tr = inp.closest('tr');
      const btn = tr.querySelector('button');

      if (badge) {
        const minutos = Number(inp.dataset.min);
        if (inp.value) {
          badge.style.color = 'var(--muted)';
          badge.style.fontWeight = 'normal';
          badge.style.textShadow = 'none';
          badge.textContent = calcularHoraFinTexto(inp.value, minutos);
        } else {
          badge.style.color = '#FFC800';
          badge.style.fontWeight = '700';
          badge.style.textShadow = '0 0 8px rgba(255, 200, 0, 0.4)';
          badge.textContent = minutos === 50 ? '⚠️ FALTA HORA ALIM.' : '⚠️ FALTA PAUSA';
        }
      }

      // Si el usuario empieza a escribir horas, el botón pierde el amarillo neón y vuelve a ser opaco
      const inputA = tr.querySelector('[id$="_g1"]').value;
      const inputP = tr.querySelector('[id$="_pausa"]').value;
      if (inputA || inputP) {
        btn.style.color = 'var(--muted)';
        btn.style.borderColor = 'var(--border)';
        btn.style.textShadow = 'none';
        btn.style.fontWeight = 'normal';
        tr.style.background = 'transparent';
      }
    });
  });
}

window.marcarTurnoSinOperacion = function(idTurno) {
  const inputAlim = document.getElementById(`alim_${idTurno}_g1`);
  const inputPausa = document.getElementById(`alim_${idTurno}_pausa`);
  if (inputAlim) inputAlim.value = '';
  if (inputPausa) inputPausa.value = '';
  
  const badgeAlim = document.getElementById(`badge_${idTurno}_g1`);
  const badgePausa = document.getElementById(`badge_${idTurno}_pausa`);
  
  if (badgeAlim) {
    badgeAlim.textContent = '⚠️ FALTA HORA ALIM.';
    badgeAlim.style.color = '#FFC800';
    badgeAlim.style.fontWeight = '700';
    badgeAlim.style.textShadow = '0 0 8px rgba(255, 200, 0, 0.4)';
  }
  if (badgePausa) {
    badgePausa.textContent = '⚠️ FALTA PAUSA';
    badgePausa.style.color = '#FFC800';
    badgePausa.style.fontWeight.fontWeight = '700';
    badgePausa.style.textShadow = '0 0 8px rgba(255, 200, 0, 0.4)';
  }
  
  state.horariosAlim[`${idTurno}_g1`] = '';
  state.horariosAlim[`${idTurno}_pausa`] = '';

  // Pinta el botón de amarillo neón de forma inmediata al hacer clic en "Sin Operación"
  const filaBoton = event ? event.target.closest('tr') : null;
  if (filaBoton) {
    filaBoton.style.background = 'rgba(255, 200, 0, 0.03)';
    const btnOp = filaBoton.querySelector('button');
    if (btnOp) {
      btnOp.style.color = '#FFC800';
      btnOp.style.borderColor = '#FFC800';
      btnOp.style.textShadow = '0 0 8px rgba(255, 200, 0, 0.4)';
      btnOp.style.fontWeight = '700';
    }
  }
  
  modalAlerta('Turno sin operación', `Se ha marcado el ${idTurno.toUpperCase()} como inactivo. Haz clic en "Guardar Horarios" para consolidar el cambio.`);
};

window.marcarTurnoSinOperacion = function(idTurno) {
  const inputAlim = document.getElementById(`alim_${idTurno}_g1`);
  const inputPausa = document.getElementById(`alim_${idTurno}_pausa`);
  if (inputAlim) inputAlim.value = '';
  if (inputPausa) inputPausa.value = '';
  
  const badgeAlim = document.getElementById(`badge_${idTurno}_g1`);
  const badgePausa = document.getElementById(`badge_${idTurno}_pausa`);
  
  if (badgeAlim) {
    badgeAlim.textContent = '⚡ SIN OPERACIÓN';
    badgeAlim.style.color = '#FFC800';
    badgeAlim.style.fontWeight = '700';
    badgeAlim.style.textShadow = '0 0 8px rgba(255, 200, 0, 0.4)';
  }
  if (badgePausa) {
    badgePausa.textContent = '⚡ SIN OPERACIÓN';
    badgePausa.style.color = '#FFC800';
    badgePausa.style.fontWeight = '700';
    badgePausa.style.textShadow = '0 0 8px rgba(255, 200, 0, 0.4)';
  }
  
  state.horariosAlim[`${idTurno}_g1`] = '';
  state.horariosAlim[`${idTurno}_pausa`] = '';
  
  modalAlerta('Turno sin operación', `Se ha marcado el ${idTurno.toUpperCase()} como inactivo por completo. Haz clic en "Guardar Horarios" para aplicar los cambios.`);
};

document.getElementById('btnGuardarAlimentacion')?.addEventListener('click', async () => {
   const claveIngresada = prompt('Ingrese la clave de analista para modificar los horarios de alimentación y pausas activas:');
   if (claveIngresada === null) return;
   if (claveIngresada.trim() !== ANALISTA_PIN) { 
     await modalError('Acceso denegado', 'La clave de analista es incorrecta. No se guardaron los cambios.'); 
     return; 
   }
   
   const inputs = document.querySelectorAll('input[type="time"][id^="alim_"]');
   inputs.forEach(inp => { 
     const key = inp.id.replace('alim_', ''); 
     state.horariosAlim[key] = inp.value; 
   });
   await guardarHorariosAlim();
   // Actualiza absolutamente todo el sistema de forma global e instantánea
   renderTodo(); 
   
   await modalExito('Horarios Guardados', 'El sistema descontará automáticamente 50 minutos de alimentación y 10 minutos de pausas activas según los horarios establecidos por turno.');
});
async function init(){
  await cargarConfiguracion(); await inicializarEstado();            
  poblarSelectLineas(document.getElementById('fLinea'), true); poblarSelectLineas(document.getElementById('pLinea'), false);
  document.getElementById('fUsuario').value = state.usuario || '';
  renderTodo(); renderHorariosAlim(); 
  actualizarReloj(); setInterval(actualizarReloj, 1000); setInterval(verificarActualizaciones, 20000);
}
init();
// --- LÓGICA DE LA CALCULADORA DE CAJAS ---
document.getElementById('cajaActual').addEventListener('input', function() {
  const linea = document.getElementById('fLinea').value; 
  const op = document.getElementById('fOP').value.trim();
  const prog = buscarProgramacion(linea, op);
  
  if (prog && prog.undPorCaja > 0) {
    const cajaIngresada = Number(this.value);
    const ultimaCajaStr = document.getElementById('ultimaCaja').value;
    const ultimaCaja = ultimaCajaStr === '' ? 0 : Number(ultimaCajaStr);
    
    // Si el operario escribe un número mayor a la última caja, el sistema calcula solo
    if (cajaIngresada > ultimaCaja) {
      const cajasNuevas = cajaIngresada - ultimaCaja;
      const unidadesCalculadas = cajasNuevas * prog.undPorCaja;
      
      // Llenamos el campo bloqueado de unidades con el resultado matemático
      document.getElementById('fAcumulado').value = unidadesCalculadas;
    } else {
      // Si borra el número o pone una caja menor, vaciamos el cálculo
      document.getElementById('fAcumulado').value = '';
    }
  }
});
// --- LÓGICA DEL OJITO DE CONTRASEÑAS ---
document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', function() {
    const input = document.getElementById(this.getAttribute('data-target'));
    if (input.type === 'password') {
      input.type = 'text';
      this.textContent = '🙈'; // Cambia al icono del monito tapándose (ocultar)
    } else {
      input.type = 'password';
      this.textContent = '👁️'; // Cambia al icono del ojo (mostrar)
    }
  });
});
