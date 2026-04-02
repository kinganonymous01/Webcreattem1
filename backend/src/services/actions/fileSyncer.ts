import { Sandbox } from 'e2b';

export async function syncFilesFromSandbox(
  sandbox:      Sandbox,
  currentFiles: FileItem[]
): Promise<void> {
  await Promise.all(
    currentFiles.map(async (file) => {
      try {
        const content = await sandbox.files.read(file.path);
        file.content = content;
      } catch (err) {
        console.warn(`syncFilesFromSandbox: could not read ${file.path}:`, err);
      }
    })
  );
}
