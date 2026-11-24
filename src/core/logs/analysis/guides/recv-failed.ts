import type { NginxProblemGuide } from './types';

export const recvFailedGuide: NginxProblemGuide = {
  title: 'recv() failed',
  category: 'Red · recepción',
  summary: 'Falló la recepción de datos en una conexión de red.',
  description:
    'Una operación recv() terminó con error. El contexto del registro permite saber si ocurrió con un cliente o con un servicio upstream.',
  possibleCauses: [
    'El extremo remoto cerró o reinició la conexión.',
    'Se produjo un fallo transitorio de red.',
    'Un servicio upstream terminó la comunicación antes de lo esperado.',
  ],
  checks: [
    'Identificar el cliente o upstream y el código de error.',
    'Correlacionar el momento con los logs del servicio remoto.',
    'Revisar cortes de conexión, reinicios y métricas de red.',
  ],
};
