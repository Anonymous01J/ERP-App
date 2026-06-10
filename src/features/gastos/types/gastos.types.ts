export type CategoriaGasto = 'gasolina' | 'peaje' | 'viaticos' | 'mantenimiento' | 'operativos' | 'otros' | 'nomina';
export type GastoMoneda = 'VES' | 'USD';

export interface GastoGeneral {
  id: number | string;
  descripcion: string;
  monto: number;
  moneda: GastoMoneda;
  categoria: CategoriaGasto;
  fecha: string;
  id_viaje?: number | string; // Opcional: Link a un viaje si corresponde
}
