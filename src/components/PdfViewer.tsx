import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Moon,
  Sun,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  ExternalLink,
  AlertTriangle,
  FileText,
  XCircle,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfAnnotation, CompileDiagnostic } from '../types';
import { findBestSourceLine } from '../services/syncTexMatch';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  pdfDataUrl: string | null;
  diagnostics?: CompileDiagnostic[];
  onSyncTexJump?: (lineNumber: number) => void;
  annotations: PdfAnnotation[];
  onAddAnnotation: (annotation: Omit<PdfAnnotation, 'id' | 'createdAt'>) => void;
  sourceText?: string;
}

interface RenderedPage {
  pageNumber: number;
  textSpans: { text: string; transform: number[] }[];
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDataUrl,
  diagnostics = [],
  onSyncTexJump,
  annotations,
  onAddAnnotation,
  sourceText = '',
}) => {
  const [scale, setScale] = useState<number>(1.1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isRotated, setIsRotated] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [annotationText, setAnnotationText] = useState<string>('');
  const [annotationPos, setAnnotationPos] = useState<{ x: number; y: number } | null>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  const loadPdf = useCallback(async () => {
    if (!pdfDataUrl) return;
    setLoadError(null);
    try {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      const doc = await pdfjsLib.getDocument({ url: pdfDataUrl }).promise;
      pdfDocRef.current = doc;
      setTotalPages(doc.numPages);

      const pages: RenderedPage[] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        const textItems = textContent.items as unknown as { str: string; transform: number[] }[];
        const textSpans = textItems
          .filter(item => typeof item.str === 'string' && item.str.trim().length > 0)
          .map(item => ({ text: item.str, transform: item.transform }));
        pages.push({ pageNumber: p, textSpans });
        void viewport;
      }
      setRenderedPages(pages);
      setCurrentPage(1);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load PDF.');
    }
  }, [pdfDataUrl]);

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  // Render each page's canvas when scale/rotation changes
  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc) return;
    let cancelled = false;
    (async () => {
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale, rotation: isRotated ? 90 : 0 });
        const canvas = document.getElementById(`pdf-page-${p}`) as HTMLCanvasElement | null;
        if (!canvas || cancelled) continue;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        if (renderTaskRef.current) renderTaskRef.current.cancel();
        const task = page.render({ canvasContext: ctx, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
        renderTaskRef.current = task;
        try {
          await task.promise;
        } catch {
          // cancelled render — ignore
        }
      }
    })();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [scale, isRotated, totalPages]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (isAnnotating) {
      setAnnotationPos({ x, y });
    }
  };

  const handleTextClick = (text: string, pageNumber: number) => {
    if (isAnnotating) return;
    if (!onSyncTexJump) return;
    const match = findBestSourceLine(sourceText, text);
    if (match) {
      onSyncTexJump(match.line);
      return;
    }
    // Fallback: page-relative estimate
    const estimatedLine = Math.min(Math.max(Math.round(pageNumber * 25), 1), 200);
    onSyncTexJump(estimatedLine);
  };

  const handleSaveAnnotation = () => {
    if (!annotationPos || !annotationText.trim()) return;
    onAddAnnotation({
      projectId: 'current',
      page: currentPage,
      x: annotationPos.x,
      y: annotationPos.y,
      width: 15,
      height: 10,
      authorName: 'Co-Author',
      text: annotationText.trim(),
      color: '#DC2626',
    });
    setAnnotationText('');
    setAnnotationPos(null);
    setIsAnnotating(false);
  };

  const scrollToPage = (page: number) => {
    const el = document.getElementById(`pdf-page-wrapper-${page}`);
    if (el && scrollRef.current) {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    setCurrentPage(page);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));

  return (
    <div className="w-full h-full flex flex-col bg-slate-100 select-none border-l-2 border-slate-200">
      {/* PDF Controls Header */}
      <div className="h-10 bg-white border-b-2 border-slate-200 flex items-center justify-between px-3 text-xs text-slate-800 font-bold">
        {/* Page Nav */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => scrollToPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
            className="p-1 hover:bg-slate-100 disabled:opacity-40 border border-transparent hover:border-slate-300"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-700 font-mono text-[11px] px-1">
            PAGE <span className="text-[#D11111] font-bold">{currentPage}</span> / {totalPages}
          </span>
          <button
            onClick={() => scrollToPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="p-1 hover:bg-slate-100 disabled:opacity-40 border border-transparent hover:border-slate-300"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & View Options */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-slate-100 text-slate-700 hover:text-[#D11111]"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-slate-600 font-mono text-[10px] font-bold w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-slate-100 text-slate-700 hover:text-[#D11111]"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 my-auto" />

          <button
            onClick={() => setIsRotated(r => !r)}
            className={`p-1.5 transition-colors border ${
              isRotated ? 'bg-slate-200 border-slate-300 text-slate-800' : 'hover:bg-slate-100 border-transparent text-slate-700'
            }`}
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-1.5 transition-colors border ${
              isDarkMode ? 'bg-slate-900 text-amber-400 border-slate-900' : 'hover:bg-slate-100 border-transparent text-slate-700'
            }`}
            title="Toggle Dark Mode Reader"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsAnnotating(!isAnnotating)}
            className={`p-1.5 transition-colors border ${
              isAnnotating ? 'bg-[#D11111] text-white border-red-800 font-bold' : 'hover:bg-slate-100 border-transparent text-slate-700'
            }`}
            title="Add PDF Region Annotation Pin"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>

          {pdfDataUrl && (
            <a
              href={pdfDataUrl}
              download="document.pdf"
              className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-[#D11111]"
              title="Download PDF File"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {pdfDataUrl && (
            <a
              href={pdfDataUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-[#D11111]"
              title="Open PDF in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main PDF Rendering Area */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex justify-center items-start relative bg-slate-200/80">
        {pdfDataUrl ? (
          loadError ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500 max-w-lg mx-auto">
              <XCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="font-semibold text-sm text-slate-700">PDF Rendering Failed</p>
              <p className="text-xs max-w-xs mt-1">{loadError}</p>
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-4">
              {renderedPages.map(pageInfo => (
                <div
                  key={pageInfo.pageNumber}
                  id={`pdf-page-wrapper-${pageInfo.pageNumber}`}
                  ref={pageInfo.pageNumber === 1 ? containerRef : undefined}
                  onClick={handleCanvasClick}
                  className={`relative mx-auto shadow-md bg-white rounded-xs border border-slate-300 origin-top ${
                    isDarkMode ? 'invert hue-rotate-180 brightness-95 contrast-105' : ''
                  }`}
                  style={{ width: `${PAGE_WIDTH * scale}px`, minHeight: `${PAGE_HEIGHT * scale}px` }}
                >
                  <canvas id={`pdf-page-${pageInfo.pageNumber}`} className="block mx-auto" />

                  {/* Text layer (invisible; click to jump to source line) */}
                  {sourceText && onSyncTexJump && (
                    <div className="absolute inset-0 z-[5]">
                      {pageInfo.textSpans.map((span, i) => {
                        const viewportScale = scale;
                        const [a, , , , e, f] = span.transform;
                        const fontSize = Math.max(Math.abs(a) * viewportScale, 6);
                        return (
                          <span
                            key={i}
                            className="absolute cursor-pointer hover:bg-amber-300/40 rounded-xs whitespace-pre transition-colors"
                            style={{
                              left: `${e * viewportScale}px`,
                              top: `${f * viewportScale}px`,
                              fontSize: `${fontSize}px`,
                              lineHeight: 1,
                              transform: 'translateY(-0.25em)',
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              handleTextClick(span.text, pageInfo.pageNumber);
                            }}
                            title="Jump to source line"
                          >
                            {span.text}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Page label */}
                  <div className="absolute bottom-1 right-2 text-[10px] font-mono text-slate-400 bg-white/80 px-1 rounded-sm">
                    {pageInfo.pageNumber}
                  </div>

                  {/* PDF Region Annotations Layer (per page) */}
                  {annotations
                    .filter(ann => ann.page === pageInfo.pageNumber)
                    .map(ann => (
                      <div
                        key={ann.id}
                        style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                      >
                        <div className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm animate-bounce">
                          !
                        </div>
                        <div className="hidden group-hover:block absolute left-6 top-0 bg-slate-900 text-white text-xs p-2 rounded shadow-lg w-48 z-20">
                          <span className="font-semibold text-red-400 block text-[10px]">{ann.authorName}</span>
                          <p className="mt-0.5 text-[11px]">{ann.text}</p>
                        </div>
                      </div>
                    ))}

                  {/* Annotation Creation Popup (page 1 default anchor) */}
                  {annotationPos && pageInfo.pageNumber === currentPage && (
                    <div
                      style={{ left: `${annotationPos.x}%`, top: `${annotationPos.y}%` }}
                      className="absolute z-30 bg-white border border-red-200 p-3 rounded-lg shadow-xl w-64 -translate-x-1/2"
                    >
                      <span className="font-bold text-xs text-red-700 block mb-1">Add Region Annotation</span>
                      <textarea
                        value={annotationText}
                        onChange={e => setAnnotationText(e.target.value)}
                        placeholder="Enter feedback or edit note..."
                        rows={2}
                        autoFocus
                        className="w-full text-xs border border-slate-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-red-500"
                      />
                      <div className="flex justify-end space-x-1.5 mt-2">
                        <button
                          onClick={() => setAnnotationPos(null)}
                          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveAnnotation}
                          className="px-2.5 py-1 text-xs bg-red-600 text-white font-semibold rounded hover:bg-red-700"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="text-center text-[10px] text-slate-400 font-mono pb-4">
                Click any text to jump to its source line {isAnnotating ? '• annotate mode on' : ''}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500 max-w-lg mx-auto">
            {diagnostics.length > 0 ? (
              <>
                <XCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="font-semibold text-sm text-slate-700">Compilation Failed</p>
                <p className="text-xs max-w-xs mt-1 mb-4">
                  TeXForge encountered {diagnostics.length} error{diagnostics.length !== 1 ? 's' : ''} during typesetting.
                </p>
                <div className="w-full text-left space-y-1.5 max-h-64 overflow-y-auto">
                  {diagnostics.slice(0, 10).map((d, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-2 rounded text-xs">
                      <div className="flex items-center space-x-1.5">
                        {d.severity === 'error' ? (
                          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
                        )}
                        <span className="font-mono font-bold text-slate-700">
                          {d.file || 'main.tex'}{d.line ? `:${d.line}` : ''}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 leading-relaxed">{d.message}</p>
                    </div>
                  ))}
                  {diagnostics.length > 10 && (
                    <p className="text-[10px] text-slate-400">
                      +{diagnostics.length - 10} more — check the Terminal panel below.
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-4">
                  Common causes: missing document class (.cls), unavailable packages, or font errors.
                </p>
              </>
            ) : (
              <>
                <FileText className="w-10 h-10 text-slate-300 mb-3" />
                <p className="font-semibold text-sm text-slate-700">No PDF Compiled Yet</p>
                <p className="text-xs max-w-xs mt-1">
                  Click the <span className="font-semibold text-red-600">Compile</span> button above to trigger TeXForge typesetting.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};