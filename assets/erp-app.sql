-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 10-06-2026 a las 07:48:04
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `erp-app`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_asignar_stock_fifo` ()   BEGIN
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_asignar_stock_pedido` (IN `p_id_pedido` INT)   BEGIN
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_calcular_saldo_pedido` (IN `p_id_pedido` INT, OUT `p_saldo_usd` DECIMAL(10,2))   BEGIN
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cancelar_pedido` (IN `p_id_pedido` INT)   BEGIN
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_estado_cuenta_cliente` (IN `p_id_cliente` INT)   BEGIN
    
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_liquidar_viaje` (IN `p_id_viaje` INT, IN `p_fecha_llegada_base` DATETIME)   BEGIN
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_procesar_produccion_diaria` (IN `p_fecha` DATE, IN `p_id_producto` INT, IN `p_cantidad_rollos` INT, IN `p_id_pedido_destino` INT)   BEGIN
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_compra_potes` (IN `p_id_pote` INT, IN `p_cantidad` INT, IN `p_costo_total_usd` DECIMAL(10,2), IN `p_moneda_pago` VARCHAR(3), IN `p_tasa_cambio` DECIMAL(10,4))   BEGIN
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_consumo_bobina` (IN `p_id_produccion` INT, IN `p_id_bobina` INT, IN `p_kg_consumidos` FLOAT, IN `p_marcar_agotada` BOOLEAN, IN `p_merma_core_kg` FLOAT)   BEGIN
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
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_pago_credito` (IN `p_id_pedido` INT, IN `p_monto` DECIMAL(10,2), IN `p_moneda` VARCHAR(3), IN `p_tasa_cambio` DECIMAL(10,4), IN `p_tipo_pago` VARCHAR(20), IN `p_destino_excedente` VARCHAR(20))   BEGIN
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
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `abonos_pagos`
--

