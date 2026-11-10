import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { formatFileSize } from '../../core/utils/formatFileSize';

export function UploadScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validar el archivo seleccionado
  function handleFile(selectedFile: File) {
    setError(null);
    setFile(null);

    const fileName = selectedFile.name.toLowerCase();

    if (!fileName.endsWith('.log') && !fileName.endsWith('.txt')) {
      setError('Solo se permiten archivos con extensión .log o .txt');
      return;
    }

    if (selectedFile.size === 0) {
      setError('El archivo seleccionado está vacío.');
      return;
    }

    setFile(selectedFile);
  }

  // Selección desde el explorador
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      handleFile(selectedFile);
    }

    event.target.value = '';
  }

  // Entrada de un archivo en la zona de arrastre
  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    dragCounter.current += 1;
    setIsDragging(true);
  }

  // Archivo moviéndose sobre la zona
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  // Salida de la zona de arrastre
  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    dragCounter.current = Math.max(0, dragCounter.current - 1);

    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }

  // Archivo soltado
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    dragCounter.current = 0;
    setIsDragging(false);

    const files = event.dataTransfer.files;

    if (files.length !== 1) {
      setError('Selecciona un único archivo de log.');
      return;
    }

    handleFile(files[0]);
  }

  // Eliminar archivo seleccionado
  function removeFile() {
    setFile(null);
    setError(null);
  }

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background px-5 py-7 text-text-primary">
      {/* ==========================================
          FONDO ORIGINAL LOGLENS
      ========================================== */}

      <AmbientBackground />

      {/* ==========================================
          CABECERA
      ========================================== */}

      <header className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-4">
          {/* Logotipo provisional */}
          <div className="flex items-end gap-1" aria-hidden="true">
            <span className="h-7 w-3 rounded-full bg-gradient-to-t from-violet-600 to-pink-500" />

            <span className="h-12 w-3 rounded-full bg-gradient-to-t from-pink-500 to-orange-400" />

            <span className="h-8 w-3 rounded-full bg-gradient-to-t from-violet-600 to-yellow-400" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">LogLens</h1>
        </div>

        <p className="mt-3 text-sm text-text-secondary sm:text-base">
          Analiza tus logs de forma rápida y visual
        </p>
      </header>

      {/* ==========================================
          ZONA PRINCIPAL DE IMPORTACIÓN
      ========================================== */}

      <section className="relative z-10 mx-auto mt-8 w-full max-w-[1450px]">
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex min-h-[430px] flex-col
            items-center justify-center
            rounded-3xl border-2 border-dashed
            p-6 text-center backdrop-blur-sm
            transition-all duration-200
            sm:min-h-[470px] sm:p-10
            ${
              isDragging
                ? 'border-pink-500 bg-violet-600/20 shadow-[0_0_65px_rgba(245,26,131,0.18)]'
                : 'border-violet-500/50 bg-[#0c1232]/65'
            }
          `}
        >
          {/* Selector oculto */}
          <input
            ref={inputRef}
            type="file"
            accept=".log,.txt"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Seleccionar archivo de log"
          />

          {/* ======================================
              SIN ARCHIVO SELECCIONADO
          ====================================== */}

          {!file ? (
            <>
              {/* Icono principal */}
              <div className="relative mb-7 flex items-center justify-center">
                {/* Halo decorativo */}
                <div className="pointer-events-none absolute h-36 w-36 rounded-full bg-violet-600/15 blur-3xl" />

                <div className="relative rounded-3xl bg-violet-600/10 p-7">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="url(#uploadFileGradient)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="uploadFileGradient" x1="0" y1="24" x2="24" y2="0">
                        <stop offset="0%" stopColor="#8B35F5" />
                        <stop offset="50%" stopColor="#F51A83" />
                        <stop offset="100%" stopColor="#FF914D" />
                      </linearGradient>
                    </defs>

                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

                    <path d="M14 2v6h6" />

                    <path d="M8 13h8M8 17h6" />
                  </svg>
                </div>
              </div>

              {/* Título */}
              <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
                Arrastra tu archivo de log aquí
              </h2>

              <p className="mt-3 text-lg font-medium text-fuchsia-400 sm:text-xl">
                o selecciona un archivo
              </p>

              {/* Botón principal */}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="
                  mt-7 cursor-pointer rounded-xl
                  bg-gradient-to-r from-violet-600
                  via-pink-500 to-orange-400
                  px-10 py-4 text-base font-semibold
                  text-white shadow-lg
                  shadow-fuchsia-600/15
                  transition-all duration-200
                  hover:scale-[1.03]
                  hover:shadow-fuchsia-500/30
                  focus-visible:outline-2
                  focus-visible:outline-offset-4
                  focus-visible:outline-pink-400
                "
              >
                Seleccionar archivo
              </button>

              {/* Información */}
              <p className="mt-6 text-sm text-text-secondary sm:text-base">
                Archivos .log y .txt · Nginx Error Log
              </p>

              <p className="mt-2 text-sm text-text-secondary">
                Tu archivo permanece en el navegador
              </p>
            </>
          ) : (
            /* ======================================
                ARCHIVO SELECCIONADO
            ====================================== */

            <>
              <div className="mb-6 rounded-2xl bg-violet-500/10 p-5">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

                  <path d="M14 2v6h6" />

                  <path d="M8 13h8M8 17h6" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">Archivo seleccionado</h2>

              {/* Tarjeta del archivo */}
              <div
                aria-live="polite"
                className="
                  mt-6 w-full max-w-lg rounded-2xl
                  border border-violet-500/30
                  bg-surface/80 p-7
                "
              >
                <p className="break-all text-lg font-semibold">{file.name}</p>

                <p className="mt-3 text-base text-text-secondary">{formatFileSize(file.size)}</p>

                <div className="mt-5 flex items-center justify-center gap-2 text-sm text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Archivo seleccionado correctamente
                </div>
              </div>

              {/* Quitar archivo */}
              <button
                type="button"
                onClick={removeFile}
                className="
                  mt-6 cursor-pointer rounded-xl
                  border border-violet-500/50
                  px-7 py-3 font-medium
                  transition-colors
                  hover:bg-violet-500/15
                "
              >
                Quitar archivo
              </button>

              <p className="mt-5 text-sm text-text-secondary">
                El análisis estará disponible en la siguiente fase.
              </p>
            </>
          )}

          {/* ======================================
              MENSAJES DE ERROR
          ====================================== */}

          {error && (
            <p
              role="alert"
              className="
                mt-5 rounded-lg border border-red-500/30
                bg-red-500/10 px-5 py-3
                text-sm text-red-300
              "
            >
              {error}
            </p>
          )}
        </div>
      </section>

      {/* ==========================================
          PASOS DE FUNCIONAMIENTO
      ========================================== */}

      <footer className="relative z-10 mx-auto mt-7 grid w-full max-w-[1150px] gap-5 pb-4 md:grid-cols-3">
        {[
          {
            number: '01',
            title: 'Carga logs',
            description: 'Arrastra o selecciona tus archivos',
          },
          {
            number: '02',
            title: 'Analizamos',
            description: 'Detectamos eventos y patrones',
          },
          {
            number: '03',
            title: 'Explora resultados',
            description: 'Visualiza y filtra la información',
          },
        ].map((step) => (
          <div
            key={step.number}
            className="
              flex items-center gap-5
              rounded-xl p-2
            "
          >
            {/* Número */}
            <span
              className="
                flex h-16 w-16 shrink-0
                items-center justify-center
                rounded-2xl border
                border-violet-500/30
                bg-violet-500/15
                text-xl font-bold
                text-fuchsia-400
              "
            >
              {step.number}
            </span>

            {/* Texto */}
            <div>
              <h3 className="text-lg font-semibold">{step.title}</h3>

              <p className="mt-1 text-sm leading-relaxed text-text-secondary sm:text-base">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </footer>
    </main>
  );
}