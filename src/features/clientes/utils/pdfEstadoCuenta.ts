import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { formatCurrencyATM } from '@core/utils/currency';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const generateEstadoCuentaPdf = async (
  cliente: any,
  pedidos: any[],
  abonos: any[]
) => {
  // Consolidar y ordenar transacciones por fecha
  const transacciones: any[] = [];

  pedidos.forEach(p => {
    transacciones.push({
      fecha: new Date(p.fecha_creacion).getTime(),
      fechaStr: p.fecha_creacion,
      descripcion: `Factura / Pedido Nº ${p.nota_entrega_numero || p.id.substring(0, 6)}`,
      cargo: p.monto_total || 0,
      abono: 0,
    });
  });

  abonos.forEach(a => {
    transacciones.push({
      fecha: new Date(a.fecha_pago).getTime(),
      fechaStr: a.fecha_pago,
      descripcion: `Abono/Pago`,
      cargo: 0,
      abono: a.monto_equivalente_usd || 0,
    });
  });

  // Sort ascending by date
  transacciones.sort((a, b) => a.fecha - b.fecha);

  // Calculate cumulative balance
  let saldoActual = 0;
  let totalCargos = 0;
  let totalAbonos = 0;

  transacciones.forEach(t => {
    totalCargos += t.cargo;
    totalAbonos += t.abono;
    saldoActual += (t.cargo - t.abono);
    t.saldo = saldoActual;
  });

  let fechaHoy = new Date();
  const dia = String(fechaHoy.getDate()).padStart(2, '0');
  const mes = String(fechaHoy.getMonth() + 1).padStart(2, '0');
  const anio = fechaHoy.getFullYear();

  let rowsHtml = '';
  transacciones.forEach(t => {
    const d = new Date(t.fechaStr);
    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    
    rowsHtml += `
      <tr>
        <td class="center">${dateFormatted}</td>
        <td>${t.descripcion}</td>
        <td class="right">${t.cargo > 0 ? formatCurrencyATM(t.cargo.toFixed(2)) : ''}</td>
        <td class="right" style="color: #16a34a;">${t.abono > 0 ? formatCurrencyATM(t.abono.toFixed(2)) : ''}</td>
        <td class="right"><strong>${formatCurrencyATM(Math.max(t.saldo, 0).toFixed(2))}</strong></td>
      </tr>
    `;
  });

  if (transacciones.length === 0) {
    rowsHtml += `
      <tr>
        <td colspan="5" class="center" style="color: #888;">No hay transacciones registradas.</td>
      </tr>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Estado de Cuenta - ${cliente.razon_social}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          margin: 0;
          padding: 40px;
          background-color: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          border-bottom: 2px solid #003366;
          padding-bottom: 15px;
        }
        .company-info {
          flex: 2;
        }
        .company-name {
          color: #003366;
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 5px 0;
        }
        .company-details {
          font-size: 12px;
          line-height: 1.4;
          color: #555;
        }
        .doc-info {
          flex: 1;
          text-align: right;
        }
        .doc-title {
          font-size: 20px;
          color: #003366;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0 0 10px 0;
        }
        .date-box {
          display: inline-block;
          border: 1px solid #ccc;
          padding: 5px 10px;
          font-size: 14px;
          border-radius: 4px;
          margin-top: 10px;
        }
        
        .client-section {
          margin-bottom: 30px;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 15px;
          background-color: #f9fafb;
        }
        .client-row {
          display: flex;
          margin-bottom: 10px;
        }
        .client-row:last-child {
          margin-bottom: 0;
        }
        .client-label {
          font-weight: bold;
          width: 130px;
          font-size: 13px;
          color: #003366;
        }
        .client-value {
          flex: 1;
          font-size: 14px;
          border-bottom: 1px dashed #ccc;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #003366;
          color: #fff;
          font-size: 13px;
          padding: 10px;
          text-align: left;
        }
        th.center, td.center { text-align: center; }
        th.right, td.right { text-align: right; }
        
        td {
          padding: 10px;
          border-bottom: 1px solid #eee;
          border-left: 1px solid #eee;
          border-right: 1px solid #eee;
          font-size: 14px;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        .disclaimer-box {
          flex: 1.5;
          padding: 15px;
          border: 1px dashed #999;
          background-color: #fff8eb;
          border-radius: 6px;
          margin-right: 20px;
        }
        .disclaimer-title {
          font-weight: bold;
          color: #b45309;
          margin-bottom: 5px;
          font-size: 14px;
        }
        .disclaimer-text {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
        .totals-box {
          flex: 1;
          border: 1px solid #ccc;
          border-radius: 6px;
          overflow: hidden;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 15px;
          border-bottom: 1px solid #eee;
        }
        .total-row:last-child {
          border-bottom: none;
          background-color: ${saldoActual > 0 ? '#fee2e2' : '#dcfce7'};
          color: ${saldoActual > 0 ? '#991b1b' : '#166534'};
          font-weight: bold;
          font-size: 16px;
        }
      </style>
    </head>
    <body>

      <div class="header">
        <div class="company-info">
          <p class="company-name">EMPRENDIMIENTO JESÚS GALÍNDEZ</p>
          <p class="company-details">
            RIF: J-505775898<br>
            Carrera 1 entre Calles 1 y 2 - Local Nro. S/N<br>
            Urb. San Valentín - El Tocuyo, Edo. Lara, Zona Postal 3018
          </p>
        </div>
        <div class="doc-info">
          <p class="doc-title">ESTADO DE CUENTA</p>
          <div class="date-box">
            Generado: ${dia}/${mes}/${anio}
          </div>
        </div>
      </div>

      <div class="client-section">
        <div class="client-row">
          <div class="client-label">RAZÓN SOCIAL:</div>
          <div class="client-value">${cliente.razon_social || 'N/A'}</div>
        </div>
        <div class="client-row">
          <div class="client-label">C.I / R.I.F:</div>
          <div class="client-value">${cliente.rif || cliente.cedula || 'N/A'}</div>
        </div>
        <div class="client-row">
          <div class="client-label">TELÉFONO:</div>
          <div class="client-value">${cliente.telefono || 'N/A'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="center" style="width: 15%;">FECHA</th>
            <th style="width: 40%;">DESCRIPCIÓN</th>
            <th class="right" style="width: 15%;">CARGOS (USD)</th>
            <th class="right" style="width: 15%;">ABONOS (USD)</th>
            <th class="right" style="width: 15%;">SALDO (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div class="disclaimer-box">
          <div class="disclaimer-title">NOTA IMPORTANTE</div>
          <div class="disclaimer-text">
            Este documento refleja el historial de movimientos a la fecha de su emisión. 
            No tiene validez fiscal. Para cualquier duda o aclaratoria, por favor contactar a la administración.
          </div>
        </div>
        
        <div class="totals-box">
          <div class="total-row">
            <span>Total Cargos:</span>
            <span>$${formatCurrencyATM(totalCargos.toFixed(2))}</span>
          </div>
          <div class="total-row">
            <span>Total Abonos:</span>
            <span>$${formatCurrencyATM(totalAbonos.toFixed(2))}</span>
          </div>
          <div class="total-row">
            <span>SALDO PENDIENTE:</span>
            <span>$${formatCurrencyATM(Math.max(saldoActual, 0).toFixed(2))}</span>
          </div>
        </div>
      </div>

    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const nombreArchivo = `EdoCuenta_${cliente.razon_social.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      const documentDir = FileSystem.documentDirectory;
      if (!documentDir) throw new Error('Directorio no encontrado');
      
      const newUri = documentDir + nombreArchivo;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      await shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } else {
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error('Error generando PDF de Estado de Cuenta:', error);
    throw error;
  }
};
