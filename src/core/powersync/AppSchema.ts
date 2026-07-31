import { column, Schema, Table } from '@powersync/react-native';

const perfiles = new Table({
  nombre: column.text,
  rol: column.text,
  activo: column.integer,
});

const rol_permisos = new Table({
  rol: column.text,
  modulo: column.text,
  habilitado: column.integer,
});

const configuracion = new Table({
  clave: column.text,
  valor: column.text,
});

const clientes = new Table({
  cedula: column.text,
  rif: column.text,
  razon_social: column.text,
  telefono: column.text,
  limite_credito: column.real,
  saldo_a_favor_usd: column.real,
  estado: column.text
});

const inventario_potes = new Table({
  capacidad: column.text,
  stock_unidades: column.integer,
  precio_compra_usd: column.real,
  precio_venta_usd: column.real,
  estado: column.text
});

const productos_presentacion = new Table({
  nombre: column.text,
  peso_nominal_g: column.integer,
  peso_real_g: column.integer,
  rollos_por_paquete: column.integer,
  stock_unidades_sueltas: column.integer,
  precio_USD: column.real,
  tiempo_x_paquete_min: column.real,
  estado: column.text
});

const tipos_papel = new Table({
  nombre: column.text,
  estado: column.text
});

const proveedores = new Table({
  cedula: column.text,
  rif: column.text,
  encargado: column.text,
  nombre_empresa: column.text,
  telefono: column.text,
  direccion: column.text,
  notas: column.text,
  estado: column.text
});

const viajes = new Table({
  tipo_viaje: column.text,
  id_proveedor: column.text,
  notas: column.text,
  fecha_viaje_inicio: column.text,
  fecha_viaje_llegada_destino: column.text,
  fecha_viaje_retorno: column.text,
  fecha_viaje_llegada_base: column.text,
  estado: column.text
});

const pedidos = new Table({
  id_cliente: column.text,
  fecha_creacion: column.text,
  fecha_entrega_estimada: column.text,
  fecha_entrega: column.text,
  estado: column.text,
  estado_pago: column.text,
  fecha_vencimiento_credito: column.text,
  monto_total: column.real,
  tasa_cambio_creacion: column.real,
  nota_entrega_numero: column.integer,
  tasa_cambio_pago: column.real
});

const abonos_pagos = new Table({
  id_pedido: column.text,
  monto: column.real,
  monto_equivalente_usd: column.real,
  moneda: column.text,
  tasa_cambio: column.real,
  fecha_pago: column.text,
  tipo_pago: column.text
});

const bobinas_grandes = new Table({
  id_viaje_compra: column.text,
  peso_inicial_kg: column.real,
  id_tipo_papel: column.text,
  peso_actual_kg: column.real,
  peso_muerto_kg: column.real,
  merma_core_kg: column.real,
  costo_bobina: column.real,
  fecha_llegada: column.text,
  fecha_uso: column.text,
  fecha_gasto: column.text,
  estado: column.text
});

const produccion_diaria = new Table({
  id_producto: column.text,
  id_pedido_destino: column.text,
  fecha: column.text,
  cantidad_rollos_total: column.integer
});

const consumo_bobinas = new Table({
  id_produccion: column.text,
  id_bobina: column.text,
  kg_consumidos: column.real
});

const detalles_pedido = new Table({
  id_pedido: column.text,
  id_producto: column.text,
  id_pote: column.text,
  id_tipo_papel: column.text,
  cantidad_solicitada: column.integer,
  cantidad_producida: column.integer,
  precio_unitario: column.real
});

const entregas_viaje = new Table({
  id_viaje: column.text,
  id_pedido: column.text,
  nota_entrega_numero: column.text,
  hora_llegada: column.text,
  estado: column.text,
  orden: column.integer
});

const movimientos = new Table({
  descripcion: column.text,
  monto: column.real,
  moneda: column.text,
  tasa_cambio: column.real,
  categoria: column.text,
  fecha: column.text,
  id_viaje: column.text,
  tipo: column.text
});

export const AppSchema = new Schema({
  clientes,
  inventario_potes,
  productos_presentacion,
  proveedores,
  viajes,
  pedidos,
  abonos_pagos,
  bobinas_grandes,
  produccion_diaria,
  consumo_bobinas,
  detalles_pedido,
  entregas_viaje,
  movimientos,
  tipos_papel,
  perfiles,
  rol_permisos,
  configuracion,
});
