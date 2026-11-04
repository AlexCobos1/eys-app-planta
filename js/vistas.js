/* vistas.js — EYS_APP */
function niceCeil(v){ if (v <= 10) return Math.max(4, Math.ceil(v)); const magnitude = Math.pow(10, Math.floor(Math.log10(v))); const norm = v / magnitude; const niceNorm = norm <= 1 ? 1 : (norm <= 2 ? 2 : (norm <= 5 ? 5 : 10)); return niceNorm * magnitude; }
function fmtCompact(v){ if (Math.abs(v) >= 1000) return (v/1000).toLocaleString('es-CO',{maximumFractionDigits:1}) + 'k'; return Math.round(v).toLocaleString('es-CO'); }

function renderChartHoras(horas){
  const container = document.getElementById('chartHoras');
  const w = Math.max(280, container.clientWidth || 460); const h = 230; const padL = 36, padR = 10, padT = 12, padB = 22; const innerW = w - padL - padR; const innerH = h - padT - padB;
  const maxVal = Math.max(1, ...horas.map(d=>Math.max(d.real, d.plan))); const niceMax = niceCeil(maxVal); const n = horas.length;
  const xFor = i => padL + (n<=1? 0 : innerW * i/(n-1)); const yFor = v => padT + innerH - (innerH * Math.min(v,niceMax)/niceMax);
  const pathFor = key => horas.map((d,i)=>(i===0?'M':'L')+xFor(i).toFixed(1)+' '+yFor(d[key]).toFixed(1)).join(' ');

  let gridLines = '';
  for(let s=0;s<=4;s++){ const v = niceMax*s/4; const y = yFor(v); gridLines += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w-padR}" y2="${y.toFixed(1)}" stroke="#E3DCF9" stroke-width="1"/><text x="${padL-6}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#9891C0" font-family="Inter,sans-serif">${fmtCompact(v)}</text>`; }
  let xLabels = ''; horas.forEach((d,i)=>{ if (i % 3 === 0 || i === n-1){ const hh = ((d.hora % 24) + 24) % 24; xLabels += `<text x="${xFor(i).toFixed(1)}" y="${h-6}" text-anchor="middle" font-size="9.5" fill="#9891C0" font-family="Inter,sans-serif">${String(hh).padStart(2,'0')}:00</text>`; } });
  const areaPath = `${pathFor('real')} L ${xFor(n-1).toFixed(1)} ${(padT+innerH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(padT+innerH).toFixed(1)} Z`;

  let dots = '';
  horas.forEach((d,i)=>{
    const hh = ((d.hora % 24) + 24) % 24;
    dots += `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(d.plan).toFixed(1)}" r="2.4" fill="#00E5FF"><title>${String(hh).padStart(2,'0')}:00 · Plan ${fmtInt(d.plan)} u.</title></circle>`;
    dots += `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(d.real).toFixed(1)}" r="2.6" fill="#FFC800"><title>${String(hh).padStart(2,'0')}:00 · Real ${fmtInt(d.real)} u.</title></circle>`;
  });

  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Producción real vs plan por hora">
    <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFC800" stop-opacity="0.25"/><stop offset="100%" stop-color="#FFC800" stop-opacity="0"/></linearGradient></defs>
    ${gridLines}<path d="${areaPath}" fill="url(#areaFill)" stroke="none"/><path d="${pathFor('plan')}" fill="none" stroke="#00E5FF" stroke-width="2.2" stroke-dasharray="5 4" stroke-linecap="round"/><path d="${pathFor('real')}" fill="none" stroke="#FFC800" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>${dots}${xLabels}
  </svg>`;
}

let _modalResolve = null;
const ICONS_MODAL = {
  warning: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l10 18H2L12 3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r=".9" fill="currentColor"/></svg>',
  error:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  success: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>',
};
function mostrarModal({icon='info', title, message, buttons}){ return new Promise(resolve=>{ _modalResolve = resolve; const overlay = document.getElementById('modalOverlay'); const iconEl = document.getElementById('modalIcon'); iconEl.className = 'modal-icon ' + icon; iconEl.innerHTML = ICONS_MODAL[icon] || ICONS_MODAL.info; document.getElementById('modalTitle').textContent = title; document.getElementById('modalMsg').textContent = message; const actions = document.getElementById('modalActions'); actions.innerHTML = ''; (buttons || [{label:'Entendido', value:true, primary:true}]).forEach(b=>{ const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-sm ' + (b.primary ? 'btn-primary' : 'btn-ghost'); btn.textContent = b.label; btn.onclick = ()=>{ cerrarModal(); resolve(b.value); }; actions.appendChild(btn); }); overlay.classList.add('show'); }); }
function cerrarModal(){ document.getElementById('modalOverlay').classList.remove('show'); }
function modalAlerta(title, message){ return mostrarModal({icon:'warning', title, message}); }
function modalError(title, message){ return mostrarModal({icon:'error', title, message}); }
function modalExito(title, message){ return mostrarModal({icon:'success', title, message, buttons:[{label:'Listo', value:true, primary:true}]}); }
function modalConfirmar(title, message){ return mostrarModal({icon:'warning', title, message, buttons:[ {label:'Cancelar', value:false, primary:false}, {label:'Sí, guardar', value:true, primary:true}, ]}); }
function pillHtml(estado){ const map = { 'NO CUMPLE':'atrasado', 'CUMPLE':'entiempo', 'SUPERA':'adelantado', 'SIN REGISTRO':'enriesgo' }; return `<span class="pill ${map[estado] || 'enriesgo'}">${estado}</span>`; }
function rowFlagClass(estado){ const map = { 'NO CUMPLE': 'row-flag-atrasado', 'CUMPLE': 'row-flag-entiempo', 'SUPERA': 'row-flag-adelantado', 'SIN REGISTRO': 'row-flag-enriesgo' }; return map[estado] || ''; }

function renderKPIs(d){
  const kpis = [
    { lbl:'Unidades producidas', val: fmtInt(d.unidadesProducidas), hint:'Hoy', accent:'var(--purple-400)' }, { lbl:'Plan del día', val: fmtInt(d.planDelDia), hint:'Unidades esperadas', accent:'var(--blue-400)' },
    { lbl:'Cumplimiento', val: fmtPct0(d.cumplimientoGlobal),hint:'Real / plan', accent:'var(--st-entiempo)' }, { lbl:'Registros', val: fmtInt(d.registros), hint:'Capturas de hoy', accent:'var(--blue-500)' },
    { lbl:'Líneas activas', val: fmtInt(d.lineasActivas), hint:`de ${LINEAS.length} líneas`, accent:'var(--purple-500)' }, {lbl:'NO CUMPLEN UPH', val: fmtInt(d.lineasNoCumplen), hint:'Líneas por debajo del objetivo hora', accent:'var(--st-atrasado)' }
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k=>`<div class="kpi-card" style="--accent:${k.accent}"><div class="lbl">${k.lbl}</div><div class="val num">${k.val}</div><div class="hint">${k.hint}</div></div>`).join('');
}

function renderTablaLineas(porLinea){
  const tbody = document.querySelector('#tablaLineas tbody');
  const lineasConPrograma = porLinea.filter(row => row.opActiva || row.opProgramada);
  if (!lineasConPrograma.length){ tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--muted-2); padding:24px;">No hay líneas con órdenes cargadas en el programa.</td></tr>'; return; }
  tbody.innerHTML = lineasConPrograma.map(row=>{
    const opCell = row.opActiva ? `<span class="strong">${row.opActiva}</span>` : (row.opProgramada ? `<span style="color:var(--muted-2); font-style:italic;">Programada: ${row.opProgramada}</span>` : '<span style="color:var(--muted-2);">—</span>');
    let inicioRealCell = '<span style="color:var(--muted-2);">—</span>';
    if (row.inicioReal) { const fechaHora = new Date(row.inicioReal); const horaFormateada = String(fechaHora.getHours()).padStart(2, '0') + ':' + String(fechaHora.getMinutes()).padStart(2, '0'); inicioRealCell = `<span style="color:var(--st-entiempo); font-weight:700;">${horaFormateada}</span>`; }
    return `<tr class="${rowFlagClass(row.estado)}"><td class="tag-line"><span class="sw"></span>${row.linea}</td><td>${opCell}</td><td>${inicioRealCell}</td><td class="num">${fmtInt(row.unidades)}</td><td class="num">${fmtInt(row.plan)}</td><td class="num" style="color:${row.diferencia<0?'var(--st-atrasado)':'var(--ink-soft)'}">${row.diferencia>=0?'+':''}${fmtInt(row.diferencia)}</td><td class="num">${fmtPct0(row.cumplimiento)}</td><td class="num">${fmtInt(row.uphPlan)}</td><td class="num">${fmtInt(row.uphReal)}</td><td>${pillHtml(row.estado)}</td></tr>`;
  }).join('');
}

function renderDashboard(){ const d = computeDashboard(); document.getElementById('dashFecha').textContent = fechaTexto(d.fecha); renderKPIs(d); renderTablaLineas(d.porLinea); renderChartHoras(d.horas); }
function poblarSelectLineas(selectEl, incluirVacio=true){ selectEl.innerHTML = (incluirVacio ? '<option value="">Seleccione…</option>' : '') + LINEAS.map(l=>`<option value="${l}">${l}</option>`).join(''); }
function actualizarOpOptions(){ const linea = document.getElementById('fLinea').value; const datalist = document.getElementById('opOptions'); const ops = state.programacion.filter(p => p.linea === linea && p.cerrada !== true); datalist.innerHTML = ops.map(p => `<option value="${p.op}">${p.producto || ''}</option>`).join(''); }

function renderMiniHistorico(linea, op){
  const tbody = document.querySelector('#tablaMiniHistorico tbody'); const regs = state.historico.filter(r=>r.linea===linea && String(r.op).trim()===op).sort((a,b)=>b.ts.localeCompare(a.ts)).slice(0,5);
  if (!regs.length){ tbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted-2); text-align:center; padding:16px;">Sin registros aún para esta OP.</td></tr>`; return; }
  tbody.innerHTML = regs.map(r=>`<tr><td>${r.hora}</td><td class="num">${fmtInt(r.acumulado)}</td><td class="num">${fmtInt(r.cantidadHora)}</td><td>${pillHtml(r.estado)}</td></tr>`).join('');
}

