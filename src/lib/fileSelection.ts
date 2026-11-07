/** Match the same extension / MIME filters used by the file picker. */
export function fileSelectionError(files: readonly Pick<File, 'name' | 'type'>[], accept = '', multiple = false): string | null {
  if (!files.length) return 'Drop a file to continue.';
  if (!multiple && files.length > 1) return 'Choose one file at a time.';
  const filters = accept.toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
  if (filters.length && files.some(file => !filters.some(filter =>
    filter.startsWith('.') ? file.name.toLowerCase().endsWith(filter) :
      filter.endsWith('/*') ? file.type.toLowerCase().startsWith(filter.slice(0, -1)) : file.type.toLowerCase() === filter
  ))) return `Choose a supported file: ${accept}`;
  return null;
}
