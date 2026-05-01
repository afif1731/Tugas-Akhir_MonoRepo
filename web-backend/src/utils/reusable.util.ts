export function createSlug(text: string): string {
  return text
    .trim()
    .replaceAll(/\s+/g, '')
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(/\W/g, '');
}