function actualizarReadout(){
  const linea = document.getElementById('fLinea').value; const op = document.getElementById('fOP').value.trim(); const prog = buscarProgramacion(linea, op); const set = (id,val)=>{ document.getElementById(id).textContent = val; };
  if (prog){
    const estadoEl = document.getElementById('estadoOpActual'); const contenedorIniciar = document.getElementById('contenedorIniciarOp');
    if (contenedorIniciar){ if (prog.cerrada === true || prog.iniciada === true){ contenedorIniciar.style.display = 'none'; } else{ contenedorIniciar.style.display = 'block'; } }
    if (estadoEl){
      if (prog.cerrada === true){ estadoEl.innerHTML = '🔴 OP CERRADA'; estadoEl.style.color = '#d32f2f'; }
      else if (prog.iniciada === true){ estadoEl.innerHTML = '🟢 OP EN PRODUCCIÓN'; estadoEl.style.color = '#388e3c'; }
      else{ estadoEl.innerHTML = '⚪ OP NO INICIADA'; estadoEl.style.color = '#777'; }
    }
    set('roProducto', prog.producto || '—'); set('roCantidad', fmtInt(prog.cantidad)); set('roUph', fmtInt(prog.uph) + ' u/h'); set('roObjetivoHora', fmtInt(prog.uph));
    const estadoHoraEl = document.getElementById('roEstadoHora');
    if (estadoHoraEl){
      const registrosOp = state.historico.filter(r => r.linea === linea && String(r.op).trim() === op).sort((a,b) => b.ts.localeCompare(a.ts)); const ultimoRegistro = registrosOp.length ? registrosOp[0] : null;
      if (ultimoRegistro && ultimoRegistro.estadoHora){
        if (ultimoRegistro.estadoHora === 'NO CUMPLE'){ estadoHoraEl.innerHTML = '❌ NO CUMPLE'; estadoHoraEl.style.color = '#d32f2f'; }
        else if (ultimoRegistro.estadoHora === 'CUMPLE'){ estadoHoraEl.innerHTML = '✅ CUMPLE'; estadoHoraEl.style.color = '#16a34a'; }
        else if (ultimoRegistro.estadoHora === 'SUPERA'){ estadoHoraEl.innerHTML = '🚀 SUPERA'; estadoHoraEl.style.color = '#2563eb'; }
        estadoHoraEl.style.fontWeight = '700'; estadoHoraEl.style.fontSize = '16px';
      } else{ estadoHoraEl.textContent = '⏳ PENDIENTE'; estadoHoraEl.style.color = '#777'; }
    }
    set('roInicio', horaDecimalATexto(prog.horaInicio)); set('roFin', horaDecimalATexto(prog.horaInicio + prog.duracion));
    
    // --- ACTUALIZADO: CAJAS SIEMPRE VISIBLES Y CARGA DE VALORES ---
    const undCaja = prog.undPorCaja || 0;
    document.getElementById('infoUnidadesCaja').textContent = undCaja > 0 ? `Unidades x caja: ${undCaja}` : `Unidades x caja: --`;
    const ultima = localStorage.getItem(`ultimaCaja_${op}`) || 0;
    document.getElementById('ultimaCaja').value = ultima;
    
  } else {
    document.getElementById('infoUnidadesCaja').textContent = `Unidades x caja: --`;
    document.getElementById('ultimaCaja').value = '0';
    const estadoEl = document.getElementById('estadoOpActual'); if (estadoEl){ estadoEl.innerHTML = '⚪ SIN OP SELECCIONADA'; estadoEl.style.color = '#777'; }
    const detalleEl = document.getElementById('detalleEstadoOp'); if (detalleEl){ detalleEl.innerHTML = ''; }
    const estadoHoraEl = document.getElementById('roEstadoHora'); if (estadoHoraEl){ estadoHoraEl.textContent = '—'; estadoHoraEl.style.color = '#777'; }
    set('roProducto','—'); set('roCantidad','—'); set('roUph','—'); set('roObjetivoHora','—'); set('roInicio','—'); set('roFin','—');
  }
  renderMiniHistorico(linea, op);
}

