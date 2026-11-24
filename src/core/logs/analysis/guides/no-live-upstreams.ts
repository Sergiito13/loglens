import type { NginxProblemGuide } from './types';

export const noLiveUpstreamsGuide: NginxProblemGuide = {
  title: 'no live upstreams',
  category: 'Upstream · disponibilidad',
  summary: 'Nginx no encontró servidores upstream disponibles para atender la solicitud.',
  description:
    'Los destinos del grupo upstream no estaban disponibles según el estado que mantenía Nginx en ese momento.',
  possibleCauses: [
    'Los backends están caídos o no responden.',
    'Se han acumulado fallos que marcan temporalmente los destinos como no disponibles.',
    'La configuración del grupo upstream no corresponde a los servicios activos.',
  ],
  checks: [
    'Revisar el estado y los logs de cada backend del grupo.',
    'Comprobar direcciones, puertos y políticas de fallos del upstream.',
    'Buscar mensajes anteriores que expliquen por qué se descartaron los destinos.',
  ],
};
