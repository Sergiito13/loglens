import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { formatFileSize } from '../../core/utils/formatFileSize';

import './UploadScreen.css';

type StepIconType = 'file' | 'search' | 'chart';

interface UploadStep {
  id: number;
  title: string;
  description: string;
  icon: StepIconType;
}

function StepIcon({ type }: { type: StepIconType }) {
  if (type === 'file') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </svg>
    );
  }

  if (type === 'search') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 20v-6" />
      <path d="M12 20V5" />
      <path d="M19 20v-10" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <div className="ll-upload-symbol">
      <div className="ll-upload-ring ll-upload-ring--outer" />
      <div className="ll-upload-ring ll-upload-ring--middle" />
      <div className="ll-upload-ring ll-upload-ring--inner" />

      <div className="ll-upload-icon">
        <svg
          width="84"
          height="84"
          viewBox="0 0 24 24"
          fill="none"
          stroke="url(#ll-upload-gradient)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="ll-upload-gradient"
              x1="0"
              y1="24"
              x2="24"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#8B35F5" />
              <stop offset="50%" stopColor="#F51A83" />
              <stop offset="100%" stopColor="#FF914D" />
            </linearGradient>
          </defs>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </svg>
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

const uploadSteps: UploadStep[] = [
  {
    id: 1,
    title: 'Carga logs',
    description: 'Arrastra tus archivos o selecciónalos',
    icon: 'file',
  },
  {
    id: 2,
    title: 'Analizamos',
    description: 'Detectamos eventos, errores y patrones',
    icon: 'search',
  },
  {
    id: 3,
    title: 'Explora resultados',
    description: 'Visualiza, filtra y exporta la información',
    icon: 'chart',
  },
];

export function UploadScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(selectedFile: File) {
    setError(null);
    setFile(null);

    const fileName = selectedFile.name.toLowerCase();

    if (!fileName.endsWith('.log') && !fileName.endsWith('.txt')) {
      setError('Solo se permiten archivos con extensión .log o .txt.');
      return;
    }

    if (selectedFile.size === 0) {
      setError('El archivo seleccionado está vacío.');
      return;
    }

    setFile(selectedFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
    event.target.value = '';
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = event.dataTransfer.files;

    if (files.length !== 1) {
      setFile(null);
      setError('Selecciona un único archivo de log.');
      return;
    }

    handleFile(files[0]);
  }

  function removeFile() {
    setFile(null);
    setError(null);
  }

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background px-5 pb-8 pt-6 text-text-primary sm:px-8">
      <AmbientBackground />

      {/* Official logo: stronger shimmer on hover, reload on click. */}
      <header className="ll-upload-header relative z-10 text-center">
        <h1 className="flex items-center justify-center">
          <a href="/" className="ll-brand" aria-label="Volver al inicio de LogLens">
            <img
              src="/LogLens_loglens-horizontal.svg"
              alt="LogLens"
              className="ll-brand__image h-14 w-auto sm:h-16"
            />
          </a>
        </h1>

        <p className="ll-upload-subtitle mt-3 text-sm sm:text-base">
          Analiza tus logs de forma rápida y visual
        </p>
      </header>

      <section
        aria-label="Importar archivo de log"
        className="relative z-10 mx-auto mt-7 w-full max-w-[1450px]"
      >
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`ll-dropzone ${isDragging ? 'll-dropzone--active' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".log,.txt"
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
            aria-label="Seleccionar archivo de log"
          />

          {!file ? (
            <div className="ll-upload-content">
              <UploadIcon />

              <h2 className="ll-upload-title">Arrastra tu archivo de log aquí</h2>
              <p className="ll-upload-description">o selecciona un archivo</p>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="ll-upload-button"
              >
                <FolderIcon />
                <span>Seleccionar archivo</span>
              </button>

              <p className="ll-upload-formats">Archivos .log y .txt · Nginx Error Log</p>
              <p className="ll-upload-privacy">Tu archivo permanece en el navegador</p>

              {isDragging && (
                <div className="ll-dropzone-message" aria-hidden="true">
                  Suelta el archivo para importarlo
                </div>
              )}
            </div>
          ) : (
            <div className="ll-upload-content" aria-live="polite">
              <div className="ll-selected-icon">
                <StepIcon type="file" />
              </div>

              <h2 className="ll-upload-title">Archivo seleccionado</h2>

              <div className="ll-file-card">
                <div className="ll-file-card__icon">
                  <StepIcon type="file" />
                </div>

                <div className="ll-file-card__details">
                  <p className="ll-file-card__name">{file.name}</p>
                  <p className="ll-file-card__size">{formatFileSize(file.size)}</p>
                </div>

                <div className="ll-file-card__status" aria-label="Seleccionado">
                  ✓
                </div>
              </div>

              <p className="ll-file-success">Archivo seleccionado correctamente</p>

              <div className="ll-file-actions">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="ll-upload-button"
                >
                  <FolderIcon />
                  <span>Cambiar archivo</span>
                </button>

                <button type="button" onClick={removeFile} className="ll-remove-button">
                  Quitar archivo
                </button>
              </div>

              <p className="ll-upload-privacy">
                El análisis estará disponible en la siguiente fase.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="ll-upload-error">
              {error}
            </p>
          )}
        </div>
      </section>

      <section
        aria-label="Cómo funciona LogLens"
        className="ll-upload-steps relative z-10 mx-auto mt-7 w-full max-w-[1150px]"
      >
        {uploadSteps.map((step) => (
          <div key={step.id} className="ll-upload-step">
            <div className={`ll-upload-step__icon ll-upload-step__icon--${step.icon}`}>
              <StepIcon type={step.icon} />
            </div>

            <div className="ll-upload-step__content">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