async function manejarSubmitControl(e){
  e.preventDefault(); ['errLinea','errOP','errAcumulado'].forEach(id=>document.getElementById(id).textContent='');
  const payload = { linea: document.getElementById('fLinea').value, op: document.getElementById('fOP').value, acumuladoStr: document.getElementById('fAcumulado').value, usuario: document.getElementById('fUsuario').value, observacion: document.getElementById('fObservacion').value };
  let res = registrarProduccion(payload);
  if (res.ok === 'confirm'){ const confirmado = await modalConfirmar(res.title, res.message); if (!confirmado) return; res = registrarProduccion({...payload, forzarSobreproduccion:true}); }
  if (res.ok === false){
    if (res.title === 'Dato obligatorio' && res.message.indexOf('línea') !== -1) document.getElementById('errLinea').textContent = res.message;
    else if (res.title === 'Dato obligatorio') document.getElementById('errOP').textContent = res.message;
    else if (res.title === 'Dato incorrecto') document.getElementById('errAcumulado').textContent = res.message;
    else if (res.title === 'OP no válida') document.getElementById('errOP').textContent = 'OP no válida para esta línea.';
    if (res.icon === 'error') await modalError(res.title, res.message); else await modalAlerta(res.title, res.message);
    return;
  }
  state.usuario = payload.usuario; guardarUsuario(); 
  document.getElementById('fAcumulado').value = ''; 
  document.getElementById('fObservacion').value = '';
  // --- NUEVO: ACTUALIZAR "ÚLTIMA CAJA" DESPUÉS DE GRABAR ---
  const cajaIngresada = document.getElementById('cajaActual').value;
  if (cajaIngresada) {
    localStorage.setItem(`ultimaCaja_${payload.op}`, cajaIngresada);
    document.getElementById('ultimaCaja').value = cajaIngresada;
    document.getElementById('cajaActual').value = ''; // Limpiamos para el próximo registro
  }
  renderDashboard(); renderHistorico(); actualizarReadout();
  await modalExito('Producción registrada', `Registro guardado correctamente.\nCantidad de la hora: ${fmtInt(res.cantidadHora)}\nCumplimiento: ${fmtPct1(res.cumplimiento)}`);
}

