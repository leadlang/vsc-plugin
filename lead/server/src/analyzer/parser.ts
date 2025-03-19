import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { Split, splitWithIndices } from "./split";
import { readdirSync } from "node:fs";
import { connection, library } from "../server";
import { TextDocument } from "vscode-languageserver-textdocument";
import { documentVariableMap, findVariableTypeBeforeN } from "./map";
import { getVarName } from "./var";

import path = require("node:path");

let methods: ({
  [key: string]: {
    package: string;
    description: string;
    regex: string;
    returns: string;
  };
}) = {};

let packages: ({
  [key: string]: ({
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
  })
}) = {};

function importPkg(lib: string, w: string) {
  methods = {};
  readdirSync(lib)
    .forEach((s) => {
      console.log(`[LanguageServer] Importing ${s}`);

      const lmeth = library.load_all(path.join(lib, s)).cmds;

      methods = {
        ...methods,
        ...lmeth
      };
    });

  packages = {};

  try {
    readdirSync(path.join(w, ".lead_libs"))
      .forEach((s) => {
        const name = s.substring(65);

        try {
          packages[name] = library.load_all(path.join(w, ".lead_libs", s, `${library.prefix}${name}${library.suffix}`));
        } catch (_) {
          connection.window.showErrorMessage(`Unable to load \`${name}\`. Is it built for the latest version of lead?`);
        }
      });
  } catch (_) { }
}

let last = 0;

export async function parse(lib: string, w: string, diag: Diagnostic[], data: Split[], doc: TextDocument) {
  documentVariableMap[doc.uri] = {};

  if (last < Date.now()) {
    importPkg(lib, w);
    last = Date.now() + 50_000;
  }

  for (let i = 0; i < data.length; i++) {
    const {
      index,
      part
    } = data[i];

    const trimmed = part.trim();

    if (trimmed.length > 0 && !trimmed.startsWith("#")) {
      read(trimmed, diag, index, doc);
    }
  }
}

function read(trim: string, diag: Diagnostic[], index: number, doc: TextDocument, conditional = false) {
  const splits = splitWithIndices(trim, " ", index);

  const [alloc, caller, whole] = (() => {
    if (splits[0].part.startsWith("$") && splits[0].part.endsWith(":")) {
      return [splits[0], splits[1], splits.slice(1)]
    } else {
      return [{ index: -1, part: "" } as Split, splits[0], splits.slice(0)]
    }
  })();

  let docVar = documentVariableMap[doc.uri];

  if (caller.part.startsWith("*if$")) {
    const startIndex = whole[1].index;

    const data = whole.map(({ part: a }) => a).slice(1).join(" ");

    return read(data, diag, startIndex, doc, true);
  } else if (caller.part.startsWith("*else$")) {
    const startIndex = whole[1].index;

    const data = whole.map(({ part: a }) => a).slice(1).join(" ");

    return read(data, diag, startIndex, doc, true);
  } else if (caller.part == "*import") {
    console.log(caller.part);

    const toImport = whole.slice(1).map((a) => a.part).join(" ");

    if (alloc.index == -1) {
      diag.push({
        message: `Must store the imported library to a variable`,
        range: {
          start: doc.positionAt(whole[0].index),
          end: doc.positionAt(whole[0].part.length + toImport.length + whole[0].index + 1)
        }
      });
      return;
    }

    const i = whole[1].index;

    const pkg = packages[toImport];
    if (!pkg) {
      diag.push({
        message: `Unknown library \`${toImport}\``,
        range: {
          start: doc.positionAt(i),
          end: doc.positionAt(toImport.length + i)
        }
      });
      return;
    }

    docVar[caller.part] = {
      ...(docVar[caller.part] || {}),
      [i]: {
        conditional,
        typ: "rt",
        pkg
      }
    }

    return;
  } else if (caller.part == "*mod") {
    // To Parse a *mod
    return;
  }

  const wholeToMatch = whole.map((s) => s.part).join(" ");

  let method: {
    package: string;
    description: string;
    regex: string;
    returns: string;
  };
  if (!caller.part.startsWith("$") && !methods[caller.part]) {
    diag.push({
      message: `Unknown function \`${caller.part}\``,
      range: {
        start: doc.positionAt(caller.index),
        end: doc.positionAt(caller.part.length + caller.index)
      }
    });

    return;
  } else if (caller.part.startsWith("$")) {

    return;
  } else {
    method = methods[caller.part];
  }

  const regexp = new RegExp(method.regex, "ig");

  whole.slice(1).forEach((s) => {
    const data = getVarName(s.part, s.index);

    data.forEach(([orig, str, i, moves]) => {
      if (moves) {
        if (docVar[str]) {
          docVar[str][i] = {
            conditional,
            typ: "%null"
          };
        }
      }

      const variable = findVariableTypeBeforeN(doc.uri, str, i);

      if (!variable) {
        diag.push({
          message: `Cannot find variable \`${str}\``,
          range: {
            start: doc.positionAt(i),
            end: doc.positionAt(i + orig.length),
          }
        });
      } else if (variable[0] == "%err:moved") {
        const m = [, variable[1] as number];

        diag.push({
          severity: DiagnosticSeverity.Hint,
          message: `Variable \`${str}\` was moved when this function was called`,
          range: {
            start: doc.positionAt(m[1]),
            end: doc.positionAt(m[1] + str.length)
          },
          relatedInformation: [
            {
              location: {
                range: {
                  start: doc.positionAt(i),
                  end: doc.positionAt(i + orig.length)
                },
                uri: doc.uri
              },
              message: "You later used here \`${str}\` here"
            }
          ]
        });
        diag.push({
          message: `Use of moved variable \`${str}\``,
          range: {
            start: doc.positionAt(i),
            end: doc.positionAt(i + orig.length)
          },
          relatedInformation: [
            {
              location: {
                range: {
                  start: doc.positionAt(m[1]),
                  end: doc.positionAt(m[1] + str.length)
                },
                uri: doc.uri
              },
              message: "Variable moved here"
            }
          ]
        });
      } else if (variable[1]) {
        diag.push({
          severity: DiagnosticSeverity.Information,
          message: `Variable \`${str}\` might not be always defined`,
          range: {
            start: doc.positionAt(i),
            end: doc.positionAt(i + str.length)
          }
        });
      }
    });
  });

  const match = wholeToMatch.match(regexp);

  if (!match) {
    diag.push({
      message: `Invalid Arguments to \`${caller.part}\``,
      range: {
        start: doc.positionAt(caller.index),
        end: doc.positionAt(wholeToMatch.length + caller.index)
      }
    });
  }

  if (alloc.index >= 0) {
    const varName = alloc.part.substring(0, alloc.part.length - 1);
    const ret = method.returns;

    switch (ret) {
      case "*":
      case "\"*\"":
      case "'*'":
        docVar[varName] = {
          ...(docVar[varName] || {}),
          [index]: {
            conditional,
            typ: "%any"
          }
        };
        break;
      default:
        console.error("[Server]: Unknown return type", ret);
    }
  }
}