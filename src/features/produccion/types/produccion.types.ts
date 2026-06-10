export interface ResultadoProduccion {
  presentacion: string;
  cantidad: number;
}

export interface LoteProduccion {
  id: string;
  fecha: string;
  operario: string;
  bobinaOrigen: string; // e.g. BOB-046 (Papel A)
  bobinaId?: string; // Reference to the Bobina entity
  resultado: ResultadoProduccion[];
  observaciones?: string;
  pedidosVinculados?: string[]; // IDs of orders fulfilled
}

export interface RegistrarProduccionForm {
  bobinaId: string | null;
  rollos600g: number;
  rollos1kg: number;
  rollos2kg: number;
  rollos5kg: number;
  vincularPedido: boolean;
  pedidosSeleccionados: string[];
}
