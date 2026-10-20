import React, { useEffect, useState } from 'react';
import '../styles/AyudaVideo.css';

const AyudaVideo = () => {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [abierto]);

  return (
    <>
      {!abierto && (
        <button
          type="button"
          className="ayuda-fab"
          onClick={() => setAbierto(true)}
          title="Ver cómo usar la aplicación"
        >
          🎬 Ayuda
        </button>
      )}

      {abierto && (
        <div
          className="ayuda-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAbierto(false);
          }}
        >
          <div
            className="ayuda-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Cómo usar la aplicación"
          >
            <div className="ayuda-header">
              <h3>🎬 ¿Cómo usar SRE?</h3>
              <button
                type="button"
                className="ayuda-cerrar"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="ayuda-body">
              <video
                className="ayuda-video"
                src="/videos/video.mp4"
                controls
                autoPlay
                playsInline
                preload="metadata"
              >
                Tu navegador no soporta la reproducción de video.
              </video>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AyudaVideo;