async function cerrarOpActual(){
  const linea = document.getElementById('fLinea').value; const op = document.getElementById('fOP').value.trim();
  if (!linea || !op){ await modalAlerta('Seleccione una OP', 'Debe seleccionar una línea y una OP antes de cerrarla.'); return; }
  const prog = buscarProgramacion(linea, op);
  if (!prog){ await modalError('OP no encontrada', 'La OP seleccionada ya no existe en Programación.'); return; }
  if (prog.cerrada === true){ await modalAlerta('OP ya cerrada', `La OP ${op} ya se encuentra cerrada.`); return; }
  if (prog.iniciada !== true){ await modalAlerta('OP no iniciada', `La OP ${op} no se puede cerrar porque nunca fue iniciada.`); return; }
  const ok = await modalConfirmar('Cerrar OP', `¿Desea cerrar la OP ${op}?\n\nUna vez cerrada no permitirá nuevos registros de producción.`);
  if (!ok){ return; }
  prog.cerrada = true; prog.fechaCierre = new Date().toISOString(); prog.cerradaPor = state.usuario || 'Auxiliar';
  const tramoAbierto = state.historialOps.find(function(item){ return (item.linea.trim().toUpperCase() === prog.linea.trim().toUpperCase() && String(item.op).trim() === String(prog.op).trim() && item.finReal === null); });
  if (tramoAbierto){ tramoAbierto.finReal = new Date().toISOString(); guardarHistorialOps(); }
  await guardarProgramacion(); actualizarOpOptions(); document.getElementById('fOP').value = ''; actualizarReadout();
  await modalExito('OP cerrada', `La OP ${op} fue cerrada correctamente.`);
}

