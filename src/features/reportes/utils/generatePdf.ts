import Toast from 'react-native-toast-message';

export const generateProductionPDF = async (
  filtroTiempoLabel: string, 
  metricasMermas: { bruto: number, desperdicio: number, util: number },
  chartBase64: string = '',
  isDetailed: boolean = false,
  bobinas: any[] = []
) => {
  try {
    let PrintModule: typeof import('expo-print');
    let SharingModule: typeof import('expo-sharing');
    
    try {
      PrintModule = await import('expo-print');
      SharingModule = await import('expo-sharing');

      if (!PrintModule || typeof PrintModule.printToFileAsync !== 'function') {
        throw new Error('ExpoPrint native module not available');
      }
    } catch (importErr) {
      console.warn('ExpoPrint / ExpoSharing native module not found:', importErr);
      Toast.show({
        type: 'error',
        text1: 'Recompilación requerida',
        text2: 'Debes reconstruir la app nativa (npx expo run:android) para usar PDF.',
      });
      return;
    }

    const eficiencia = ((metricasMermas.util / (metricasMermas.util + metricasMermas.desperdicio)) * 100).toFixed(1);
    
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            .corporate-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 20px; }
            .corporate-logo { width: 60px; height: 60px; background-color: #1e3a8a; border-radius: 8px; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 24px; }
            .corporate-info { text-align: right; font-size: 12px; color: #6b7280; }
            h1 { color: #1e3a8a; margin: 0 0 10px 0; font-size: 24px; }
            .header-date { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #6b7280; }
            .card { background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #111827; }
            .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .stat-label { font-weight: bold; color: #4b5563; }
            .stat-val { color: #111827; }
            .highlight { color: #16a34a; font-weight: bold; font-size: 24px; }
            .error { color: #dc2626; font-weight: bold; }
            .chart-img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px auto; display: block; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background-color: #e5e7eb; color: #374151; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <div class="corporate-header">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="corporate-logo">ERP</div>
              <div>
                <h1>Reporte de Producción</h1>
                <div style="font-size: 14px; color: #4b5563;">Control de Mermas y Eficiencia</div>
              </div>
            </div>
            <div class="corporate-info">
              <strong>Emprendimiento Jesus Galindez.</strong><br/>
              RIF: J-50577589-8<br/>
              El Tocuyo, Venezuela
            </div>
          </div>
          
          <div class="header-date">
            <div>Intervalo: <strong>${filtroTiempoLabel}</strong></div>
            <div>Generado el: ${new Date().toLocaleDateString('es-VE')}</div>
          </div>

          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;">
              <div class="card-title">Resumen de Eficiencia de Materia Prima</div>
              
              <div class="stat-row">
                <span class="stat-label">Total Bruto Comprado:</span>
                <span class="stat-val">${metricasMermas.bruto.toFixed(2)} kg</span>
              </div>
              
              <div class="stat-row">
                <span class="stat-label">Papel Procesado (Útil):</span>
                <span class="stat-val">${metricasMermas.util.toFixed(2)} kg</span>
              </div>
              
              <div class="stat-row">
                <span class="stat-label">Total Mermas (Desperdicio + Core):</span>
                <span class="stat-val error">${metricasMermas.desperdicio.toFixed(2)} kg</span>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Eficiencia de Conversión</div>
                <div class="highlight">${isNaN(Number(eficiencia)) ? '0.0' : eficiencia}%</div>
              </div>
            </div>
            
            ${chartBase64 ? `
            <div style="flex: 1; min-width: 300px; display: flex; align-items: center; justify-content: center; background-color: #f9fafb; border-radius: 8px; padding: 10px;">
              <img class="chart-img" src="data:image/png;base64,${chartBase64}" />
            </div>
            ` : ''}
          </div>

          <div class="card" style="background-color: #e0f2fe; border-left: 4px solid #0284c7;">
            <div style="font-size: 14px; color: #075985;">
              <strong>💡 Resumen:</strong><br/>
              Las mermas y desperdicios representaron el <strong>${isNaN(Number(eficiencia)) ? '0.0' : (100 - Number(eficiencia)).toFixed(1)}%</strong> del papel procesado durante este período. 
              ${Number(eficiencia) >= 95 ? 'Este valor refleja un uso altamente óptimo de la materia prima.' : 'Se recomienda revisar los cortes o rollos dañados para mejorar la eficiencia.'}
            </div>
          </div>

          ${isDetailed && bobinas.length > 0 ? `
            <div class="page-break"></div>
            <h2 style="color: #1e3a8a; font-size: 18px;">Desglose Detallado de Bobinas</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha Llegada</th>
                  <th>Peso Bruto (kg)</th>
                  <th>Peso Muerto (kg)</th>
                  <th>Core (kg)</th>
                  <th>Papel Útil (kg)</th>
                </tr>
              </thead>
              <tbody>
                ${bobinas.map(b => {
                  const bruto = b.peso_inicial_kg || 0;
                  const muerto = b.peso_muerto_kg || 0;
                  const core = b.merma_core_kg || 0;
                  const util = bruto - muerto - core;
                  return `
                  <tr>
                    <td>${b.fecha_llegada ? new Date(b.fecha_llegada).toLocaleDateString('es-VE') : 'N/A'}</td>
                    <td>${bruto.toFixed(2)}</td>
                    <td style="color: #dc2626;">${muerto.toFixed(2)}</td>
                    <td style="color: #dc2626;">${core.toFixed(2)}</td>
                    <td style="color: #16a34a;">${Math.max(0, util).toFixed(2)}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}

          <div style="margin-top: 60px; font-size: 12px; color: #9ca3af; text-align: center;">
            Documento generado automáticamente por el Sistema de Gestión Administrativa (ERP)
          </div>
        </body>
      </html>
    `;

    const { uri } = await PrintModule.printToFileAsync({
      html,
      margins: { left: 40, right: 40, top: 40, bottom: 40 }
    });

    if (await SharingModule.isAvailableAsync()) {
      await SharingModule.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } else {
      Toast.show({ type: 'success', text1: 'PDF Generado', text2: `Guardado en: ${uri}` });
    }
  } catch (error) {
    console.error('Error al generar PDF:', error);
    Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo generar el documento PDF.' });
  }
};

export const generateFinancePDF = async (
  filtroTiempoLabel: string, 
  metricasFinanzas: { ventas: number, cobranzas: number, cuentasPorCobrar: number },
  chartBase64: string = '',
  isDetailed: boolean = false,
  pedidosFin: any[] = [],
  abonosFin: any[] = []
) => {
  try {
    let PrintModule: typeof import('expo-print');
    let SharingModule: typeof import('expo-sharing');
    
    try {
      PrintModule = await import('expo-print');
      SharingModule = await import('expo-sharing');
      if (!PrintModule || typeof PrintModule.printToFileAsync !== 'function') {
        throw new Error('ExpoPrint native module not available');
      }
    } catch (importErr) {
      console.warn('ExpoPrint / ExpoSharing native module not found:', importErr);
      Toast.show({
        type: 'error',
        text1: 'Recompilación requerida',
        text2: 'Debes reconstruir la app nativa (npx expo run:android) para usar PDF.',
      });
      return;
    }

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            .corporate-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 20px; }
            .corporate-logo { width: 60px; height: 60px; background-color: #1e3a8a; border-radius: 8px; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 24px; }
            .corporate-info { text-align: right; font-size: 12px; color: #6b7280; }
            h1 { color: #1e3a8a; margin: 0 0 10px 0; font-size: 24px; }
            .header-date { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #6b7280; }
            .card { background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #111827; }
            .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .stat-label { font-weight: bold; color: #4b5563; }
            .stat-val { color: #111827; }
            .highlight { color: #16a34a; font-weight: bold; font-size: 24px; }
            .chart-img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px auto; display: block; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background-color: #e5e7eb; color: #374151; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <div class="corporate-header">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="corporate-logo">ERP</div>
              <div>
                <h1>Reporte Financiero</h1>
                <div style="font-size: 14px; color: #4b5563;">Flujo de Caja y Cuentas por Cobrar</div>
              </div>
            </div>
            <div class="corporate-info">
              <strong>Emprendimiento Jesus Galindez.</strong><br/>
              RIF: J-50577589-8<br/>
              El Tocuyo, Venezuela
            </div>
          </div>

          <div class="header-date">
            <div>Intervalo: <strong>${filtroTiempoLabel}</strong></div>
            <div>Generado el: ${new Date().toLocaleDateString('es-VE')}</div>
          </div>

          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;">
              <div class="card-title">Consolidado Financiero</div>
              
              <div class="stat-row">
                <span class="stat-label">Ventas Totales (Facturadas):</span>
                <span class="stat-val">$${metricasFinanzas.ventas.toFixed(2)} USD</span>
              </div>
              
              <div class="stat-row">
                <span class="stat-label">Cobranzas Recibidas:</span>
                <span class="stat-val" style="color: #16a34a;">$${metricasFinanzas.cobranzas.toFixed(2)} USD</span>
              </div>
              
              <div class="stat-row" style="margin-top: 10px; border-top: 2px solid #e5e7eb;">
                <span class="stat-label">Cuentas por Cobrar (Deuda):</span>
                <span class="stat-val highlight" style="color: #dc2626;">$${Math.max(0, metricasFinanzas.cuentasPorCobrar).toFixed(2)} USD</span>
              </div>
            </div>

            ${chartBase64 ? `
            <div style="flex: 1; min-width: 300px; display: flex; align-items: center; justify-content: center; background-color: #f9fafb; border-radius: 8px; padding: 10px;">
              <img class="chart-img" src="data:image/png;base64,${chartBase64}" />
            </div>
            ` : ''}
          </div>

          <div class="card" style="background-color: #e0f2fe; border-left: 4px solid #0284c7;">
            <div style="font-size: 14px; color: #075985;">
              <strong>💡 Resumen:</strong><br/>
              La deuda por cobrar representa un <strong>${metricasFinanzas.ventas > 0 ? ((Math.max(0, metricasFinanzas.cuentasPorCobrar) / metricasFinanzas.ventas) * 100).toFixed(1) : '0.0'}%</strong> de la facturación total del período. 
              ${Math.max(0, metricasFinanzas.cuentasPorCobrar) > metricasFinanzas.cobranzas ? 'Existe un alto volumen de deuda pendiente; se recomienda priorizar la gestión de cobranza.' : 'El flujo de caja se mantiene saludable respecto a la facturación emitida.'}
            </div>
          </div>

          ${isDetailed && pedidosFin.length > 0 ? `
            <div class="page-break"></div>
            <h2 style="color: #1e3a8a; font-size: 18px;">Desglose Detallado de Ventas (Pedidos)</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Total Facturado</th>
                  <th>Estado de Pago</th>
                </tr>
              </thead>
              <tbody>
                ${pedidosFin.map(p => {
                  return `
                  <tr>
                    <td>${p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString('es-VE') : 'N/A'}</td>
                    <td>${p.razon_social ? p.razon_social : 'Consumidor Final'}</td>
                    <td>$${(p.monto_total || 0).toFixed(2)}</td>
                    <td style="color: ${p.estado_pago === 'pagado' ? '#16a34a' : '#dc2626'}">${p.estado_pago ? p.estado_pago.toUpperCase() : 'PENDIENTE'}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}

          <div style="margin-top: 60px; font-size: 12px; color: #9ca3af; text-align: center;">
            Documento generado automáticamente por el Sistema de Gestión Administrativa (ERP)
          </div>
        </body>
      </html>
    `;

    const { uri } = await PrintModule.printToFileAsync({
      html,
      margins: { left: 40, right: 40, top: 40, bottom: 40 }
    });

    if (await SharingModule.isAvailableAsync()) {
      await SharingModule.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } else {
      Toast.show({ type: 'success', text1: 'PDF Generado', text2: `Guardado en: ${uri}` });
    }
  } catch (error) {
    console.error('Error al generar PDF financiero:', error);
    Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo generar el documento PDF.' });
  }
};

export const generateLogisticsPDF = async (
  filtroTiempoLabel: string, 
  metricasLogistica: { desglose: Record<string, number>, totalGastos: number },
  chartBase64: string = '',
  isDetailed: boolean = false,
  gastosViaje: any[] = []
) => {
  try {
    let PrintModule: typeof import('expo-print');
    let SharingModule: typeof import('expo-sharing');
    
    try {
      PrintModule = await import('expo-print');
      SharingModule = await import('expo-sharing');
      if (!PrintModule || typeof PrintModule.printToFileAsync !== 'function') {
        throw new Error('ExpoPrint native module not available');
      }
    } catch (importErr) {
      console.warn('ExpoPrint / ExpoSharing native module not found:', importErr);
      Toast.show({
        type: 'error',
        text1: 'Recompilación requerida',
        text2: 'Debes reconstruir la app nativa (npx expo run:android) para usar PDF.',
      });
      return;
    }

    const rowsHtml = Object.entries(metricasLogistica.desglose)
      .filter(([_, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, val]) => `
        <div class="stat-row">
          <span class="stat-label" style="text-transform: capitalize;">${key}:</span>
          <span class="stat-val">$${val.toFixed(2)} USD</span>
        </div>
      `).join('');

    const topCategoria = Object.entries(metricasLogistica.desglose).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            .corporate-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 20px; }
            .corporate-logo { width: 60px; height: 60px; background-color: #1e3a8a; border-radius: 8px; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 24px; }
            .corporate-info { text-align: right; font-size: 12px; color: #6b7280; }
            h1 { color: #1e3a8a; margin: 0 0 10px 0; font-size: 24px; }
            .header-date { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #6b7280; }
            .card { background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .card-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #111827; }
            .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .stat-label { font-weight: bold; color: #4b5563; }
            .stat-val { color: #111827; }
            .highlight { color: #dc2626; font-weight: bold; font-size: 24px; }
            .chart-img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px auto; display: block; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background-color: #e5e7eb; color: #374151; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <div class="corporate-header">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="corporate-logo">ERP</div>
              <div>
                <h1>Reporte de Logística</h1>
                <div style="font-size: 14px; color: #4b5563;">Gastos de Viaje y Distribución</div>
              </div>
            </div>
            <div class="corporate-info">
              <strong>Emprendimiento Jesus Galindez.</strong><br/>
              RIF: J-50577589-8<br/>
              El Tocuyo, Venezuela
            </div>
          </div>

          <div class="header-date">
            <div>Intervalo: <strong>${filtroTiempoLabel}</strong></div>
            <div>Generado el: ${new Date().toLocaleDateString('es-VE')}</div>
          </div>

          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;">
              <div class="card-title">Desglose de Gastos en Rutas</div>
              ${rowsHtml || '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">No hay gastos registrados.</div>'}
              
              <div class="stat-row" style="margin-top: 20px; border-top: 2px solid #e5e7eb;">
                <span class="stat-label">Total Egresos Logísticos:</span>
                <span class="stat-val highlight">$${metricasLogistica.totalGastos.toFixed(2)} USD</span>
              </div>
            </div>

            ${chartBase64 ? `
            <div style="flex: 1; min-width: 300px; display: flex; align-items: center; justify-content: center; background-color: #f9fafb; border-radius: 8px; padding: 10px;">
              <img class="chart-img" src="data:image/png;base64,${chartBase64}" />
            </div>
            ` : ''}
          </div>

          <div class="card" style="background-color: #e0f2fe; border-left: 4px solid #0284c7;">
            <div style="font-size: 14px; color: #075985;">
              <strong>💡 Resumen:</strong><br/>
              ${topCategoria ? `El <strong>${((metricasLogistica.desglose[topCategoria] / metricasLogistica.totalGastos) * 100).toFixed(1)}%</strong> de los gastos logísticos en este período correspondieron a <strong>${topCategoria.toUpperCase()}</strong>.` : 'No se registraron gastos significativos en el período.'}
            </div>
          </div>

          ${isDetailed && gastosViaje.length > 0 ? `
            <div class="page-break"></div>
            <h2 style="color: #1e3a8a; font-size: 18px;">Historial Detallado de Egresos de Viaje (Últimos 15)</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Monto (Original)</th>
                  <th>Equivalente (USD)</th>
                </tr>
              </thead>
              <tbody>
                ${gastosViaje.slice(0, 15).map(g => {
                  const montoUsd = g.moneda === 'USD' ? g.monto : (g.monto / (g.tasa_cambio || 1));
                  return `
                  <tr>
                    <td>${g.fecha ? new Date(g.fecha).toLocaleDateString('es-VE') : 'N/A'}</td>
                    <td style="text-transform: capitalize;">${g.categoria || 'otros'}</td>
                    <td>${g.descripcion || '-'}</td>
                    <td>${g.monto} ${g.moneda}</td>
                    <td>$${montoUsd.toFixed(2)}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}

          <div style="margin-top: 60px; font-size: 12px; color: #9ca3af; text-align: center;">
            Documento generado automáticamente por el Sistema de Gestión Administrativa (ERP)
          </div>
        </body>
      </html>
    `;

    const { uri } = await PrintModule.printToFileAsync({
      html,
      margins: { left: 40, right: 40, top: 40, bottom: 40 }
    });

    if (await SharingModule.isAvailableAsync()) {
      await SharingModule.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } else {
      Toast.show({ type: 'success', text1: 'PDF Generado', text2: `Guardado en: ${uri}` });
    }
  } catch (error) {
    console.error('Error al generar PDF logístico:', error);
    Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo generar el documento PDF.' });
  }
};
