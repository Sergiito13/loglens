import type { NginxProblemId } from './nginxProblemPatterns';
import type { NginxProblemGuide } from './guides/types';
import { upstreamTimeoutGuide } from './guides/upstream-timeout';
import { connectionFailedGuide } from './guides/connection-failed';
import { permissionDeniedGuide } from './guides/permission-denied';
import { noLiveUpstreamsGuide } from './guides/no-live-upstreams';
import { openFailedGuide } from './guides/open-failed';
import { recvFailedGuide } from './guides/recv-failed';
import { sslHandshakeFailedGuide } from './guides/ssl-handshake-failed';
import { bodyTooLargeGuide } from './guides/body-too-large';

export type { NginxProblemGuide } from './guides/types';

/** Un archivo independiente por diagnóstico; cobertura de todos los patrones. */
export const NGINX_PROBLEM_GUIDES: Record<NginxProblemId, NginxProblemGuide> = {
  'upstream-timeout': upstreamTimeoutGuide,
  'connection-failed': connectionFailedGuide,
  'permission-denied': permissionDeniedGuide,
  'no-live-upstreams': noLiveUpstreamsGuide,
  'open-failed': openFailedGuide,
  'recv-failed': recvFailedGuide,
  'ssl-handshake-failed': sslHandshakeFailedGuide,
  'body-too-large': bodyTooLargeGuide,
};
