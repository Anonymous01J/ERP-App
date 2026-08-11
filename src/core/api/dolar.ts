// src/core/api/dolar.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const tasa = oficial ? oficial.promedio : 0;
    if (tasa > 0) {
      await AsyncStorage.setItem('TASA_DOLAR_BCV_CACHE', tasa.toString());
    }
    return tasa;
  } catch (error) {
    console.warn('Error fetching Dolar BCV, intentando usar caché local:', error);
    try {
      const cached = await AsyncStorage.getItem('TASA_DOLAR_BCV_CACHE');
      if (cached) return parseFloat(cached);
    } catch (e) {
      console.error('Error leyendo caché Tasa Dolar:', e);
    }
    throw new Error('No se pudo obtener la tasa del Dólar BCV y no hay caché disponible.');
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
    const tasa = oficial ? oficial.promedio : 0;
    if (tasa > 0) {
      await AsyncStorage.setItem('TASA_EURO_BCV_CACHE', tasa.toString());
    }
    return tasa;
  } catch (error) {
    console.warn('Error fetching Euro BCV, intentando usar caché local:', error);
    try {
      const cached = await AsyncStorage.getItem('TASA_EURO_BCV_CACHE');
      if (cached) return parseFloat(cached);
    } catch (e) {
      console.error('Error leyendo caché Tasa Euro:', e);
    }
    throw new Error('No se pudo obtener la tasa del Euro BCV y no hay caché disponible.');
  }
}
