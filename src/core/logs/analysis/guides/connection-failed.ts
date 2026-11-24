import type { NginxProblemGuide } from './types';

export const connectionFailedGuide: NginxProblemGuide = {
  title: 'connect() failed',
  category: 'Upstream · conexión',
  summary: 'Nginx no consiguió establecer una conexión con un destino.',
  description:
    'La operación de conexión falló. El código de error y la dirección upstream del registro ayudan a distinguir un rechazo, un problema de ruta u otra causa.',
  possibleCauses: [
    'El backend está detenido o no escucha en el puerto configurado.',
    'La dirección, el puerto o el socket del upstream son incorrectos.',
    'Hay una restricción de red, un cortafuegos o un problema de conectividad.',
  ],
  checks: [
    'Verificar que el servicio de destino está activo y escuchando.',
    'Contrastar la dirección y el puerto con la configuración de upstream.',
    'Comprobar conectividad y consultar los logs del servicio de destino.',
  ],
};
