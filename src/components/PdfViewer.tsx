import React, { useState, useRef } from 'react';
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
  Search,
  ExternalLink,
  AlertTriangle,
  FileText,
  XCircle,
} from 'lucide-react';
import { PdfAnnotation, CompileDiagnostic } from '../types';

interface PdfViewerProps {
  pdfDataUrl: string | null;
  diagnostics?: CompileDiagnostic[];
  onSyncTexJump?: (lineNumber: number) => void;
  annotations: PdfAnnotation[];
  onAddAnnotation: (annotation: Omit<PdfAnnotation, 'id' | 'createdAt'>) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDataUrl,
  diagnostics = [],
  onSyncTexJump,
  annotations,
  onAddAnnotation,
}) => {
  const [scale, setScale] = useState<number>(1.1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages] = useState<number>(1);
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [annotationText, setAnnotationText] = useState<string>('');
  const [annotationPos, setAnnotationPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (isAnnotating) {
      setAnnotationPos({ x, y });
    }
  };

  const handleDoubleClick = () => {
    // SyncTeX bidirectional navigation simulation
    // Jump to estimated line based on click Y coordinate
    if (onSyncTexJump) {
      const estimatedLine = Math.min(Math.max(Math.round(currentPage * 25), 1), 200);
      onSyncTexJump(estimatedLine);
    }
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

  return (
    <div className="w-full h-full flex flex-col bg-slate-100 select-none border-l-2 border-slate-200">
      {/* PDF Controls Header */}
      <div className="h-10 bg-white border-b-2 border-slate-200 flex items-center justify-between px-3 text-xs text-slate-800 font-bold">
        {/* Page Nav */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
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
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
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
        </div>
      </div>

      {/* Main PDF Rendering Canvas Frame */}
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start relative bg-slate-200/80">
        {pdfDataUrl ? (
          <div
            ref={containerRef}
            onClick={handleCanvasClick}
            onDoubleClick={handleDoubleClick}
            className={`relative transition-all duration-150 shadow-md bg-white rounded-xs border border-slate-300 origin-top ${
              isDarkMode ? 'invert hue-rotate-180 brightness-95 contrast-105' : ''
            }`}
            style={{
              width: `${595 * scale}px`,
              minHeight: `${842 * scale}px`,
            }}
          >
            {/* Embedded PDF iframe / Canvas object */}
            <iframe
              src={`${pdfDataUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              title="Compiled PDF View"
              className="w-full h-full min-h-[820px] border-none rounded-xs pointer-events-auto"
            />

            {/* SyncTeX double-click hint badge */}
            <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded shadow-sm">
              Double-click to jump to TeX line
            </div>

            {/* PDF Region Annotations Layer */}
            {annotations.map(ann => (
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

            {/* Annotation Creation Popup */}
            {annotationPos && (
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
