// backend/utils/aprobaciones.js
// Reglas de quién puede aprobar qué, según la secretaría.
// - La secretaría propia siempre aprueba lo suyo.
// - Cruces: tabla secretarias_aprobadoras (secretaria_id aprueba lo de aprueba_para_secretaria_id).
// - Global: secretarias.aprueba_todo = 1 (ej. Decanato) aprueba todo.
// Si la migración todavía no fue aplicada, cae a "solo el área propia" sin romper.

const db = require('../config/database');

const obtenerReglasAprobacion = async () => {
  const apruebaTodo = new Set();
  const cruces = new Map(); // areaId -> Set(aprobadorId)

  try {
    const [secretarias] = await db.query('SELECT id, aprueba_todo FROM secretarias');
    for (const s of secretarias) {
      if (Number(s.aprueba_todo) === 1) apruebaTodo.add(Number(s.id));
    }
  } catch (error) {
    // Columna aprueba_todo aún no migrada: se ignora (solo área propia)
  }

  try {
    const [registros] = await db.query(
      'SELECT secretaria_id, aprueba_para_secretaria_id FROM secretarias_aprobadoras',
    );
    for (const r of registros) {
      const area = Number(r.aprueba_para_secretaria_id);
      if (!cruces.has(area)) cruces.set(area, new Set());
      cruces.get(area).add(Number(r.secretaria_id));
    }
  } catch (error) {
    // Tabla secretarias_aprobadoras aún no migrada: se ignora
  }

  return { apruebaTodo, cruces };
};

// ¿El usuario con `secretariaId` puede aprobar un ítem del área `areaResponsableId`?
const puedeAprobarArea = (secretariaId, areaResponsableId, reglas) => {
  const aprobador = Number(secretariaId);
  const area = Number(areaResponsableId);
  if (!aprobador || !area) return false;
  if (reglas.apruebaTodo.has(aprobador)) return true;
  if (aprobador === area) return true;
  return reglas.cruces.get(area)?.has(aprobador) || false;
};

// Áreas cuyos ítems ve/puede aprobar el usuario.
// Devuelve un array de ids, o `null` si ve TODAS (secretaría con aprueba_todo).
const areasVisibles = (secretariaId, reglas) => {
  const aprobador = Number(secretariaId);
  if (!aprobador) return [];
  if (reglas.apruebaTodo.has(aprobador)) return null;
  const areas = new Set([aprobador]);
  for (const [area, aprobadores] of reglas.cruces.entries()) {
    if (aprobadores.has(aprobador)) areas.add(area);
  }
  return [...areas];
};

module.exports = { obtenerReglasAprobacion, puedeAprobarArea, areasVisibles };
