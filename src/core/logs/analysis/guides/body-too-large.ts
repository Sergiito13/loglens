import type { NginxProblemGuide } from './types';

export const bodyTooLargeGuide: NginxProblemGuide = {
  title: 'client intended to send too large body',
  category: 'HTTP · límites de solicitud',
  summary: 'El cuerpo de una petición superó el tamaño permitido.',
  description:
    'Nginx rechazó o limitó una petición porque su cuerpo excedía el límite configurado, habitualmente asociado a client_max_body_size.',
  possibleCauses: [
    'Se intenta subir un archivo mayor que el límite admitido.',
    'La configuración del tamaño máximo no se ajusta al uso previsto.',
    'Un cliente envía cuerpos excesivos o solicitudes no esperadas.',
  ],
  checks: [
    'Revisar la ruta, el cliente y el tamaño indicado en el mensaje.',
    'Comprobar client_max_body_size en el contexto de configuración correspondiente.',
    'Aumentar los límites solo si el caso de uso y las medidas de seguridad lo justifican.',
  ],
};
