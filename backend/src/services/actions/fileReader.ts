import { logStructured } from '../../utils/structuredLogger';

export function fileReader(
  currentFiles: FileItem[],
  reads:        FileReadItem[]
): string {
  logStructured('backend/src/services/actions/fileReader.ts', 'fileReader.start', {
    reads,
    currentFileCount: currentFiles.length
  });
  const results: string[] = [];

  for (const item of reads) {
    const file = currentFiles.find(f => f.path === item.filepath);

    if (file) {
      results.push(`=== ${item.filepath} ===\n${file.content}`);
      logStructured('backend/src/services/actions/fileReader.ts', 'fileReader.foundFile', {
        filepath: item.filepath,
        content: file.content
      });
    } else {
      results.push(`=== ${item.filepath} === FILE NOT FOUND`);
      logStructured('backend/src/services/actions/fileReader.ts', 'fileReader.fileNotFound', {
        filepath: item.filepath
      }, 'WARN');
    }
  }

  const output = results.join('\n\n');
  logStructured('backend/src/services/actions/fileReader.ts', 'fileReader.complete', { output });
  return output;
}
