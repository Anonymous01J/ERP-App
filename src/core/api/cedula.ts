export interface CedulaData {
  nacionalidad: string;
  cedula: string;
  rif?: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  cne?: {
    estado: string;
    municipio: string;
    parroquia: string;
    centro_electoral: string;
  };
  request_date: string;
}

export interface CedulaResponse {
  error: boolean;
  error_str: string | false;
  data?: CedulaData;
}

export const consultarCedula = async (nacionalidad: string, numero: string): Promise<CedulaData | null> => {
  try {
    const appId = process.env.EXPO_PUBLIC_CEDULA_APP_ID;
    const token = process.env.EXPO_PUBLIC_CEDULA_TOKEN;

    if (!appId || !token) {
      console.warn('API de Cédula: Faltan credenciales en el .env');
      return null;
    }

    const url = `https://api.cedula.com.ve/api/v1?app_id=${appId}&token=${token}&nacionalidad=${nacionalidad}&cedula=${numero}`;
    
    const response = await fetch(url);
    const result: CedulaResponse = await response.json();

    if (result.error) {
      console.warn('Error de API Cédula:', result.error_str);
      throw new Error(result.error_str || 'Error desconocido al consultar cédula');
    }

    return result.data || null;
  } catch (error: any) {
    console.error('consultarCedula error:', error);
    throw error;
  }
};
