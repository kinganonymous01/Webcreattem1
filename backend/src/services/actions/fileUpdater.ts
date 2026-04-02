import { Sandbox } from 'e2b';
import { logStructured } from '../../utils/structuredLogger';

export async function fileUpdater(
  sandbox:      Sandbox,
  currentFiles: FileItem[],
  updates:      FileUpdateItem[]
): Promise<void> {
  logStructured('backend/src/services/actions/fileUpdater.ts', 'fileUpdater.start', { updates });
  for (const item of updates) {
    await sandbox.files.write(item.filepath, item.updated_code);
    logStructured('backend/src/services/actions/fileUpdater.ts', 'fileUpdater.sandbox.write', {
      filepath: item.filepath,
      updated_code: item.updated_code
    });

    const idx = currentFiles.findIndex(f => f.path === item.filepath);
    if (idx !== -1) {
      currentFiles[idx].content = item.updated_code;
      logStructured('backend/src/services/actions/fileUpdater.ts', 'fileUpdater.currentFiles.updatedExisting', {
        filepath: item.filepath
      });
    } else {
      currentFiles.push({ path: item.filepath, content: item.updated_code });
      logStructured('backend/src/services/actions/fileUpdater.ts', 'fileUpdater.currentFiles.addedNew', {
        filepath: item.filepath
      });
    }
  }
}
