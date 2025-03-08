export type VariableType = string;

export type Maps = {
  [key: string]: {
    [key: number]: VariableType
  }
}

export let documentVariableMap: {
  [key: string]: Maps
} = {}

export function findVariableTypeBeforeN(
  uri: string,
  variable: string,
  n: number
): VariableType | ["%err:moved", number] | null {
  const doc = documentVariableMap[uri];
  if (!doc) return null;

  const map = doc[variable];
  if (!map) return null;

  const positions = Object.keys(map)
    .map(Number)
    .filter(pos => pos < n);

  if (positions.length === 0) return null;

  const nearestPosition = Math.max(...positions);

  const rtype = map[nearestPosition];

  if (rtype == "%null") {
    return ["%err:moved", nearestPosition];
  }

  return rtype;
}
