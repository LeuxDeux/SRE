// Utilidades de reservas (frontend)

// Una reserva está "vencida" si sigue pendiente y su fecha ya pasó.
export const esReservaVencida = (reserva) => {
  if (!reserva || reserva.estado !== 'pendiente') return false;
  const fin = String(reserva.fecha_fin || reserva.fecha_inicio || '').slice(0, 10);
  if (!fin) return false;
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return fin < hoyStr;
};
