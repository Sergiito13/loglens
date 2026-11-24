import type { NginxProblemGuide } from './types';

export const openFailedGuide: NginxProblemGuide = {
  title: 'open() failed',
  category: 'Sistema · archivos y rutas',
  summary: 'Nginx no pudo abrir un archivo o directorio.',
  description:
    'La operación open() devolvió un error. Puede deberse a un archivo inexistente, permisos, una ruta incorrecta u otra condición indicada por el código de error.',
  possibleCauses: [
    'El archivo o directorio solicitado no existe.',
    'La ruta configurada no coincide con la ruta real o con el volumen montado.',
    'Hay permisos insuficientes o el recurso tiene un tipo inesperado.',
  ],
  checks: [
    'Revisar la ruta exacta y el código de error del mensaje.',
    'Comprobar si el recurso existe y si los volúmenes están montados.',
    'Verificar permisos y configuración de las rutas utilizadas por Nginx.',
  ],
};
