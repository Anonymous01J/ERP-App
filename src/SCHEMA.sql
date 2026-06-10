-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: erp-app
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `abonos_pagos`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `abonos_pagos` (
  `id` int(11) NOT NULL,
  `id_pedido` int(11) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `monto_equivalente_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `moneda` enum('VES','USD') NOT NULL DEFAULT 'VES',
  `tasa_cambio` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `fecha_pago` datetime DEFAULT current_timestamp(),
  `tipo_pago` enum('adelanto','abono') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_abonos_pedido` (`id_pedido`),
  CONSTRAINT `fk_abonos_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bobinas_grandes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `estado` enum('disponible','en_uso','agotada') NOT NULL DEFAULT 'disponible',
  PRIMARY KEY (`id`),
  KEY `fk_bobinas_grandes_viaje_idx` (`id_viaje_compra`),
  CONSTRAINT `fk_bobinas_grandes_viaje` FOREIGN KEY (`id_viaje_compra`) REFERENCES `viajes` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clientes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `razon_social` varchar(255) NOT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `limite_credito` decimal(10,2) DEFAULT 0.00,
  `saldo_a_favor_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`id`)
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `consumo_bobinas`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `consumo_bobinas` (
  `id` int(11) NOT NULL,
  `id_produccion` int(11) NOT NULL,
  `id_bobina` int(11) NOT NULL,
  `kg_consumidos` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_consumo_produccion` (`id_produccion`),
  KEY `fk_consumo_bobina` (`id_bobina`),
  CONSTRAINT `fk_consumo_bobina` FOREIGN KEY (`id_bobina`) REFERENCES `bobinas_grandes` (`id`),
  CONSTRAINT `fk_consumo_produccion` FOREIGN KEY (`id_produccion`) REFERENCES `produccion_diaria` (`id`) ON DELETE CASCADE
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalles_pedido`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalles_pedido` (
  `id` int(11) NOT NULL,
  `id_pedido` int(11) NOT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `id_pote` int(11) DEFAULT NULL,
  `cantidad_solicitada` int(11) NOT NULL,
  `cantidad_producida` int(11) DEFAULT NULL,
  `precio_unitario` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `fk_detalles_pedido_idx` (`id_pedido`),
  KEY `fk_detalles_pedido_productos_idx` (`id_producto`),
  KEY `fk_detalles_pote` (`id_pote`),
  CONSTRAINT `fk_detalles_pedido_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_detalles_pedido_productos` FOREIGN KEY (`id_producto`) REFERENCES `productos_presentacion` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_detalles_pote` FOREIGN KEY (`id_pote`) REFERENCES `inventario_potes` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `entregas_viaje`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `entregas_viaje` (
  `id` int(11) NOT NULL,
  `id_viaje` int(11) NOT NULL,
  `id_pedido` int(11) NOT NULL,
  `nota_entrega_numero` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_entregas_viaje` (`id_viaje`),
  KEY `fk_entregas_pedido` (`id_pedido`),
  CONSTRAINT `fk_entregas_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_entregas_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viajes` (`id`) ON DELETE CASCADE
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventario_potes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventario_potes` (
  `id` int(11) NOT NULL,
  `capacidad` varchar(50) NOT NULL,
  `stock_unidades` int(11) NOT NULL DEFAULT 0,
  `precio_compra_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  `precio_venta_usd` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`)
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `movimientos`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movimientos` (
  `id` int(11) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `moneda` enum('VES','USD') NOT NULL DEFAULT 'VES',
  `tasa_cambio` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `categoria` enum('gasolina','peaje','viaticos','mantenimiento','operativos','otros','nomina') NOT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  `id_viaje` int(11) DEFAULT NULL,
  `tipo` enum('ingreso','egreso') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_gastos_viaje` (`id_viaje`),
  CONSTRAINT `fk_gastos_viaje` FOREIGN KEY (`id_viaje`) REFERENCES `viajes` (`id`) ON DELETE SET NULL
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pedidos`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `tasa_cambio_creacion` decimal(10,4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pedidos_cliente` (`id_cliente`),
  CONSTRAINT `fk_pedidos_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id`) ON DELETE CASCADE
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `produccion_diaria`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `produccion_diaria` (
  `id` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_pedido_destino` int(11) DEFAULT NULL,
  `fecha` date NOT NULL,
  `cantidad_rollos_total` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_produccion_producto` (`id_producto`),
  KEY `fk_produccion_pedido` (`id_pedido_destino`),
  CONSTRAINT `fk_produccion_pedido` FOREIGN KEY (`id_pedido_destino`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_produccion_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos_presentacion` (`id`)
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `productos_presentacion`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `productos_presentacion` (
  `id` int(11) NOT NULL,
  `nombre` varchar(45) DEFAULT NULL,
  `peso_nominal_g` int(11) DEFAULT NULL,
  `peso_real_g` int(11) DEFAULT NULL,
  `rollos_por_paquete` int(11) DEFAULT NULL,
  `stock_unidades_sueltas` int(11) DEFAULT NULL,
  `precio_USD` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tiempo_x_paquete_min` float DEFAULT NULL,
  PRIMARY KEY (`id`)
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `viajes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `viajes` (
  `id` int(11) NOT NULL,
  `tipo_viaje` varchar(50) NOT NULL,
  `fecha_viaje_inicio` datetime NOT NULL,
  `fecha_viaje_llegada_destino` datetime NOT NULL,
  `fecha_viaje_retorno` datetime NOT NULL,
  `fecha_viaje_llegada_base` datetime NOT NULL,
  `estado` enum('en_progreso','en_destino','retornando','completado') NOT NULL DEFAULT 'en_progreso',
  PRIMARY KEY (`id`)
);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `vw_dashboard_kpis`
--

SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_dashboard_kpis` AS SELECT
 1 AS `ingresos_mes_usd`,
  1 AS `deuda_calle_usd`,
  1 AS `kg_papel_consumido_mes`,
  1 AS `kg_merma_mes` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_inventario_consolidado`
--

SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_inventario_consolidado` AS SELECT
 1 AS `tipo_producto`,
  1 AS `id_item`,
  1 AS `descripcion`,
  1 AS `stock_actual`,
  1 AS `precio_venta_usd` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_pedidos_activos`
--

SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `vw_pedidos_activos` AS SELECT
 1 AS `id_pedido`,
  1 AS `nombre_cliente`,
  1 AS `estado`,
  1 AS `estado_pago`,
  1 AS `fecha_creacion`,
  1 AS `fecha_entrega_estimada`,
  1 AS `total_usd`,
  1 AS `total_pagado_usd`,
  1 AS `deuda_restante_usd` */;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vw_dashboard_kpis`
--

/*!50001 DROP VIEW IF EXISTS `vw_dashboard_kpis`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_dashboard_kpis` AS select (select ifnull(sum(`abonos_pagos`.`monto_equivalente_usd`),0) from `abonos_pagos` where month(`abonos_pagos`.`fecha_pago`) = month(curdate()) and year(`abonos_pagos`.`fecha_pago`) = year(curdate())) AS `ingresos_mes_usd`,(select ifnull(sum(`p`.`monto_total` - (select ifnull(sum(`ap`.`monto_equivalente_usd`),0) from `abonos_pagos` `ap` where `ap`.`id_pedido` = `p`.`id`)),0) from `pedidos` `p` where `p`.`estado_pago` = 'pendiente') AS `deuda_calle_usd`,(select ifnull(sum(`cb`.`kg_consumidos`),0) from (`consumo_bobinas` `cb` join `produccion_diaria` `pd` on(`cb`.`id_produccion` = `pd`.`id`)) where month(`pd`.`fecha`) = month(curdate()) and year(`pd`.`fecha`) = year(curdate())) AS `kg_papel_consumido_mes`,(select ifnull(sum(`bobinas_grandes`.`merma_core_kg` + `bobinas_grandes`.`peso_muerto_kg`),0) from `bobinas_grandes` where month(`bobinas_grandes`.`fecha_gasto`) = month(curdate()) and year(`bobinas_grandes`.`fecha_gasto`) = year(curdate())) AS `kg_merma_mes` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_inventario_consolidado`
--

/*!50001 DROP VIEW IF EXISTS `vw_inventario_consolidado`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_inventario_consolidado` AS select cast('papel' as char charset utf8mb4) AS `tipo_producto`,`productos_presentacion`.`id` AS `id_item`,cast(`productos_presentacion`.`nombre` as char charset utf8mb4) AS `descripcion`,`productos_presentacion`.`stock_unidades_sueltas` AS `stock_actual`,`productos_presentacion`.`precio_USD` AS `precio_venta_usd` from `productos_presentacion` union all select cast('pote' as char charset utf8mb4) AS `tipo_producto`,`inventario_potes`.`id` AS `id_item`,cast(`inventario_potes`.`capacidad` as char charset utf8mb4) AS `descripcion`,`inventario_potes`.`stock_unidades` AS `stock_actual`,`inventario_potes`.`precio_venta_usd` AS `precio_venta_usd` from `inventario_potes` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_pedidos_activos`
--

/*!50001 DROP VIEW IF EXISTS `vw_pedidos_activos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_pedidos_activos` AS select `p`.`id` AS `id_pedido`,`c`.`razon_social` AS `nombre_cliente`,`p`.`estado` AS `estado`,`p`.`estado_pago` AS `estado_pago`,`p`.`fecha_creacion` AS `fecha_creacion`,`p`.`fecha_entrega_estimada` AS `fecha_entrega_estimada`,`p`.`monto_total` AS `total_usd`,ifnull(sum(`ap`.`monto_equivalente_usd`),0) AS `total_pagado_usd`,`p`.`monto_total` - ifnull(sum(`ap`.`monto_equivalente_usd`),0) AS `deuda_restante_usd` from ((`pedidos` `p` left join `clientes` `c` on(`p`.`id_cliente` = `c`.`id`)) left join `abonos_pagos` `ap` on(`p`.`id` = `ap`.`id_pedido`)) group by `p`.`id` order by `p`.`fecha_entrega_estimada` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-10  1:34:05
