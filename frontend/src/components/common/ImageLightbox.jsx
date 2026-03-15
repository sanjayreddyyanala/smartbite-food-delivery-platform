import { useEffect } from 'react';

/**
 * Full-screen image lightbox overlay.
 * @param {{ imageUrl: string, images?: string[], onClose: () => void, onNavigate?: (url: string) => void }} props
 * - imageUrl: currently displayed image
 * - images: optional array for gallery navigation (prev/next arrows + keyboard)
 * - onClose: close callback
 * - onNavigate: callback to switch to a different image in the gallery
 */
const ImageLightbox = ({ imageUrl, images = [], onClose, onNavigate }) => {
  const hasNav = images.length > 1 && onNavigate;
  const currentIdx = images.indexOf(imageUrl);
  const total = images.length;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (hasNav && e.key === 'ArrowLeft') onNavigate(images[(currentIdx - 1 + total) % total]);
      if (hasNav && e.key === 'ArrowRight') onNavigate(images[(currentIdx + 1) % total]);
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [imageUrl, images, currentIdx, total, onClose, onNavigate, hasNav]);

  const arrowBtn = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: '44px', height: '44px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
    cursor: 'pointer', fontSize: '1.4rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)', transition: 'background 0.2s',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '1.25rem', right: '1.25rem',
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: '1.3rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
        }}
      >
        ✕
      </button>

      {/* Counter */}
      {hasNav && (
        <div style={{
          position: 'absolute', top: '1.25rem', left: '50%', transform: 'translateX(-50%)',
          padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
          background: 'rgba(255,255,255,0.15)', color: '#fff', zIndex: 10000,
        }}>
          {currentIdx + 1} / {total}
        </div>
      )}

      {/* Prev */}
      {hasNav && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(images[(currentIdx - 1 + total) % total]); }}
          style={{ ...arrowBtn, left: '1rem' }}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      {/* Image */}
      <img
        src={imageUrl}
        alt="Enlarged view"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '85vh',
          borderRadius: '0.75rem', objectFit: 'contain',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      />

      {/* Next */}
      {hasNav && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(images[(currentIdx + 1) % total]); }}
          style={{ ...arrowBtn, right: '1rem' }}
          aria-label="Next image"
        >
          ›
        </button>
      )}
    </div>
  );
};

export default ImageLightbox;
