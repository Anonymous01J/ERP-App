-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: erp-app
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping routines for database 'erp-app'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_asignar_stock_fifo`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id_detalle INT;
    DECLARE v_id_producto INT;
    DECLARE v_solicitada INT;
    DECLARE v_producida INT;
    DECLARE v_faltante INT;
    DECLARE v_stock_disponible INT;
    DECLARE v_a_asignar INT;

    
    
    DECLARE cur_detalles CURSOR FOR 
        SELECT dp.id, dp.id_producto, dp.cantidad_solicitada, dp.cantidad_producida
        FROM detalles_pedido dp
        INNER JOIN pedidos p ON dp.id_pedido = p.id
        WHERE p.estado IN ('pendiente', 'en_produccion') AND dp.cantidad_producida < dp.cantidad_solicitada
        ORDER BY p.fecha_entrega_estimada ASC, dp.id_pedido ASC, dp.id ASC;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;

    OPEN cur_detalles;

    read_loop: LOOP
        FETCH cur_detalles INTO v_id_detalle, v_id_producto, v_solicitada, v_producida;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET v_faltante = v_solicitada - v_producida;

        SELECT stock_unidades_sueltas INTO v_stock_disponible 
        FROM productos_presentacion 
        WHERE id = v_id_producto FOR UPDATE;

        IF v_stock_disponible > 0 THEN
            IF v_stock_disponible >= v_faltante THEN
                SET v_a_asignar = v_faltante;
            ELSE
                SET v_a_asignar = v_stock_disponible;
            END IF;

            UPDATE detalles_pedido 
            SET cantidad_producida = cantidad_producida + v_a_asignar 
            WHERE id = v_id_detalle;

            UPDATE productos_presentacion 
            SET stock_unidades_sueltas = stock_unidades_sueltas - v_a_asignar 
            WHERE id = v_id_producto;
        END IF;
    END LOOP;

    CLOSE cur_detalles;

    
    UPDATE pedidos p
    SET p.estado = 'listo'
    WHERE p.estado IN ('pendiente', 'en_produccion')
      AND NOT EXISTS (
          SELECT 1 FROM detalles_pedido dp 
          WHERE dp.id_pedido = p.id AND dp.cantidad_producida < dp.cantidad_solicitada
      );

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_asignar_stock_pedido`(IN p_id_pedido INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id_detalle INT;
    DECLARE v_id_producto INT;
    DECLARE v_solicitada INT;
    DECLARE v_producida INT;
    DECLARE v_faltante INT;
    DECLARE v_stock_disponible INT;
    DECLARE v_a_asignar INT;
    
    
    DECLARE cur_detalles CURSOR FOR 
        SELECT id, id_producto, cantidad_solicitada, cantidad_producida 
        FROM detalles_pedido 
        WHERE id_pedido = p_id_pedido AND cantidad_producida < cantidad_solicitada;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;

    OPEN cur_detalles;

    read_loop: LOOP
        FETCH cur_detalles INTO v_id_detalle, v_id_producto, v_solicitada, v_producida;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET v_faltante = v_solicitada - v_producida;

        
        SELECT stock_unidades_sueltas INTO v_stock_disponible 
        FROM productos_presentacion 
        WHERE id = v_id_producto FOR UPDATE;

        IF v_stock_disponible > 0 THEN
            IF v_stock_disponible >= v_faltante THEN
                SET v_a_asignar = v_faltante;
            ELSE
                SET v_a_asignar = v_stock_disponible;
            END IF;

            
            UPDATE detalles_pedido 
            SET cantidad_producida = cantidad_producida + v_a_asignar 
            WHERE id = v_id_detalle;

            
            UPDATE productos_presentacion 
            SET stock_unidades_sueltas = stock_unidades_sueltas - v_a_asignar 
            WHERE id = v_id_producto;
        END IF;
    END LOOP;

    CLOSE cur_detalles;

    
    IF (SELECT COUNT(*) FROM detalles_pedido WHERE id_pedido = p_id_pedido AND cantidad_producida < cantidad_solicitada) = 0 THEN
        UPDATE pedidos SET estado = 'listo' WHERE id = p_id_pedido AND estado IN ('pendiente', 'en_produccion');
    END IF;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_calcular_saldo_pedido`(
    IN p_id_pedido INT,
    OUT p_saldo_usd DECIMAL(10,2)
)
BEGIN
    DECLARE v_monto_total DECIMAL(10,2);
    DECLARE v_total_abonado DECIMAL(10,2);

    
    SELECT `monto_total` INTO v_monto_total
    FROM `pedidos` WHERE `id` = p_id_pedido;

    
    SELECT IFNULL(SUM(monto_equivalente_usd), 0) INTO v_total_abonado
    FROM `abonos_pagos` WHERE `id_pedido` = p_id_pedido;

    
    SET p_saldo_usd = v_monto_total - v_total_abonado;
    IF p_saldo_usd < 0 THEN
        SET p_saldo_usd = 0;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cancelar_pedido`(
    IN p_id_pedido INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id_detalle INT;
    DECLARE v_id_producto INT;
    DECLARE v_producida INT;
    DECLARE v_total_abonado_usd DECIMAL(10,2);
    DECLARE v_id_cliente INT;
    DECLARE v_estado_actual VARCHAR(20);

    DECLARE cur_detalles CURSOR FOR 
        SELECT id, id_producto, cantidad_producida 
        FROM detalles_pedido 
        WHERE id_pedido = p_id_pedido AND cantidad_producida > 0;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;

    SELECT id_cliente, estado INTO v_id_cliente, v_estado_actual 
    FROM pedidos WHERE id = p_id_pedido FOR UPDATE;

    IF v_estado_actual NOT IN ('entregado', 'cancelado') THEN
        
        OPEN cur_detalles;
        read_loop: LOOP
            FETCH cur_detalles INTO v_id_detalle, v_id_producto, v_producida;
            IF done THEN
                LEAVE read_loop;
            END IF;

            UPDATE productos_presentacion 
            SET stock_unidades_sueltas = stock_unidades_sueltas + v_producida 
            WHERE id = v_id_producto;

            UPDATE detalles_pedido 
            SET cantidad_producida = 0 
            WHERE id = v_id_detalle;
        END LOOP;
        CLOSE cur_detalles;

        SELECT IFNULL(SUM(monto_equivalente_usd), 0) INTO v_total_abonado_usd 
        FROM abonos_pagos WHERE id_pedido = p_id_pedido;

        IF v_total_abonado_usd > 0 THEN
            UPDATE clientes 
            SET saldo_a_favor_usd = saldo_a_favor_usd + v_total_abonado_usd 
            WHERE id = v_id_cliente;
        END IF;

        UPDATE pedidos SET estado = 'cancelado' WHERE id = p_id_pedido;

    END IF;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_estado_cuenta_cliente`(
    IN p_id_cliente INT
)
BEGIN
    
    SELECT 
        p.id AS id_pedido,
        p.fecha_creacion,
        p.fecha_vencimiento_credito,
        p.monto_total AS deuda_original_usd,
        IFNULL(SUM(ap.monto_equivalente_usd), 0) AS total_abonado_usd,
        (p.monto_total - IFNULL(SUM(ap.monto_equivalente_usd), 0)) AS saldo_deudor_usd,
        DATEDIFF(CURRENT_DATE(), p.fecha_vencimiento_credito) AS dias_vencido,
        CASE 
            WHEN CURRENT_DATE() > p.fecha_vencimiento_credito THEN 'VENCIDO'
            ELSE 'AL_DIA'
        END AS estatus_morosidad
    FROM `pedidos` p
    LEFT JOIN `abonos_pagos` ap ON p.id = ap.id_pedido
    WHERE p.id_cliente = p_id_cliente AND p.estado_pago = 'pendiente'
    GROUP BY p.id
    ORDER BY p.fecha_vencimiento_credito ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_liquidar_viaje`(
    IN p_id_viaje INT,
    IN p_fecha_llegada_base DATETIME
)
BEGIN
    START TRANSACTION;

    
    UPDATE `viajes`
    SET `estado` = 'completado',
        `fecha_viaje_llegada_base` = p_fecha_llegada_base
    WHERE `id` = p_id_viaje;

    
    UPDATE `pedidos` p
    INNER JOIN `entregas_viaje` ev ON ev.id_pedido = p.id
    SET p.`estado` = 'entregado',
        p.`fecha_entrega` = CURRENT_TIMESTAMP()
    WHERE ev.id_viaje = p_id_viaje;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_procesar_produccion_diaria`(
    IN p_fecha DATE,
    IN p_id_producto INT,
    IN p_cantidad_rollos INT,
    IN p_id_pedido_destino INT
)
BEGIN
    START TRANSACTION;

    
    INSERT INTO `produccion_diaria` (`fecha`, `id_producto`, `cantidad_rollos_total`, `id_pedido_destino`)
    VALUES (p_fecha, p_id_producto, p_cantidad_rollos, p_id_pedido_destino);

    
    IF p_id_pedido_destino IS NULL THEN
        UPDATE `productos_presentacion`
        SET `stock_unidades_sueltas` = `stock_unidades_sueltas` + p_cantidad_rollos
        WHERE `id` = p_id_producto;
    END IF;

    
    IF p_id_pedido_destino IS NOT NULL THEN
        UPDATE `pedidos`
        SET `estado` = 'en_produccion'
        WHERE `id` = p_id_pedido_destino AND `estado` = 'pendiente';
    END IF;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_compra_potes`(
    IN p_id_pote INT,
    IN p_cantidad INT,
    IN p_costo_total_usd DECIMAL(10,2),
    IN p_moneda_pago VARCHAR(3),
    IN p_tasa_cambio DECIMAL(10,4)
)
BEGIN
    DECLARE v_costo_moneda_original DECIMAL(10,2);
    
    START TRANSACTION;

    UPDATE inventario_potes 
    SET stock_unidades = stock_unidades + p_cantidad 
    WHERE id = p_id_pote;

    IF p_moneda_pago = 'VES' THEN
        SET v_costo_moneda_original = p_costo_total_usd * p_tasa_cambio;
    ELSE
        SET v_costo_moneda_original = p_costo_total_usd;
    END IF;

    INSERT INTO movimientos (descripcion, monto, moneda, tasa_cambio, categoria, tipo, fecha)
    VALUES (CONCAT('Compra de ', p_cantidad, ' unidades de pote ID ', p_id_pote), v_costo_moneda_original, p_moneda_pago, p_tasa_cambio, 'operativos', 'egreso', CURRENT_TIMESTAMP());

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_consumo_bobina`(
    IN p_id_produccion INT,
    IN p_id_bobina INT,
    IN p_kg_consumidos FLOAT,
    IN p_marcar_agotada BOOLEAN,
    IN p_merma_core_kg FLOAT
)
BEGIN
    DECLARE v_peso_actual FLOAT;
    
    
    START TRANSACTION;

    
    INSERT INTO `consumo_bobinas` (`id_produccion`, `id_bobina`, `kg_consumidos`)
    VALUES (p_id_produccion, p_id_bobina, p_kg_consumidos);

    
    UPDATE `bobinas_grandes`
    SET `peso_actual_kg` = `peso_actual_kg` - p_kg_consumidos,
        `estado` = 'en_uso',
        `fecha_uso` = IFNULL(`fecha_uso`, CURRENT_TIMESTAMP())
    WHERE `id` = p_id_bobina;

    
    IF p_marcar_agotada THEN
        SELECT `peso_actual_kg` INTO v_peso_actual 
        FROM `bobinas_grandes` WHERE `id` = p_id_bobina;

        UPDATE `bobinas_grandes`
        SET `estado` = 'agotada',
            `fecha_gasto` = CURRENT_TIMESTAMP(),
            `merma_core_kg` = p_merma_core_kg,
            `peso_muerto_kg` = v_peso_actual - p_merma_core_kg,
            `peso_actual_kg` = 0
        WHERE `id` = p_id_bobina;
    END IF;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_pago_credito`(
    IN p_id_pedido INT,
    IN p_monto DECIMAL(10,2),
    IN p_moneda VARCHAR(3),
    IN p_tasa_cambio DECIMAL(10,4),
    IN p_tipo_pago VARCHAR(20),
    IN p_destino_excedente VARCHAR(20) 
)
BEGIN
    DECLARE v_monto_equivalente_usd DECIMAL(10,2);
    DECLARE v_saldo_pendiente_usd DECIMAL(10,2);
    DECLARE v_pago_a_factura_usd DECIMAL(10,2);
    DECLARE v_excedente_usd DECIMAL(10,2);
    DECLARE v_excedente_moneda_original DECIMAL(10,2);
    DECLARE v_monto_pago_original DECIMAL(10,2);
    DECLARE v_id_cliente INT;
    
    START TRANSACTION;

    SELECT p.id_cliente, 
           (p.monto_total - IFNULL((SELECT SUM(monto_equivalente_usd) FROM abonos_pagos WHERE id_pedido = p_id_pedido), 0))
    INTO v_id_cliente, v_saldo_pendiente_usd
    FROM pedidos p WHERE p.id = p_id_pedido FOR UPDATE;

    IF p_tipo_pago = 'saldo_favor' THEN
        SET v_monto_equivalente_usd = p_monto;
        SET p_moneda = 'USD';
        SET p_tasa_cambio = 1;
        UPDATE clientes SET saldo_a_favor_usd = saldo_a_favor_usd - p_monto WHERE id = v_id_cliente;
    ELSE
        IF p_moneda = 'VES' THEN
            SET v_monto_equivalente_usd = p_monto / p_tasa_cambio;
        ELSE
            SET v_monto_equivalente_usd = p_monto;
        END IF;
    END IF;

    IF v_saldo_pendiente_usd <= 0 THEN
        SET v_pago_a_factura_usd = 0;
        SET v_excedente_usd = v_monto_equivalente_usd;
        SET v_monto_pago_original = 0;
    ELSE
        IF v_monto_equivalente_usd > v_saldo_pendiente_usd THEN
            SET v_pago_a_factura_usd = v_saldo_pendiente_usd;
            SET v_excedente_usd = v_monto_equivalente_usd - v_saldo_pendiente_usd;
            IF p_moneda = 'VES' THEN
                SET v_monto_pago_original = v_pago_a_factura_usd * p_tasa_cambio;
            ELSE
                SET v_monto_pago_original = v_pago_a_factura_usd;
            END IF;
        ELSE
            SET v_pago_a_factura_usd = v_monto_equivalente_usd;
            SET v_excedente_usd = 0;
            SET v_monto_pago_original = p_monto;
        END IF;
    END IF;

    IF v_pago_a_factura_usd > 0 THEN
        
        INSERT INTO `abonos_pagos` (`id_pedido`, `monto`, `monto_equivalente_usd`, `moneda`, `tasa_cambio`, `tipo_pago`, `fecha_pago`)
        VALUES (p_id_pedido, v_monto_pago_original, v_pago_a_factura_usd, p_moneda, p_tasa_cambio, p_tipo_pago, CURRENT_TIMESTAMP());

        
        IF p_tipo_pago != 'saldo_favor' THEN
            INSERT INTO `movimientos` (`descripcion`, `monto`, `moneda`, `tasa_cambio`, `categoria`, `tipo`, `fecha`)
            VALUES (CONCAT('Abono a factura del pedido #', p_id_pedido), v_monto_pago_original, p_moneda, p_tasa_cambio, 'otros', 'ingreso', CURRENT_TIMESTAMP());
        END IF;
    END IF;

    IF v_excedente_usd > 0 THEN
        IF p_moneda = 'VES' THEN
            SET v_excedente_moneda_original = v_excedente_usd * p_tasa_cambio;
        ELSE
            SET v_excedente_moneda_original = v_excedente_usd;
        END IF;

        IF p_destino_excedente = 'propina' THEN
            
            INSERT INTO `movimientos` (`descripcion`, `monto`, `moneda`, `tasa_cambio`, `categoria`, `tipo`, `fecha`)
            VALUES (CONCAT('Propina / Excedente pedido #', p_id_pedido), v_excedente_moneda_original, p_moneda, p_tasa_cambio, 'otros', 'ingreso', CURRENT_TIMESTAMP());
        ELSE
            
            UPDATE `clientes` SET `saldo_a_favor_usd` = `saldo_a_favor_usd` + v_excedente_usd WHERE `id` = v_id_cliente;
            
            
            IF p_tipo_pago != 'saldo_favor' THEN
                INSERT INTO `movimientos` (`descripcion`, `monto`, `moneda`, `tasa_cambio`, `categoria`, `tipo`, `fecha`)
                VALUES (CONCAT('Ingreso a saldo a favor del cliente #', v_id_cliente), v_excedente_moneda_original, p_moneda, p_tasa_cambio, 'otros', 'ingreso', CURRENT_TIMESTAMP());
            END IF;
        END IF;
    END IF;

    IF (v_saldo_pendiente_usd - v_pago_a_factura_usd) <= 0 THEN
        UPDATE `pedidos` SET `estado_pago` = 'pagado' WHERE `id` = p_id_pedido;
    END IF;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-10  1:33:57
