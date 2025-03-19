import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { Split, splitWithIndices } from "./split";
import { readdirSync } from "node:fs";
import { connection, library } from "../server";
import path = require("node:path");
import { TextDocument } from "vscode-languageserver-textdocument";
import { documentVariableMap, findVariableTypeBeforeN } from "./map";
import { getVarName } from "./var";
import { Library } from "../getArch";

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

export async function parse(lib: string, w: string, diag: Diagnostic[], data: Split[], doc: TextDocument) {
  documentVariableMap[doc.uri] = {};

  methods = {};
  readdirSync(lib)
    .forEach((s) => {
      console.log(`[LeadLang]: Loading (core) ${s}`);

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

function read(trim: string, diag: Diagnostic[], index: number, doc: TextDocument) {
  const splits = splitWithIndices(trim, " ", index);

  const [alloc, caller, whole] = (() => {
    if (splits[0].part.startsWith("$") && splits[0].part.endsWith(":")) {
      return [splits[0], splits[1], splits.slice(1)]
    } else {
      return [{ index: -1, part: "" } as Split, splits[0], splits.slice(0)]
    }
  })();

  const wholeToMatch = whole.map((s) => s.part).join(" ");

  if (!methods[caller.part]) {
    diag.push({
      message: `Unknown function \`${caller.part}\``,
      range: {
        start: doc.positionAt(caller.index),
        end: doc.positionAt(caller.part.length + caller.index)
      }
    });

    return;
  }

  const method = methods[caller.part];

  const regexp = new RegExp(method.regex, "ig");

  let docVar = documentVariableMap[doc.uri];
  whole.slice(1).forEach((s) => {
    const data = getVarName(s.part, s.index);

    data.forEach(([orig, str, i, moves]) => {
      if (moves) {
        if (docVar[str]) {
          docVar[str][i] = "%null";
        }
      }

      const m = findVariableTypeBeforeN(doc.uri, str, i);

      if (!m) {
        diag.push({
          message: `Cannot find variable \`${str}\``,
          range: {
            start: doc.positionAt(i),
            end: doc.positionAt(i + orig.length),
          }
        });
      }

      if (Array.isArray(m)) {
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
          [index]: "%any"
        };
        break;
      default:
        console.error("[Server]: Unknown return type", ret);
    }
  }
}