import React, { useState } from 'react';
import { BookOpen, Maximize2, X } from 'lucide-react';

export default function PdfFlipbook({ url, title }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!url) return null;

  const resolvedUrl = url.startsWith('http')
    ? url
    : `${process.env.REACT_APP_BACKEND_URL}${url}`;

  // Google Docs Viewer untuk embed PDF di semua browser
  const embedUrl = resolvedUrl.startsWith('http')
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`
    : resolvedUrl;

  return (
    <div className="flipbook-wrapper">
      <div className="flipbook-header">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[#1A4D2E]" />
          <span className="text-sm font-semibold text-[#1A4D2E]">{title || 'PDF Materi'}</span>
        </div>
        <div className="flex gap-2">
          <a href={resolvedUrl} target="_blank" rel="noreferrer" className="flipbook-btn-icon" title="Buka di tab baru">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <button onClick={() => setFullscreen(true)} className="flipbook-btn-icon" title="Layar penuh">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div className="flipbook-frame">
        {loading && (
          <div className="flipbook-loading">
            <div className="flipbook-spinner" />
            <span>Memuat PDF…</span>
          </div>
        )}
        <iframe
          src={embedUrl}
          title="PDF Materi"
          className="flipbook-iframe"
          onLoad={() => setLoading(false)}
          allow="fullscreen"
        />
      </div>

      {fullscreen && (
        <div className="flipbook-modal" onClick={() => setFullscreen(false)}>
          <div className="flipbook-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="flipbook-modal-header">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#1A4D2E]" />
                <span className="font-semibold text-[#1A4D2E]">{title || 'PDF Materi'}</span>
              </div>
              <button onClick={() => setFullscreen(false)} className="flipbook-btn-icon">
                <X size={16} />
              </button>
            </div>
            <iframe
              src={embedUrl}
              title="PDF Fullscreen"
              className="flipbook-iframe-full"
              allow="fullscreen"
            />
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
        .flipbook-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: linear-gradient(135deg, #E9F1EC 0%, #d4e8da 100%);
          border-bottom: 1px solid #D1E4D9;
        }
        .flipbook-btn-icon {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          border: 1px solid #C5D9CB;
          background: white;
          color: #1A4D2E;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s, transform 0.1s;
        }
        .flipbook-btn-icon:hover { background: #D1E4D9; transform: scale(1.05); }
        .flipbook-frame {
          position: relative;
          width: 100%;
          height: 520px;
          background: #f0f0ec;
        }
        .flipbook-iframe { width: 100%; height: 100%; border: none; display: block; }
        .flipbook-loading {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #666;
          font-size: 14px;
          background: #FAFAF8;
          z-index: 1;
        }
        .flipbook-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #E9F1EC;
          border-top-color: #1A4D2E;
          border-radius: 50%;
          animation: flip-spin 0.8s linear infinite;
        }
        @keyframes flip-spin { to { transform: rotate(360deg); } }
        .flipbook-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          backdrop-filter: blur(4px);
          animation: flipFadeIn 0.2s ease;
        }
        @keyframes flipFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .flipbook-modal-inner {
          width: 100%;
          max-width: 960px;
          height: 90vh;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          animation: flipSlideUp 0.25s ease;
        }
        @keyframes flipSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .flipbook-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: linear-gradient(135deg, #E9F1EC 0%, #d4e8da 100%);
          border-bottom: 1px solid #D1E4D9;
          flex-shrink: 0;
        }
        .flipbook-iframe-full { flex: 1; width: 100%; border: none; }
      `}</style>
    </div>
  );
}
