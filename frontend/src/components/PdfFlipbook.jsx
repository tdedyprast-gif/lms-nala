import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { BookOpen, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { API_BASE } from '../lib/constants';

pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.mjs`;

export function resolvePdfUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const origin = (process.env.REACT_APP_BACKEND_URL || API_BASE.replace(/\/api$/, '')).replace(/\/$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

const PageSheet = React.forwardRef(function PageSheet({ pageNumber, width }, ref) {
  return (
    <div className="flip-page" ref={ref}>
      <Page
        pageNumber={pageNumber}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
      <span className="flip-page-num">{pageNumber}</span>
    </div>
  );
});

function Book({ url, pageWidth }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(0);
  const bookRef = useRef(null);

  const file = useMemo(() => {
    const token = localStorage.getItem('lms_token');
    return {
      url,
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
      withCredentials: false,
    };
  }, [url]);

  useEffect(() => { setNumPages(0); setPage(0); }, [url]);

  const go = (next) => {
    const flip = bookRef.current?.pageFlip?.();
    if (!flip) return;
    if (next) flip.flipNext();
    else flip.flipPrev();
  };

  return (
    <Document
      file={file}
      onLoadSuccess={({ numPages: n }) => setNumPages(n)}
      loading={<div className="flipbook-loading"><div className="flipbook-spinner" /><span>Memuat PDF…</span></div>}
      error={<div className="flipbook-loading">PDF tidak bisa dibuka. Coba buka di tab baru.</div>}
    >
      {numPages > 0 && (
        <div className="flipbook-stage">
          <HTMLFlipBook
            ref={bookRef}
            width={pageWidth}
            height={Math.round(pageWidth * 1.38)}
            size="stretch"
            minWidth={240}
            maxWidth={640}
            minHeight={320}
            maxHeight={900}
            drawShadow
            showCover
            mobileScrollSupport
            usePortrait
            className="flipbook-book"
            onFlip={(e) => setPage(e.data)}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <PageSheet key={i + 1} pageNumber={i + 1} width={pageWidth - 6} />
            ))}
          </HTMLFlipBook>
          <div className="flipbook-nav">
            <button type="button" className="flipbook-btn" onClick={() => go(false)} disabled={page <= 0}>
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <span>{Math.min(page + 1, numPages)} / {numPages}</span>
            <button type="button" className="flipbook-btn" onClick={() => go(true)} disabled={page >= numPages - 1}>
              Berikutnya <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </Document>
  );
}

export default function PdfFlipbook({ url, title }) {
  const [fullscreen, setFullscreen] = useState(false);
  const resolvedUrl = resolvePdfUrl(url);
  if (!resolvedUrl) return null;

  return (
    <div className="flipbook-wrapper" data-testid="pdf-flipbook">
      <div className="flipbook-header">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[#1A4D2E]" />
          <span className="text-sm font-semibold text-[#1A4D2E]">{title || 'PDF Materi'}</span>
        </div>
        <div className="flex gap-2">
          <a href={resolvedUrl} target="_blank" rel="noreferrer" className="flipbook-btn-icon" title="Buka di tab baru">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <button type="button" onClick={() => setFullscreen(true)} className="flipbook-btn-icon" title="Layar penuh">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      <Book url={resolvedUrl} pageWidth={380} />

      {fullscreen && (
        <div className="flipbook-modal" onClick={() => setFullscreen(false)}>
          <div className="flipbook-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="flipbook-modal-header">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#1A4D2E]" />
                <span className="font-semibold text-[#1A4D2E]">{title || 'PDF Materi'}</span>
              </div>
              <button type="button" onClick={() => setFullscreen(false)} className="flipbook-btn-icon">
                <X size={16} />
              </button>
            </div>
            <Book url={resolvedUrl} pageWidth={520} />
          </div>
        </div>
      )}

      <style>{`
        .flipbook-wrapper {
          border: 1px solid #E5E5E0;
          border-radius: 12px;
          overflow: hidden;
          background: #FAFAF8;
          margin-top: 1.5rem;
        }
        .flipbook-header, .flipbook-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: linear-gradient(135deg, #E9F1EC 0%, #d4e8da 100%);
          border-bottom: 1px solid #D1E4D9;
          flex-shrink: 0;
        }
        .flipbook-btn-icon, .flipbook-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border-radius: 7px;
          border: 1px solid #C5D9CB;
          background: white;
          color: #1A4D2E;
          cursor: pointer;
          text-decoration: none;
        }
        .flipbook-btn-icon { width: 30px; height: 30px; }
        .flipbook-btn { padding: 6px 10px; font-size: 13px; font-weight: 600; }
        .flipbook-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .flipbook-btn-icon:hover, .flipbook-btn:hover:not(:disabled) { background: #D1E4D9; }
        .flipbook-stage { padding: 16px 8px 12px; background: #efece4; overflow: auto; }
        .flipbook-book { margin: 0 auto; }
        .flip-page {
          background: #fff;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 0 0 1px rgba(26, 77, 46, 0.08);
        }
        .flip-page canvas { display: block; max-width: 100%; height: auto !important; }
        .flip-page-num {
          position: absolute;
          right: 10px;
          bottom: 8px;
          font-size: 11px;
          color: #666;
          background: rgba(255,255,255,0.9);
          padding: 1px 6px;
          border-radius: 99px;
        }
        .flipbook-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          padding: 0 8px;
          color: #1A4D2E;
          font-size: 13px;
          font-weight: 600;
        }
        .flipbook-loading {
          min-height: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #666;
          font-size: 14px;
          text-align: center;
          padding: 24px;
        }
        .flipbook-spinner {
          width: 36px; height: 36px;
          border: 3px solid #E9F1EC;
          border-top-color: #1A4D2E;
          border-radius: 50%;
          animation: flip-spin 0.8s linear infinite;
        }
        @keyframes flip-spin { to { transform: rotate(360deg); } }
        .flipbook-modal {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.65);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .flipbook-modal-inner {
          width: 100%;
          max-width: 1100px;
          max-height: 92vh;
          background: white;
          border-radius: 16px;
          overflow: auto;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
