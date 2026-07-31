import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { formatCurrencyATM } from '@core/utils/currency';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const generateNotaEntregaPdf = async (
  pedido: any,
  cliente: any,
  detalles: any[],
  numeroNota: string | number
) => {
  // Format the Note Number with leading zeros (e.g. 000166)
  const formattedNumber = String(numeroNota).padStart(6, '0');
  
  // Format Date (DD MM AAAA)
  // If order is delivered, use delivery date. Otherwise, use current date.
  let fechaObj = new Date();
  if (pedido.estado === 'entregado' && pedido.fecha_entrega) {
    fechaObj = new Date(pedido.fecha_entrega);
  }
  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const anio = fechaObj.getFullYear();

  // Create table rows for details
  let rowsHtml = '';
  detalles.forEach(item => {
    const precio = item.precio_unitario || 0;
    const totalItem = item.cantidad_solicitada * precio;
    rowsHtml += `
      <tr>
        <td class="center">${item.cantidad_solicitada}</td>
        <td>${item.nombre_item || 'Producto Genérico'}</td>
        <td class="right">${formatCurrencyATM(precio.toFixed(2))}</td>
        <td class="right">${formatCurrencyATM(totalItem.toFixed(2))}</td>
      </tr>
    `;
  });

  // Complete empty rows to make the table look full (say, up to 10 rows minimum)
  const emptyRows = 10 - detalles.length;
  for (let i = 0; i < emptyRows; i++) {
    rowsHtml += `
      <tr>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nota de Entrega Nº ${formattedNumber}</title>
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
        .doc-number {
          font-size: 22px;
          color: #cc0000;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .date-box {
          display: inline-block;
          border: 1px solid #ccc;
          padding: 5px 10px;
          font-size: 14px;
          border-radius: 4px;
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
          background-color: #f3f4f6;
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
          <p class="doc-title">NOTA DE ENTREGA</p>
          <p class="doc-number">Nº ${formattedNumber}</p>
          <div class="date-box">
            Lugar y Fecha: El Tocuyo, ${dia}/${mes}/${anio}
          </div>
        </div>
      </div>

      <div class="client-section">
        <div class="client-row">
          <div class="client-label">RAZÓN SOCIAL:</div>
          <div class="client-value">${cliente.razon_social || 'N/A'}</div>
        </div>
        <div class="client-row">
          <div class="client-label">DOMICILIO FISCAL:</div>
          <div class="client-value">N/A</div>
        </div>
        <div class="client-row">
          <div class="client-label">C.I / R.I.F:</div>
          <div class="client-value">${cliente.rif || cliente.cedula || 'N/A'}</div>
        </div>
        <div class="client-row">
          <div class="client-label">TELÉFONO:</div>
          <div class="client-value">${cliente.telefono || 'N/A'}</div>
        </div>
        <div class="client-row">
          <div class="client-label">CONDICIONES:</div>
          <div class="client-value">${pedido.estado_pago === 'pagado' ? 'CONTADO' : 'CRÉDITO'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="center" style="width: 10%;">CANT.</th>
            <th style="width: 50%;">DESCRIPCIÓN</th>
            <th class="right" style="width: 20%;">PRECIO UNIT. (USD)</th>
            <th class="right" style="width: 20%;">TOTAL (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div class="disclaimer-box">
          <div class="disclaimer-title">AVISO LEGAL IMPORTANTE</div>
          <div class="disclaimer-text">
            Este documento es una representación digital de la Nota de Entrega física original y ampara la entrega y recepción de la mercancía aquí descrita.<br><br>
            <strong>ESTE DOCUMENTO NO TIENE VALIDEZ FISCAL COMO FACTURA.</strong> Refleja fielmente los datos operacionales de la transacción de acuerdo a las normativas vigentes (República Bolivariana de Venezuela).
          </div>
        </div>

        <div class="totals-box">
          <div class="total-row">
            <span>Sub-Total:</span>
            <span>$ ${formatCurrencyATM(pedido.monto_total.toFixed(2))}</span>
          </div>
          <div class="total-row">
            <span>Monto Exento:</span>
            <span>$ ${formatCurrencyATM(pedido.monto_total.toFixed(2))}</span>
          </div>
          <div class="total-row">
            <span>TOTAL A PAGAR:</span>
            <span>$ ${formatCurrencyATM(pedido.monto_total.toFixed(2))}</span>
          </div>
        </div>
      </div>

    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    // Rename file to look professional
    const cleanClientName = (cliente.razon_social || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
    const newFileName = `Nota_de_Entrega_${formattedNumber}_${cleanClientName}.pdf`;
    const newUri = `${FileSystem.cacheDirectory}${newFileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri
    });

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartir Nota de Entrega' });
    }
    
    return true;
  } catch (error) {
    console.error('Error generando PDF de la Nota de Entrega:', error);
    return false;
  }
};
