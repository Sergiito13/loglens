import type { NginxProblemGuide } from './types';

export const permissionDeniedGuide: NginxProblemGuide = {
  title: 'permission denied',
  category: 'Sistema · permisos',
  summary: 'Una operación fue rechazada por falta de permisos.',
  description:
    'Nginx o uno de sus procesos intentó acceder a un recurso y el sistema operativo denegó la operación. El recurso y el código del mensaje son esenciales para determinar la causa.',
  possibleCauses: [
    'Permisos o propietario incorrectos en archivos, directorios o sockets.',
    'El usuario del proceso Nginx no tiene el acceso necesario.',
    'Una política de seguridad del sistema, como SELinux o AppArmor, restringe el acceso.',
  ],
  checks: [
    'Identificar el recurso exacto mencionado en el registro.',
    'Comprobar usuario del proceso, permisos y permisos de directorios superiores.',
    'Revisar las políticas y auditorías de seguridad si están habilitadas.',
  ],
};
