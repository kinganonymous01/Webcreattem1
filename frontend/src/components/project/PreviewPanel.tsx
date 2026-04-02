interface PreviewPanelProps {
  previewUrl: string | null;
}

export default function PreviewPanel({ previewUrl }: PreviewPanelProps) {
  if (!previewUrl) {
    return (
      <div className="preview-panel preview-panel--loading">
        <p>Preview is loading...</p>
      </div>
    );
  }

  return (
    <div className="preview-panel">
      <div className="preview-toolbar">
        <span className="preview-url">{previewUrl}</span>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-open-button"
        >
          Open in new tab ↗
        </a>
      </div>
      <iframe
        src={previewUrl}
        className="preview-frame"
        title="Website Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
