-- Procedimientos Almacenados convertidos a Funciones PL/pgSQL para Supabase

-- 1. sp_calcular_saldo_pedido
CREATE OR REPLACE FUNCTION sp_calcular_saldo_pedido(p_id_pedido UUID, OUT p_saldo_usd NUMERIC)
LANGUAGE plpgsql
AS $$
DECLARE
    v_monto_total NUMERIC;
    v_total_abonado NUMERIC;
BEGIN
    SELECT monto_total INTO v_monto_total FROM pedidos WHERE id = p_id_pedido;
    SELECT COALESCE(SUM(monto_equivalente_usd), 0) INTO v_total_abonado FROM abonos_pagos WHERE id_pedido = p_id_pedido;
    p_saldo_usd := v_monto_total - v_total_abonado;
    IF p_saldo_usd < 0 THEN
        p_saldo_usd := 0;
    END IF;
END;
$$;

-- 2. sp_cancelar_pedido
CREATE OR REPLACE FUNCTION sp_cancelar_pedido(p_id_pedido UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_detalle UUID;
    v_id_producto UUID;
    v_producida INT;
    v_total_abonado_usd NUMERIC;
    v_id_cliente UUID;
    v_estado_actual TEXT;
    cur_detalles CURSOR FOR SELECT id, id_producto, cantidad_producida FROM detalles_pedido WHERE id_pedido = p_id_pedido AND cantidad_producida > 0;
BEGIN
    SELECT id_cliente, estado INTO v_id_cliente, v_estado_actual FROM pedidos WHERE id = p_id_pedido FOR UPDATE;
    
    IF v_estado_actual NOT IN ('entregado', 'cancelado') THEN
        FOR rec IN cur_detalles LOOP
            UPDATE productos_presentacion SET stock_unidades_sueltas = stock_unidades_sueltas + rec.cantidad_producida WHERE id = rec.id_producto;
            UPDATE detalles_pedido SET cantidad_producida = 0 WHERE id = rec.id;
        END LOOP;
        
        SELECT COALESCE(SUM(monto_equivalente_usd), 0) INTO v_total_abonado_usd FROM abonos_pagos WHERE id_pedido = p_id_pedido;
        
        IF v_total_abonado_usd > 0 THEN
            UPDATE clientes SET saldo_a_favor_usd = saldo_a_favor_usd + v_total_abonado_usd WHERE id = v_id_cliente;
        END IF;
        
        UPDATE pedidos SET estado = 'cancelado' WHERE id = p_id_pedido;
    END IF;
END;
$$;

-- 3. sp_liquidar_viaje
CREATE OR REPLACE FUNCTION sp_liquidar_viaje(p_id_viaje UUID, p_fecha_llegada_base TIMESTAMP WITH TIME ZONE)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE viajes SET estado = 'completado', fecha_viaje_llegada_base = p_fecha_llegada_base WHERE id = p_id_viaje;
    
    UPDATE pedidos p
    SET estado = 'entregado', fecha_entrega = NOW()
    FROM entregas_viaje ev
    WHERE ev.id_pedido = p.id AND ev.id_viaje = p_id_viaje;
END;
$$;

-- 4. sp_procesar_produccion_diaria
CREATE OR REPLACE FUNCTION sp_procesar_produccion_diaria(p_fecha DATE, p_id_producto UUID, p_cantidad_rollos INT, p_id_pedido_destino UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO produccion_diaria (fecha, id_producto, cantidad_rollos_total, id_pedido_destino)
    VALUES (p_fecha, p_id_producto, p_cantidad_rollos, p_id_pedido_destino);

    IF p_id_pedido_destino IS NULL THEN
        UPDATE productos_presentacion SET stock_unidades_sueltas = stock_unidades_sueltas + p_cantidad_rollos WHERE id = p_id_producto;
    ELSE
        UPDATE pedidos SET estado = 'en_produccion' WHERE id = p_id_pedido_destino AND estado = 'pendiente';
    END IF;
END;
$$;

-- 5. sp_registrar_compra_potes
CREATE OR REPLACE FUNCTION sp_registrar_compra_potes(p_id_pote UUID, p_cantidad INT, p_costo_total_usd NUMERIC, p_moneda_pago TEXT, p_tasa_cambio NUMERIC)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_costo_moneda_original NUMERIC;
BEGIN
    UPDATE inventario_potes SET stock_unidades = stock_unidades + p_cantidad WHERE id = p_id_pote;
    
    IF p_moneda_pago = 'VES' THEN
        v_costo_moneda_original := p_costo_total_usd * p_tasa_cambio;
    ELSE
        v_costo_moneda_original := p_costo_total_usd;
    END IF;
    
    INSERT INTO movimientos (descripcion, monto, moneda, tasa_cambio, categoria, tipo, fecha)
    VALUES ('Compra de ' || p_cantidad || ' unidades de pote ID ' || p_id_pote, v_costo_moneda_original, p_moneda_pago, p_tasa_cambio, 'operativos', 'egreso', NOW());
END;
$$;

-- Nota: Otras funciones complejas como sp_asignar_stock_fifo requieren traducciones de cursores similares.
-- En PowerSync, puedes invocar estas funciones ejecutando: supabase.rpc('sp_liquidar_viaje', { p_id_viaje: '...', p_fecha_llegada_base: '...' })
