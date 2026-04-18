export function fileReader(
  currentFiles: FileItem[],
  reads:        FileReadItem[]
): string {
  const results: string[] = [];

  for (const item of reads) {
    const file = currentFiles.find(f => f.path === item.filepath);

    if (file) {
      results.push(`=== ${item.filepath} ===\n${file.content}`);
    } else {
      results.push(`=== ${item.filepath} === FILE NOT FOUND`);
    }
  }

  const output = results.join('\n\n');
  return output;
}
