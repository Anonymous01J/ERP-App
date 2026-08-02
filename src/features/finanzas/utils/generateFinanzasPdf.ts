import Toast from 'react-native-toast-message';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatNumber = (val: number) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

export const generateFinanzasPdf = async (
  movimientos: any[],
  dateFilter: string | null,
  filterType: 'todos' | 'ingresos' | 'gastos'
) => {
  try {
    let PrintModule: typeof import('expo-print');
    let SharingModule: typeof import('expo-sharing');
    let FileSystemModule: typeof import('expo-file-system/legacy');
    
    try {
      PrintModule = await import('expo-print');
      SharingModule = await import('expo-sharing');
      FileSystemModule = await import('expo-file-system/legacy');

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

    // Calcular totales para la vista actual
    let totalIngresos = 0;
    let totalGastos = 0;
    
    movimientos.forEach(mov => {
      // Todo a USD para un resumen global, o mostramos el conteo
      // En la app se calculó KPI. Para el reporte, podemos mostrar la sumatoria en USD estimado.
      const usdVal = mov.moneda === 'USD' ? mov.monto : (mov.monto / (mov.tasa_cambio || 1));
      if (mov.tipo === 'ingreso') {
        totalIngresos += usdVal;
      } else {
        totalGastos += usdVal;
      }
    });

    const balance = totalIngresos - totalGastos;

    const dateStr = dateFilter 
      ? format(new Date(dateFilter + 'T00:00:00'), "dd 'de' MMMM, yyyy", { locale: es })
      : 'Historial Completo';

    let typeStr = '';
    if (filterType === 'ingresos') typeStr = ' (Solo Ingresos)';
    else if (filterType === 'gastos') typeStr = ' (Solo Gastos)';

    const fechaFiltroLabel = `${dateStr}${typeStr}`;

    const rowsHtml = movimientos.map(mov => {
      const isIngreso = mov.tipo === 'ingreso';
      const colorText = isIngreso ? '#16a34a' : '#dc2626'; // Green / Red
      const signo = isIngreso ? '+' : '-';
      
      let eqString = '';
      if (mov.moneda === 'VES' && mov.tasa_cambio) {
        const usdVal = mov.monto / mov.tasa_cambio;
        eqString = `≈ $${formatNumber(usdVal)}`;
      } else if (mov.moneda === 'USD' && mov.tasa_cambio && mov.tasa_cambio > 1) {
        const vesVal = mov.monto * mov.tasa_cambio;
        eqString = `≈ Bs. ${formatNumber(vesVal)}`;
      } else if (mov.moneda === 'USD') {
        eqString = 'Divisas';
      }

      const fechaDisplay = mov.fecha ? format(new Date(mov.fecha), "dd/MM/yy hh:mm a") : 'N/A';

      return `
        <tr>
          <td>${fechaDisplay}</td>
          <td><strong>${mov.descripcion || 'Sin descripción'}</strong><br/><small style="color: #6b7280;">Tasa: ${mov.tasa_cambio || 1}</small></td>
          <td style="color: ${colorText}; font-weight: bold;">
            ${signo} ${formatNumber(mov.monto)} ${mov.moneda}
            <br/><small style="color: #6b7280; font-weight: normal;">${eqString}</small>
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 10px; color: #333; }
            .corporate-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 10px; }
            .corporate-logo { width: 60px; height: 60px; background-color: #1e3a8a; border-radius: 8px; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 24px; }
            .corporate-info { text-align: right; font-size: 12px; color: #6b7280; }
            h1 { color: #1e3a8a; margin: 0 0 10px 0; font-size: 22px; }
            .header-date { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; color: #6b7280; }
            .card { background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
            .card-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #111827; }
            .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .stat-label { font-weight: bold; color: #4b5563; font-size: 13px; }
            .stat-val { color: #111827; font-size: 13px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background-color: #e5e7eb; color: #374151; }
          </style>
        </head>
        <body>
          <div class="corporate-header">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="corporate-logo">ERP</div>
              <div>
                <h1>Reporte de Finanzas</h1>
                <div style="font-size: 14px; color: #4b5563;">Historial de Flujo de Caja</div>
              </div>
            </div>
            <div class="corporate-info">
              <strong>Emprendimiento Jesus Galindez.</strong><br/>
              RIF: J-50577589-8<br/>
              El Tocuyo, Venezuela
            </div>
          </div>
          
          <div class="header-date">
            <div>Filtro aplicado: <strong>${fechaFiltroLabel}</strong></div>
            <div>Generado el: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</div>
          </div>

          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;">
              <div class="card-title">Resumen de la Vista Actual (Valores Estimados USD)</div>
              
              <div class="stat-row">
                <span class="stat-label">Total Ingresos:</span>
                <span class="stat-val" style="color: #16a34a;">+$${formatNumber(totalIngresos)}</span>
              </div>
              
              <div class="stat-row">
                <span class="stat-label">Total Gastos:</span>
                <span class="stat-val" style="color: #dc2626;">-$${formatNumber(totalGastos)}</span>
              </div>
              
              <div class="stat-row" style="border-bottom: none;">
                <span class="stat-label">Balance Neto:</span>
                <span class="stat-val" style="color: ${balance >= 0 ? '#16a34a' : '#dc2626'};">$${formatNumber(balance)}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción y Tasa</th>
                <th>Monto (Equivalencia)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${movimientos.length === 0 ? '<tr><td colspan="3" style="text-align: center; color: #6b7280;">No hay movimientos para mostrar.</td></tr>' : ''}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await PrintModule.printToFileAsync({
      html,
      base64: false
    });

    const sanitizedLabel = dateFilter ? dateFilter.replace(/[^a-zA-Z0-9-]/g, '_') : 'General';
    const fileName = `Reporte_Finanzas_${sanitizedLabel}.pdf`;
    const newUri = `${FileSystemModule.cacheDirectory}${fileName}`;
    
    await FileSystemModule.copyAsync({ from: uri, to: newUri });

    await SharingModule.shareAsync(newUri, {
      mimeType: 'application/pdf',
      dialogTitle: fileName,
      UTI: 'com.adobe.pdf'
    });

    Toast.show({
      type: 'success',
      text1: 'PDF Generado',
      text2: 'El reporte financiero ha sido generado con éxito.'
    });

  } catch (error: any) {
    console.error('Error generando PDF de Finanzas:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'No se pudo generar el documento PDF.'
    });
  }
};
