export interface Cliente {
  id: string;
  razon_social: string;
  telefono: string | null;
  limite_credito: number;
  saldo_a_favor_usd: number;
  estado: 'activo' | 'inactivo';
}

export interface InventarioPote {
  id: string;
  capacidad: string;
  stock_unidades: number;
  precio_compra_usd: number;
  precio_venta_usd: number;
  estado: 'activo' | 'inactivo';
}

export interface ProductoPresentacion {
  id: string;
  nombre: string;
  peso_nominal_g: number;
  peso_real_g: number;
  rollos_por_paquete: number;
  stock_unidades_sueltas: number;
  precio_USD: number;
  tiempo_x_paquete_min: number | null;
  estado: 'activo' | 'inactivo';
}

export interface TipoPapel {
  id: string;
  nombre: string;
  estado: 'activo' | 'inactivo';
}

export interface Proveedor {
  id: string;
  nombre_empresa: string;
  telefono: string | null;
  direccion: string | null;
  notas: string | null;
  estado: 'activo' | 'inactivo';
}

export interface Viaje {
  id: string;
  tipo_viaje: 'compra' | 'entrega' | 'mixto';
  id_proveedor: string | null;
  notas: string | null;
  fecha_viaje_inicio: string;
  fecha_viaje_llegada_destino: string | null;
  fecha_viaje_retorno: string | null;
  fecha_viaje_llegada_base: string | null;
  estado: 'en_progreso' | 'en_destino' | 'retornando' | 'completado';
}

export interface Pedido {
  id: string;
  id_cliente: string;
  fecha_creacion: string;
  fecha_entrega_estimada: string;
  fecha_entrega: string | null;
  estado: 'pendiente' | 'en_produccion' | 'listo' | 'entregado' | 'cancelado';
  estado_pago: 'pendiente' | 'pagado';
  fecha_vencimiento_credito: string | null;
  monto_total: number;
  tasa_cambio_creacion: number | null;
}

export interface AbonoPago {
  id: string;
  id_pedido: string;
  monto: number;
  monto_equivalente_usd: number;
  moneda: 'VES' | 'USD';
  tasa_cambio: number;
  fecha_pago: string;
  tipo_pago: 'adelanto' | 'abono';
}

export interface BobinaGrande {
  id: string;
  id_viaje_compra: string;
  peso_inicial_kg: number;
  id_tipo_papel: string | null;
  peso_actual_kg: number | null;
  peso_muerto_kg: number | null;
  merma_core_kg: number | null;
  costo_bobina: number;
  fecha_llegada: string | null;
  fecha_uso: string | null;
  fecha_gasto: string | null;
  estado: 'disponible' | 'en_uso' | 'agotada';
}

export interface ProduccionDiaria {
  id: string;
  id_producto: string;
  id_pedido_destino: string | null;
  fecha: string;
  cantidad_rollos_total: number;
}

export interface ConsumoBobina {
  id: string;
  id_produccion: string;
  id_bobina: string;
  kg_consumidos: number;
}

export interface DetallePedido {
  id: string;
  id_pedido: string;
  id_producto: string | null;
  id_pote: string | null;
  cantidad_solicitada: number;
  cantidad_producida: number | null;
  precio_unitario: number;
}

export interface EntregaViaje {
  id: string;
  id_viaje: string;
  id_pedido: string;
  nota_entrega_numero: string | null;
  hora_llegada: string | null;
  estado: 'pendiente' | 'entregado';
  orden: number;
}

export interface Movimiento {
  id: string;
  descripcion: string;
  monto: number;
  moneda: 'VES' | 'USD';
  tasa_cambio: number;
  categoria: 'gasolina' | 'peaje' | 'viaticos' | 'mantenimiento' | 'operativos' | 'otros' | 'nomina';
  fecha: string;
  id_viaje: string | null;
  tipo: 'ingreso' | 'egreso' | null;
}
