export const getVarName: (v: string, index: number) => [string, string, number, boolean | undefined][] = (v: string, index: number) => {
  const matcher = /(?<!(\\|->&|->))\${[a-z0-9_]*}|->&\$[A-Za-z_][A-Za-z0-9_]*|->\$[A-Za-z_][A-Za-z0-9_]*|\$[A-Za-z_][A-Za-z0-9_]*/gi;

  const data = [];

  [...v.matchAll(matcher)].forEach(match => {
    data.push(normalize(match[0], match.index + index));
  });


  return data;
}

function normalize(v: string, index: number): [string, string, number, boolean | undefined] {
  if (v.startsWith("${")) {
    return [v, `$${v.substring(2, v.indexOf("}"))}`, index, undefined];
  } else if (v.startsWith("$")) {
    return [v, v, index, undefined];
  } else if (v.startsWith("->$")) {
    return [v, v.substring(2), index + 2, true];
  } else if (v.startsWith("->&$")) {
    return [v, v.substring(3), index + 3, undefined];
  }
}