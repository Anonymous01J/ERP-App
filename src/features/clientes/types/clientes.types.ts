import { StatusType } from '@components/ui/StatusBarBadge';

export type HistorialClienteTipo = 'cargo' | 'abono';

export interface HistorialCliente {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: HistorialClienteTipo;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  deuda: number; // Balance in USD
  estado: StatusType; // 'credito', 'por_vencer', 'atrasado'
  historial: HistorialCliente[];
  direccion?: string;
  limiteCredito?: number;
  diasCredito?: number; // Usually 30 days based on business rules
}
