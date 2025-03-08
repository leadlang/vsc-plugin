export interface Split { part: string; index: number };

export function splitWithIndices(str: string, delimiter: string, u = 0): Split[] {
  if (!delimiter) throw new Error("Delimiter cannot be empty!"); // Avoid infinite loops

  let result: Split[] = [];
  let currentIndex = u;
  let parts = str.split(delimiter);

  for (let part of parts) {
    result.push({ part, index: currentIndex });
    currentIndex += part.length + delimiter.length; // Move past the delimiter
  }

  return result;
}
