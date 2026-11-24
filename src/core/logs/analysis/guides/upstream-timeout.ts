import type { NginxProblemGuide } from './types';

export const upstreamTimeoutGuide: NginxProblemGuide = {
  title: 'upstream timed out',
  category: 'Upstream · tiempos de espera',
  summary: 'Nginx agotó el tiempo de espera durante una operación con un servicio upstream.',
  description:
    'Una comunicación con el backend no finalizó dentro del límite de tiempo configurado. El mensaje original indica la operación concreta que agotó el plazo.',
  possibleCauses: [
    'El servicio upstream responde lentamente o está saturado.',
    'Existe latencia, pérdida de conectividad o una operación bloqueada.',
    'El límite de tiempo configurado es demasiado corto para una operación legítima.',
  ],
  checks: [
    'Revisar las métricas y los logs del backend en el momento de la incidencia.',
    'Comprobar conectividad y tiempos de respuesta entre Nginx y el upstream.',
    'Revisar los timeouts de Nginx aplicables antes de modificarlos.',
  ],
};
