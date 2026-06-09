export type EstadoFisico = 'pendiente' | 'en_produccion' | 'listo' | 'entregado';
export type EstadoFinanciero = 'credito' | 'por_vencer' | 'atrasado' | 'pagado' | null;

export interface PedidoItem {
  id?: string; // Optional since it might be generated at creation
  papel: string;
  presentacion: string;
  cantidad: number;
}

export interface Pedido {
  id: string;
  cliente: string;
  estadoFisico: EstadoFisico;
  estadoFinanciero: EstadoFinanciero;
  fechaVencimiento?: string;
  deuda: number;
  abonado: number;
  items: PedidoItem[];
}
