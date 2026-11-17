import type { DashboardProps } from './types';

import { NginxErrorDashboard } from './formats/nginx-error/NginxErrorDashboard';

import './DashboardScreen.css';

/**
 * Selecciona el dashboard correspondiente
 * al formato detectado por LogLens.
 */
export function DashboardScreen(props: DashboardProps) {
  switch (props.result.format) {
    case 'nginx-error':
      return <NginxErrorDashboard {...props} />;

    default:
      return (
        <main className="ll-dash-page">
          <div className="ll-dash-container">
            <h1>Formato sin dashboard</h1>

            <p>El formato {props.result.format} todavía no tiene una vista de resultados.</p>

            <button className="ll-dash-new" type="button" onClick={props.onNewFile}>
              Importar otro archivo
            </button>
          </div>
        </main>
      );
  }
}
