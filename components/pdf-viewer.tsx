import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

type PdfViewerProps = {
  url: string;
  title: string;
};

export function PdfViewer({ url, title }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const canPrev = pageNumber > 1;
  const canNext = pageNumber < numPages;

  const normalizedUrl = useMemo(() => url.trim(), [url]);

  return (
    <section className="card pdf-panel">
      <h3>{title}</h3>
      <div className="actions">
        <button type="button" onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))))}>
          Zoom -
        </button>
        <button type="button" onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.1).toFixed(2))))}>
          Zoom +
        </button>
        <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)}>
          Rotate
        </button>
        <button type="button" onClick={() => canPrev && setPageNumber((p) => p - 1)} disabled={!canPrev}>
          Prev page
        </button>
        <button type="button" onClick={() => canNext && setPageNumber((p) => p + 1)} disabled={!canNext}>
          Next page
        </button>
      </div>
      <p>
        Page {pageNumber} / {numPages} | Zoom {Math.round(scale * 100)}%
      </p>
      <div className="pdf-canvas-wrap">
        <Document
          file={normalizedUrl}
          onLoadSuccess={({ numPages: loadedPages }) => {
            setNumPages(loadedPages);
            setPageNumber(1);
          }}
          onLoadError={(error) => {
            console.error("Failed to load PDF", error);
          }}
        >
          <Page pageNumber={pageNumber} scale={scale} rotate={rotation} />
        </Document>
      </div>
      <p>
        Source: <a href={normalizedUrl} target="_blank" rel="noreferrer">open in new tab</a>
      </p>
    </section>
  );
}
