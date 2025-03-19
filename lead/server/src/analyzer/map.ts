export type VariableType = string;

export type Maps = {
  [key: string]: {
    [key: number]: {
      typ: VariableType,
      conditional: boolean,
      pkg?: {
        cmds: {
          [key: string]: {
            package: string;
            description: string;
            regex: string;
            returns: string;
          };
        };
        rts: {
          [key: string]: {
            [key: string]: {
              package: string;
              description: string;
              regex: string;
              returns: string;
            };
          };
        };
      },
      rtVal?: {
        [key: string]: {
          [key: string]: {
            package: string;
            description: string;
            regex: string;
            returns: string;
          };
        };
      };
    }
  }
}

export let documentVariableMap: {
  [key: string]: Maps
} = {}

export function findVariableTypeBeforeN(
  uri: string,
  variable: string,
  n: number
): [VariableType, boolean] | ["%err:moved", number] | null {
  const doc = documentVariableMap[uri];
  if (!doc) return null;

  const map = doc[variable];
  if (!map) return null;

  const positions = Object.keys(map)
    .map(Number)
    .filter(pos => pos < n);

  if (positions.length === 0) return null;

  const nearestPosition = Math.max(...positions);

  const mapData = map[nearestPosition];

  const rtype = mapData.typ;

  if (rtype == "%null") {
    return ["%err:moved", nearestPosition];
  }

  return [rtype, mapData.conditional];
}
