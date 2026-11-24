import type { NginxProblemGuide } from './types';

export const sslHandshakeFailedGuide: NginxProblemGuide = {
  title: 'SSL_do_handshake() failed',
  category: 'Seguridad · TLS',
  summary: 'No se completó una negociación TLS.',
  description:
    'La conexión cifrada falló durante el handshake. El error específico de la biblioteca SSL ayuda a determinar si hay incompatibilidad de parámetros, un problema del cliente u otra causa.',
  possibleCauses: [
    'Incompatibilidad de versiones TLS o suites criptográficas.',
    'Parámetros enviados por el cliente que no pueden negociarse.',
    'Configuración de certificados o del extremo TLS que requiere revisión.',
  ],
  checks: [
    'Leer el mensaje SSL completo y comprobar si el fallo se repite por cliente.',
    'Revisar configuración TLS, protocolos y certificados aplicables.',
    'Correlacionar los errores con cambios de configuración o despliegues.',
  ],
};