function renderHistorico(){
  const tbody = document.querySelector('#tablaHistorico tbody'); const q = (document.getElementById('buscarHistorico').value || '').trim().toLowerCase();
  let regs = state.historico.slice().sort((a,b)=>b.ts.localeCompare(a.ts));
  if (q){ regs = regs.filter(r => [r.linea, r.op, r.usuario, r.estado, r.observacion].join(' ').toLowerCase().includes(q)); }
  if (!regs.length){ tbody.innerHTML = `<tr><td colspan="13"><div class="empty-state"><b>Sin registros</b>Aún no hay capturas que coincidan con la búsqueda.</div></td></tr>`; return; }
  tbody.innerHTML = regs.map(r=>`<tr class="${rowFlagClass(r.estado)}"><td>${fechaTexto(r.fecha)}</td><td>${r.fechaOperativa ? fechaTexto(r.fechaOperativa) : '-'}</td><td>${r.hora}</td><td class="strong">${r.linea}</td><td>${r.op}</td><td class="num">${fmtInt(r.acumulado)}</td><td>${r.usuario}</td><td>${r.observacion || ''}</td><td class="num">${fmtInt(r.cantidadHora)}</td><td>${r.estadoHora === 'NO CUMPLE' ? '<span style="color:#d32f2f;font-weight:700;">❌ NO CUMPLE</span>' : (r.estadoHora === 'CUMPLE' ? '<span style="color:#16a34a;font-weight:700;">✅ CUMPLE</span>' : (r.estadoHora === 'SUPERA' ? '<span style="color:#2563eb;font-weight:700;">🚀 SUPERA</span>' : '-'))}</td><td class="num">${fmtInt(r.planAcumulado)}</td><td class="num" style="color:${r.diferencia<0?'var(--st-atrasado)':'var(--ink-soft)'}">${r.diferencia>=0?'+':''}${fmtInt(r.diferencia)}</td><td class="num">${fmtPct1(r.cumplimiento)}</td><td>${pillHtml(r.estado)}</td></tr>`).join('');
}

