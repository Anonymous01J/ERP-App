export function formatCurrencyATM(val: string): string {
  if (!val) return '';
  // Eliminar todo lo que no sea número
  let valueUser = val.replace(/[^0-9]/g, "");
  // Quitar ceros a la izquierda, excepto si es el único dígito
  valueUser = valueUser.replace(/^0+/, "");
  if (valueUser === "") valueUser = "0";

  let valueLength = valueUser.length;
  let formatted = "";

  if (valueLength <= 2) {
    // Si tiene 1 o 2 dígitos, va después de la coma con ceros a la izquierda
    formatted = "0," + valueUser.padStart(2, '0');
  } else {
    // Si tiene más de 2 dígitos, separamos decimales y enteros
    let integerPart = valueUser.slice(0, valueLength - 2);
    let decimalPart = valueUser.slice(valueLength - 2);
    
    // Agregamos puntos de miles a la parte entera
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    formatted = integerPart + "," + decimalPart;
  }
  return formatted;
}

export function parseCurrency(val: string): number {
  if (!val) return 0;
  // Convertimos "12.345,67" a "12345.67"
  const cleanStr = val.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}
