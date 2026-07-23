export type EstadoFisico = 'pendiente' | 'en_produccion' | 'listo' | 'entregado' | 'cancelado';
export type EstadoPago = 'pendiente' | 'pagado';

// Forma que viene de PowerSync (snake_case)
export interface PedidoDB {
  id: string;
  id_cliente: string;
  fecha_creacion: string;
  fecha_entrega_estimada: string;
  fecha_entrega: string | null;
  estado: EstadoFisico;
  estado_pago: EstadoPago;
  fecha_vencimiento_credito: string | null;
  monto_total: number;
  tasa_cambio_creacion: number;
  // JOIN fields (added via query alias)
  razon_social?: string;
}

export interface DetallePedidoDB {
  id: string;
  id_pedido: string;
  id_producto: string | null;
  id_pote: string | null;
  id_tipo_papel: string | null;
  cantidad_solicitada: number;
  cantidad_producida: number | null;
  precio_unitario: number;
  // JOIN fields
  nombre_producto?: string;
  capacidad_pote?: string;
  nombre_tipo_papel?: string;
}

// Forma para el formulario interno de NuevoPedidoScreen
export interface ItemFormulario {
  key: string; // uuid local para el key de la lista
  tipo: 'papel' | 'pote';
  id_referencia: string; // id del producto_presentacion o inventario_pote
  id_tipo_papel: string | null; // solo aplica cuando tipo === 'papel'
  nombre_display: string; // texto a mostrar
  cantidad: number;
  precio_unitario: number;
}
