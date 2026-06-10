export type BobinaStatus = 'activa' | 'agotada';

export interface Bobina {
  id: string;
  codigo?: string; // e.g. BOB-045
  tipo: string; // e.g. Papel A, Papel B, Kraft
  kg: number; // Current available kg
  pesoOriginal?: number; // Starting kg
  status: BobinaStatus;
  fechaIngreso?: string;
  fechaInicio?: string;
  fechaAgotada?: string;
}

export interface ProductoTerminado {
  id?: string;
  presentacion: '600g' | '1kg' | '2.5kg' | '5kg' | string;
  pesoNominal?: number;
  pesoReal?: number;
  rollos: number; // loose rolls
  paquetes: number; // full packages
  porPaquete: number; // units per package
}

export interface HistorialBobina extends Bobina {
  produccion: {
    presentacion: string;
    cantidad: number;
  }[];
  merma: number; // kg
  pesoMuerto: number; // core weight
}

export interface Pote {
  id?: string;
  capacidad: string;
  stockActual: number;
  precioVentaUsd: number;
  precioCompraUsd?: number;
}
