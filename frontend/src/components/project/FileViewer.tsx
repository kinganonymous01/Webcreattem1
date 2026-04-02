import { useState } from 'react';

interface FileViewerProps {
  files: FileItem[];
}

export default function FileViewer({ files }: FileViewerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const selectedFile = files.find(f => f.path === selectedPath);

  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div className="file-viewer">
      <div className="file-list">
        <h3>Files</h3>
        {sortedFiles.map(f => (
          <button
            key={f.path}
            className={`file-item ${selectedPath === f.path ? 'file-item--active' : ''}`}
            onClick={() => setSelectedPath(f.path)}
          >
            {f.path}
          </button>
        ))}
      </div>

      <div className="file-content">
        {selectedFile
          ? (
            <>
              <div className="file-content-header">
                <code>{selectedFile.path}</code>
              </div>
              <pre className="file-content-body">
                <code>{selectedFile.content}</code>
              </pre>
            </>
          )
          : (
            <p className="file-content-empty">
              Select a file to view its contents.
            </p>
          )
        }
      </div>
    </div>
  );
}
