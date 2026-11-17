import { useEffect, useState } from 'react';

import type { LogProcessingResult } from './core/logs/processing/types';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { ProcessingScreen } from './features/processing/ProcessingScreen';
import { UploadScreen } from './features/upload/UploadScreen';

/**
 * Retrasa la aparicion de la pantalla de progreso, NO el analisis.
 * Si el Worker termina antes, se abre el dashboard directamente.
 */
const PROGRESS_REVEAL_DELAY_MS = 300;

type AppView =
  | { screen: 'upload' }
  | { screen: 'processing'; file: File }
  | { screen: 'dashboard'; file: File; result: LogProcessingResult };

export default function App() {
  const [view, setView] = useState<AppView>({ screen: 'upload' });
  const [showProcessing, setShowProcessing] = useState(false);

  useEffect(() => {
    if (view.screen !== 'processing') return;

    const timer = window.setTimeout(() => {
      setShowProcessing(true);
    }, PROGRESS_REVEAL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [view]);

  if (view.screen === 'dashboard') {
    return (
      <DashboardScreen
        file={view.file}
        result={view.result}
        onNewFile={() => setView({ screen: 'upload' })}
      />
    );
  }

  const processingFile = view.screen === 'processing' ? view.file : null;
  const processing = processingFile !== null;
  const showUpload = !processing || !showProcessing;

  return (
    <>
      {/* Mantener UploadScreen montado durante los primeros 300 ms
          evita el parpadeo y conserva el archivo seleccionado. */}
      <div
        style={{ display: showUpload ? 'block' : 'none' }}
        aria-busy={processing && !showProcessing}
      >
        <div style={{ pointerEvents: processing ? 'none' : 'auto' }}>
          <UploadScreen
            onAnalyze={(file) => {
              if (processing) return;
              setShowProcessing(false);
              setView({ screen: 'processing', file });
            }}
          />
        </div>
      </div>

      {/* El Worker se ejecuta aunque su vista aun este oculta.
          Para archivos grandes, la pantalla aparece tras 300 ms. */}
      {processingFile && (
        <div style={{ display: showProcessing ? 'block' : 'none' }}>
          <ProcessingScreen
            file={processingFile}
            onBack={() => setView({ screen: 'upload' })}
            onComplete={(result) =>
              setView({ screen: 'dashboard', file: processingFile, result })
            }
          />
        </div>
      )}
    </>
  );
}
