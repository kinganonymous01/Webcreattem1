interface PreviewPanelProps {
  previewUrl:    string | null;
  fileCount:     number;
  prerequisites: PreviewPrerequisite[];
}

export default function PreviewPanel({ previewUrl, fileCount, prerequisites }: PreviewPanelProps) {
  if (fileCount === 0) {
    return (
      <div className="preview-panel preview-panel--empty">
        <p>view the preview here after project creation</p>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="preview-panel preview-panel--prerequisites">
        <h3>Preparing preview</h3>
        <ul className="preview-prerequisite-list">
          {prerequisites.map(step => (
            <li key={step.id} className={`preview-prerequisite preview-prerequisite--${step.status}`}>
              <span className="preview-prerequisite-icon" aria-hidden="true">
                {step.status === 'complete' ? '✅' : step.status === 'error' ? '❌' : step.status === 'running' ? <span className="preview-spinner" /> : '○'}
              </span>
              <span>{step.label}</span>
            </li>
          ))}
        </ul>
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
