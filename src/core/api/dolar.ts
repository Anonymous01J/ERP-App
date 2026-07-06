// src/core/api/dolar.ts

export interface TasaCambioResponse {
  moneda: string;
  nombre: string;
  promedio: number;
  fechaActualizacion: string;
  fuente?: string;
}

const API_BASE_URL = 'https://ve.dolarapi.com/v1';

export async function getTasaDolarBCV(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/dolares`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: TasaCambioResponse[] = await response.json();
    const oficial = data.find(d => d.fuente === 'oficial');
    return oficial ? oficial.promedio : 0;
  } catch (error) {
    console.error('Error fetching Dolar BCV:', error);
    throw new Error('No se pudo obtener la tasa del Dólar BCV.');
  }
}

export async function getTasaEuroBCV(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/euros`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: TasaCambioResponse[] = await response.json();
    const oficial = data.find(d => d.fuente === 'oficial');
    return oficial ? oficial.promedio : 0;
  } catch (error) {
    console.error('Error fetching Euro BCV:', error);
    throw new Error('No se pudo obtener la tasa del Euro BCV.');
  }
}
