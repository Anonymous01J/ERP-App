export type ViajeTipo = 'compra' | 'entrega';
export type ViajeEstado = 'en_progreso' | 'en_destino' | 'retornando' | 'completado';

export interface Viaje {
  id: number | string;
  tipo: ViajeTipo;
  origen?: string; // For purchases
  destino?: string; // For deliveries
  estado: ViajeEstado;
  fecha_viaje_inicio: string;
  fecha_viaje_llegada_destino: string;
  fecha_viaje_retorno: string;
  fecha_viaje_llegada_base: string;
  pedidosVinculados?: (number | string)[]; // IDs of orders in this trip
  notas?: string;
}
export type GastoMoneda = 'VES' | 'USD';
export type GastoTipo = 'ingreso' | 'egreso';

export interface GastoViaje {
  id: string;
  viajeId: string;
  descripcion: string;
  monto: number;
  moneda: GastoMoneda;
  tipo: GastoTipo;
  fecha: string;
}