async function confirmarResetDemo(){
  const claveIngresada = prompt('Introduce la clave de analista para borrar el Histórico y la Programación:'); if (claveIngresada === null) return;
  if (claveIngresada.trim() !== ANALISTA_PIN){ await modalError('Clave incorrecta', 'La clave ingresada no es válida. No se eliminó ningún dato.'); return; }
  const ok = await modalConfirmar('Reiniciar todos los datos', 'Esta acción eliminará definitivamente:\n\n• Todos los registros del Histórico.\n• Todas las OP de Programación.\n• Los tiempos reales de inicio y cortes.\n\n¿Deseas continuar?');
  if (!ok) return;
  try {
    state.historico = []; state.programacion = []; state.historialOps = []; state.cortesTurno = []; state.totalUnidadesTeoricas = 0;
    try { window.localStorage.removeItem(STORAGE_KEY_HIST); window.localStorage.removeItem(STORAGE_KEY_PROG); window.localStorage.removeItem(STORAGE_KEY_HISTORIAL_OPS); window.localStorage.removeItem(STORAGE_KEY_CORTES); window.localStorage.removeItem(STORAGE_KEY_TOTAL_TEORICO); } catch(e) {}
    await Promise.all([ guardarHistorico(), guardarProgramacion(), guardarHistorialOps(), guardarCortesTurno(), guardarTotalTeorico() ]);
    const buscador = document.getElementById('buscarHistorico'); if (buscador) buscador.value = '';
    const formControl = document.getElementById('formControl'); if (formControl) formControl.reset();
    const formProgramacion = document.getElementById('formProgramacion'); if (formProgramacion) formProgramacion.reset();
    const duracion = document.getElementById('pDuracion'); if (duracion) duracion.value = 8;
    renderTodo(); await modalExito('Sistema reiniciado (Hard Reset)', 'El Histórico, los tiempos y la Programación se eliminaron de raíz.\n\nEl sistema está limpio y listo para empezar.');
  } catch (error) { console.error('Error al reiniciar los datos:', error); await modalError('No se pudo reiniciar', 'Ocurrió un error al limpiar la base de datos.'); }
}