CREATE TABLE `abonos_pagos` (
  `id` int(11) NOT NULL,
  `id_pedido` int(11) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `monto_equivalente_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `moneda` enum('VES','USD') NOT NULL DEFAULT 'VES',
  `tasa_cambio` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `fecha_pago` datetime DEFAULT current_timestamp(),
  `tipo_pago` enum('adelanto','abono') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bobinas_grandes`
--

CREATE TABLE `bobinas_grandes` (
  `id` int(11) NOT NULL,
  `id_viaje_compra` int(11) NOT NULL,
  `peso_inicial_kg` float NOT NULL,
  `tipo_papel` enum('B','A') NOT NULL DEFAULT 'A',
  `peso_actual_kg` float DEFAULT NULL,
  `peso_muerto_kg` float DEFAULT NULL,
  `merma_core_kg` float DEFAULT NULL,
  `costo_bobina` decimal(10,2) NOT NULL DEFAULT 0.00,
  `fecha_llegada` datetime DEFAULT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `fecha_gasto` datetime DEFAULT NULL,
  `estado` enum('disponible','en_uso','agotada') NOT NULL DEFAULT 'disponible'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `razon_social` varchar(255) NOT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `limite_credito` decimal(10,2) DEFAULT 0.00,
  `saldo_a_favor_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `consumo_bobinas`
--

CREATE TABLE `consumo_bobinas` (
  `id` int(11) NOT NULL,
  `id_produccion` int(11) NOT NULL,
  `id_bobina` int(11) NOT NULL,
  `kg_consumidos` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalles_pedido`
--

CREATE TABLE `detalles_pedido` (
  `id` int(11) NOT NULL,
  `id_pedido` int(11) NOT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `id_pote` int(11) DEFAULT NULL,
  `cantidad_solicitada` int(11) NOT NULL,
  `cantidad_producida` int(11) DEFAULT NULL,
  `precio_unitario` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `entregas_viaje`
--

CREATE TABLE `entregas_viaje` (
  `id` int(11) NOT NULL,
  `id_viaje` int(11) NOT NULL,
  `id_pedido` int(11) NOT NULL,
  `nota_entrega_numero` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario_potes`
--

CREATE TABLE `inventario_potes` (
  `id` int(11) NOT NULL,
  `capacidad` varchar(50) NOT NULL,
  `stock_unidades` int(11) NOT NULL DEFAULT 0,
  `precio_compra_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `precio_venta_usd` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos`
--

CREATE TABLE `movimientos` (
  `id` int(11) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `moneda` enum('VES','USD') NOT NULL DEFAULT 'VES',
  `tasa_cambio` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `categoria` enum('gasolina','peaje','viaticos','mantenimiento','operativos','otros','nomina') NOT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  `id_viaje` int(11) DEFAULT NULL,
  `tipo` enum('ingreso','egreso') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_entrega_estimada` datetime NOT NULL,
  `fecha_entrega` datetime DEFAULT NULL,
  `estado` enum('pendiente','en_produccion','listo','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  `estado_pago` enum('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
  `fecha_vencimiento_credito` date DEFAULT NULL,
  `monto_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tasa_cambio_creacion` decimal(10,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `produccion_diaria`
--

CREATE TABLE `produccion_diaria` (
  `id` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_pedido_destino` int(11) DEFAULT NULL,
  `fecha` date NOT NULL,
  `cantidad_rollos_total` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos_presentacion`
--

CREATE TABLE `productos_presentacion` (
  `id` int(11) NOT NULL,
  `nombre` varchar(45) DEFAULT NULL,
  `peso_nominal_g` int(11) DEFAULT NULL,
  `peso_real_g` int(11) DEFAULT NULL,
  `rollos_por_paquete` int(11) DEFAULT NULL,
  `stock_unidades_sueltas` int(11) DEFAULT NULL,
  `precio_USD` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tiempo_x_paquete_min` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `viajes`
--

CREATE TABLE `viajes` (
  `id` int(11) NOT NULL,
  `tipo_viaje` varchar(50) NOT NULL,
  `fecha_viaje_inicio` datetime NOT NULL,
  `fecha_viaje_llegada_destino` datetime NOT NULL,
  `fecha_viaje_retorno` datetime NOT NULL,
  `fecha_viaje_llegada_base` datetime NOT NULL,
  `estado` enum('en_progreso','en_destino','retornando','completado') NOT NULL DEFAULT 'en_progreso'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vw_dashboard_kpis`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vw_dashboard_kpis` (
`ingresos_mes_usd` decimal(32,2)
,`deuda_calle_usd` decimal(55,2)
,`kg_papel_consumido_mes` decimal(32,2)
,`kg_merma_mes` double
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vw_inventario_consolidado`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vw_inventario_consolidado` (
`tipo_producto` varchar(5)
,`id_item` int(11)
,`descripcion` varchar(50)
,`stock_actual` int(11)
,`precio_venta_usd` decimal(10,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vw_pedidos_activos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vw_pedidos_activos` (
`id_pedido` int(11)
,`nombre_cliente` varchar(255)
,`estado` enum('pendiente','en_produccion','listo','entregado','cancelado')
,`estado_pago` enum('pendiente','pagado')
,`fecha_creacion` datetime
,`fecha_entrega_estimada` datetime
,`total_usd` decimal(10,2)
,`total_pagado_usd` decimal(32,2)
,`deuda_restante_usd` decimal(33,2)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `vw_dashboard_kpis`
--
DROP TABLE IF EXISTS `vw_dashboard_kpis`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_dashboard_kpis`  AS SELECT (select ifnull(sum(`abonos_pagos`.`monto_equivalente_usd`),0) from `abonos_pagos` where month(`abonos_pagos`.`fecha_pago`) = month(curdate()) and year(`abonos_pagos`.`fecha_pago`) = year(curdate())) AS `ingresos_mes_usd`, (select ifnull(sum(`p`.`monto_total` - (select ifnull(sum(`ap`.`monto_equivalente_usd`),0) from `abonos_pagos` `ap` where `ap`.`id_pedido` = `p`.`id`)),0) from `pedidos` `p` where `p`.`estado_pago` = 'pendiente') AS `deuda_calle_usd`, (select ifnull(sum(`cb`.`kg_consumidos`),0) from (`consumo_bobinas` `cb` join `produccion_diaria` `pd` on(`cb`.`id_produccion` = `pd`.`id`)) where month(`pd`.`fecha`) = month(curdate()) and year(`pd`.`fecha`) = year(curdate())) AS `kg_papel_consumido_mes`, (select ifnull(sum(`bobinas_grandes`.`merma_core_kg` + `bobinas_grandes`.`peso_muerto_kg`),0) from `bobinas_grandes` where month(`bobinas_grandes`.`fecha_gasto`) = month(curdate()) and year(`bobinas_grandes`.`fecha_gasto`) = year(curdate())) AS `kg_merma_mes` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vw_inventario_consolidado`
--
DROP TABLE IF EXISTS `vw_inventario_consolidado`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_inventario_consolidado`  AS SELECT cast('papel' as char charset utf8mb4) AS `tipo_producto`, `productos_presentacion`.`id` AS `id_item`, cast(`productos_presentacion`.`nombre` as char charset utf8mb4) AS `descripcion`, `productos_presentacion`.`stock_unidades_sueltas` AS `stock_actual`, `productos_presentacion`.`precio_USD` AS `precio_venta_usd` FROM `productos_presentacion`union all select cast('pote' as char charset utf8mb4) AS `tipo_producto`,`inventario_potes`.`id` AS `id_item`,cast(`inventario_potes`.`capacidad` as char charset utf8mb4) AS `descripcion`,`inventario_potes`.`stock_unidades` AS `stock_actual`,`inventario_potes`.`precio_venta_usd` AS `precio_venta_usd` from `inventario_potes`  ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vw_pedidos_activos`
--
DROP TABLE IF EXISTS `vw_pedidos_activos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_pedidos_activos`  AS SELECT `p`.`id` AS `id_pedido`, `c`.`razon_social` AS `nombre_cliente`, `p`.`estado` AS `estado`, `p`.`estado_pago` AS `estado_pago`, `p`.`fecha_creacion` AS `fecha_creacion`, `p`.`fecha_entrega_estimada` AS `fecha_entrega_estimada`, `p`.`monto_total` AS `total_usd`, ifnull(sum(`ap`.`monto_equivalente_usd`),0) AS `total_pagado_usd`, `p`.`monto_total`- ifnull(sum(`ap`.`monto_equivalente_usd`),0) AS `deuda_restante_usd` FROM ((`pedidos` `p` left join `clientes` `c` on(`p`.`id_cliente` = `c`.`id`)) left join `abonos_pagos` `ap` on(`p`.`id` = `ap`.`id_pedido`)) GROUP BY `p`.`id` ORDER BY `p`.`fecha_entrega_estimada` ASC ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `abonos_pagos`
--
ALTER TABLE `abonos_pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_abonos_pedido` (`id_pedido`);

--
-- Indices de la tabla `bobinas_grandes`
--
ALTER TABLE `bobinas_grandes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bobinas_grandes_viaje_idx` (`id_viaje_compra`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `consumo_bobinas`
--
ALTER TABLE `consumo_bobinas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_consumo_produccion` (`id_produccion`),
  ADD KEY `fk_consumo_bobina` (`id_bobina`);

--
-- Indices de la tabla `detalles_pedido`
--
ALTER TABLE `detalles_pedido`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_detalles_pedido_idx` (`id_pedido`),
  ADD KEY `fk_detalles_pedido_productos_idx` (`id_producto`),
  ADD KEY `fk_detalles_pote` (`id_pote`);

--
-- Indices de la tabla `entregas_viaje`
--
ALTER TABLE `entregas_viaje`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_entregas_viaje` (`id_viaje`),
  ADD KEY `fk_entregas_pedido` (`id_pedido`);

--
-- Indices de la tabla `inventario_potes`
--
ALTER TABLE `inventario_potes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_gastos_viaje` (`id_viaje`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pedidos_cliente` (`id_cliente`);

--
-- Indices de la tabla `produccion_diaria`
--
ALTER TABLE `produccion_diaria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_produccion_producto` (`id_producto`),
  ADD KEY `fk_produccion_pedido` (`id_pedido_destino`);

--
-- Indices de la tabla `productos_presentacion`
--
ALTER TABLE `productos_presentacion`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `viajes`
--
ALTER TABLE `viajes`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `inventario_potes`
--
ALTER TABLE `inventario_potes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `abonos_pagos`
--
ALTER TABLE `abonos_pagos`
  ADD CONSTRAINT `fk_abonos_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `bobinas_grandes`
--
ALTER TABLE `bobinas_grandes`
  ADD CONSTRAINT `fk_bobinas_grandes_viaje` FOREIGN KEY (`id_viaje_compra`) REFERENCES `viajes` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `consumo_bobinas`
--
ALTER TABLE `consumo_bobinas`
  ADD CONSTRAINT `fk_consumo_bobina` FOREIGN KEY (`id_bobina`) REFERENCES `bobinas_grandes` (`id`),
  ADD CONSTRAINT `fk_consumo_produccion` FOREIGN KEY (`id_produccion`) REFERENCES `produccion_diaria` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `detalles_pedido`
--
ALTER TABLE `detalles_pedido`
  ADD CONSTRAINT `fk_detalles_pedido_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_detalles_pedido_productos` FOREIGN KEY (`id_producto`) REFERENCES `productos_presentacion` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_detalles_pote` FOREIGN KEY (`id_pote`) REFERENCES `inventario_potes` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `entregas_viaje`
--
ALTER TABLE `entregas_viaje`
  ADD CONSTRAINT `fk_entregas_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_entregas_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viajes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD CONSTRAINT `fk_gastos_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viajes` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `fk_pedidos_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `produccion_diaria`
--
ALTER TABLE `produccion_diaria`
  ADD CONSTRAINT `fk_produccion_pedido` FOREIGN KEY (`id_pedido_destino`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_produccion_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos_presentacion` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
