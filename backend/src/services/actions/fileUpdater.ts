import { Sandbox } from 'e2b';

export async function fileUpdater(
  sandbox:      Sandbox,
  currentFiles: FileItem[],
  updates:      FileUpdateItem[]
): Promise<void> {
  for (const item of updates) {
    await sandbox.files.write(item.filepath, item.updated_code);

    const idx = currentFiles.findIndex(f => f.path === item.filepath);
    if (idx !== -1) {
      currentFiles[idx].content = item.updated_code;
    } else {
      currentFiles.push({ path: item.filepath, content: item.updated_code });
    }
  }
}
