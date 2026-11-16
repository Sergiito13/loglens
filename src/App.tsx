import { useState } from 'react';

import type { LogProcessingResult } from './core/logs/processing/types';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { ProcessingScreen } from './features/processing/ProcessingScreen';
import { UploadScreen } from './features/upload/UploadScreen';

type AppView =
  | { screen: 'upload' }
  | { screen: 'processing'; file: File }
  | { screen: 'dashboard'; file: File; result: LogProcessingResult };

export default function App() {
  const [view, setView] = useState<AppView>({ screen: 'upload' });

  if (view.screen === 'processing') {
    const file = view.file;
    return (
      <ProcessingScreen
        file={file}
        onBack={() => setView({ screen: 'upload' })}
        onComplete={(result) => setView({ screen: 'dashboard', file, result })}
      />
    );
  }

  if (view.screen === 'dashboard') {
    return (
      <DashboardScreen
        file={view.file}
        result={view.result}
        onNewFile={() => setView({ screen: 'upload' })}
      />
    );
  }

  return <UploadScreen onAnalyze={(file) => setView({ screen: 'processing', file })} />;
}