function renderProgramacion(){
  const tbody = document.querySelector('#tablaProgramacion tbody');
  if (!state.programacion.length){ tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><b>Sin OP programadas</b>Agrega una OP para habilitar Control Operador.</div></td></tr>`; return; }
  tbody.innerHTML = state.programacion.map((p,idx)=>`<tr><td>${p.turno || turnoDe(p.horaInicio)}</td><td class="strong">${p.linea}</td><td>${p.op}</td><td>${p.producto || ''}</td><td class="num">${fmtInt(p.cantidad)}</td><td class="num">${fmtInt(p.uph)}</td><td>${horaDecimalATexto(p.horaInicio)}</td><td>${horaDecimalATexto(p.horaInicio + p.duracion)}</td><td>${p.cerrada ? `<span style="color:#d32f2f;font-weight:700;cursor:pointer;text-decoration:underline;" title="Reabrir OP" data-reopen="${idx}">🔴 CERRADA</span>` : `<span style="color:#388e3c;font-weight:700;">🟢 ABIERTA</span>`}<button type="button" class="btn btn-ghost btn-sm" data-del="${idx}" title="Eliminar OP">✕</button></td></tr>`).join('');
  tbody.querySelectorAll('[data-reopen]').forEach(btn=>{ btn.addEventListener('click', async ()=>{ const idx = parseInt(btn.getAttribute('data-reopen'), 10); const p = state.programacion[idx]; const clave = prompt('Ingrese la clave de Analista para reabrir la OP'); if (clave === null){ return; } if (clave.trim() !== ANALISTA_PIN){ await modalError('Acceso denegado', 'La clave de Analista es incorrecta.'); return; } const ok = await modalConfirmar('Reabrir OP', `¿Desea reabrir la OP ${p.op}?`); if (!ok){ return; } p.cerrada = false; p.fechaCierre = null; p.cerradaPor = null; await guardarProgramacion(); renderProgramacion(); actualizarOpOptions(); await modalExito('OP reabierta', `La OP ${p.op} fue reabierta correctamente.`); }); });
  tbody.querySelectorAll('[data-del]').forEach(btn=>{ btn.addEventListener('click', async ()=>{ const idx = parseInt(btn.getAttribute('data-del'),10); const p = state.programacion[idx]; const ok = await modalConfirmar('Eliminar OP', `¿Eliminar la OP ${p.op} de ${p.linea} de Programación?`); if (!ok) return; state.programacion.splice(idx,1); guardarProgramacion(); renderProgramacion(); actualizarOpOptions(); }); });
}

async function manejarSubmitProgramacion(e){
  e.preventDefault();
  const claveIngresada = prompt('Ingrese la clave de analista para agregar una OP'); if (claveIngresada === null){ return; }
  if (claveIngresada.trim() !== ANALISTA_PIN){ await modalError('Acceso denegado', 'La clave de analista es incorrecta.'); return; }
  const linea = document.getElementById('pLinea').value; const op = document.getElementById('pOP').value.trim(); const producto = document.getElementById('pProducto').value.trim(); const cantidad = Number(document.getElementById('pCantidad').value); const uph = Number(document.getElementById('pUph').value); const horaInicio = Number(document.getElementById('pInicio').value); const duracion = Number(document.getElementById('pDuracion').value) || 8;
  if (!linea || !op || Number.isNaN(cantidad) || Number.isNaN(uph) || Number.isNaN(horaInicio)){ await modalAlerta('Dato obligatorio', 'Completa línea, OP, cantidad, UPH y hora de inicio.'); return; }
  if (buscarProgramacion(linea, op)){ await modalError('OP duplicada', `Ya existe la OP ${op} para la línea ${linea}.`); return; }
  state.programacion.push({ turno: turnoDe(horaInicio), linea, op, codigo: '', producto, uph, horaInicio, duracion, cantidad, cerrada: false, fechaInicioReal: null, fechaCierre: null, cerradaPor: null });
  guardarProgramacion(); e.target.reset(); document.getElementById('pDuracion').value = 8; renderProgramacion(); actualizarOpOptions(); await modalExito('OP agregada', `Se agregó la OP ${op} a la línea ${linea}.`);
}

function actualizarReloj(){ const now = new Date(); document.getElementById('clockTime').textContent = horaTexto(now); document.getElementById('clockDate').textContent = now.toLocaleDateString('es-CO', {weekday:'long', day:'2-digit', month:'long'}); }

function renderHistorialCortes(){
  const tbody = document.querySelector('#tablaCortes tbody'); if (!tbody){ return; }
  if (!state.cortesTurno.length){ tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><b>Sin cortes registrados</b>Ejecute un CORTE DEL TURNO para generar registros.</div></td></tr>`; return; }
  const cortes = state.cortesTurno.slice().reverse();
  tbody.innerHTML = cortes.map(function(corte){ return `<tr><td>${corte.id}</td><td>${fechaTexto(corte.fecha)}</td><td>${corte.hora}</td><td>${corte.turno}</td><td class="num">${fmtInt(corte.totalProgramado)}</td><td class="num">${fmtInt(corte.totalReal)}</td><td class="num">${fmtPct0(corte.cumplimientoGlobal)}</td><td><button class="btn btn-sm btn-ghost" data-corte="${corte.id}">👁 VER</button><button class="btn btn-sm btn-ghost" data-del-corte="${corte.id}" style="color:#d32f2f;margin-left:6px;">🗑</button></td></tr>`; }).join('');
  tbody.querySelectorAll('[data-corte]').forEach(function(btn){ btn.addEventListener('click', function(){ const id = btn.getAttribute('data-corte'); const corte = state.cortesTurno.find(x => x.id === id); mostrarDetalleCorte(corte); }); });
  tbody.querySelectorAll('[data-del-corte]').forEach(function(btn){ btn.addEventListener('click', async function(){ const id = btn.getAttribute('data-del-corte'); const ok = await modalConfirmar('Eliminar Corte', `¿Estás seguro de que deseas eliminar el registro de ${id}? Esta acción no se puede deshacer.`); if (!ok) return; const index = state.cortesTurno.findIndex(x => x.id === id); if (index !== -1) { state.cortesTurno.splice(index, 1); await guardarCortesTurno(); renderHistorialCortes(); await modalExito('Corte eliminado', `El ${id} ha sido borrado del historial.`); } }); });
}

async function mostrarDetalleCorte(corte) {
  const horaCorta = corte.hora ? corte.hora.substring(0, 5) : '--:--';
  const lineasActivas = corte.detalle.filter(item => item.programado > 0 || item.real > 0);
  let tablaHTML = `<div style="display:flex; justify-content:space-between; margin-bottom: 12px; font-size: 13px; color: var(--ink-soft); flex-wrap: wrap; gap: 8px;"><span><b>Turno:</b> ${corte.turno}</span><span><b>Fecha:</b> ${fechaTexto(corte.fecha)}</span><span><b>Hora:</b> ${corte.hora}</span></div><div class="table-scroll" style="border: 1px solid var(--border); border-radius: var(--radius-sm); max-height: 50vh; overflow-y: auto;"><table class="data-table" style="width: 100%; min-width: auto; text-align: right; margin: 0; font-size: 12px;"><thead style="background: var(--surface-2); position: sticky; top: 0; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.04);"><tr><th style="text-align: left; padding-right: 4px;">LÍNEA</th><th style="text-align: right; padding-left: 4px;">PROG.</th><th style="text-align: right;">UPH</th><th style="text-align: right;">REAL A LAS ${horaCorta}</th><th style="text-align: right;">CUMP.</th></tr></thead><tbody>`;
  if (lineasActivas.length > 0) { lineasActivas.forEach(item => { const colorCumplimiento = item.cumplimiento >= 0.95 ? 'var(--st-entiempo)' : 'var(--st-atrasado)'; tablaHTML += `<tr><td style="text-align: left; font-weight: 700; color: var(--ink);">${item.linea}</td><td>${fmtInt(item.programado)}</td><td>${fmtInt(item.uph)}</td><td>${fmtInt(item.real)}</td><td style="font-weight: 700; color: ${colorCumplimiento};">${fmtPct0(item.cumplimiento)}</td></tr>`; }); } else { tablaHTML += `<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 20px;">No hay líneas activas en este turno.</td></tr>`; }
  tablaHTML += `</tbody><tfoot style="background: var(--purple-50); position: sticky; bottom: 0; z-index: 2; box-shadow: 0 -2px 6px rgba(0,0,0,0.06);"><tr><td style="text-align: left; font-weight: 700; color: var(--ink); padding: 10px 12px;">TOTAL</td><td style="font-weight: 700; padding: 10px 12px;">${fmtInt(corte.totalProgramado)}</td><td style="padding: 10px 12px;">-</td><td style="font-weight: 700; padding: 10px 12px;">${fmtInt(corte.totalReal)}</td><td style="font-weight: 800; font-size: 13.5px; color: var(--ink); padding: 10px 12px;">${fmtPct0(corte.cumplimientoGlobal)}</td></tr></tfoot></table></div>`;
  const modalBox = document.getElementById('modalBox'); const widthOriginal = modalBox.style.maxWidth; modalBox.style.maxWidth = '760px'; modalBox.style.width = '95%'; 
  const promesaModal = mostrarModal({ icon: 'info', title: 'Reporte de Producción: ' + corte.id, message: '', buttons: [{ label: 'Cerrar reporte', value: true, primary: true }] });
  document.getElementById('modalMsg').innerHTML = tablaHTML;
  await promesaModal; modalBox.style.maxWidth = widthOriginal; modalBox.style.width = '100%'; document.getElementById('modalMsg').innerHTML = ''; 
}

function renderTodo(){ renderDashboard(); actualizarOpOptions(); actualizarReadout(); renderHistorico(); renderProgramacion(); renderHistorialCortes(); }
