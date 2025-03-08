import { TextDocument } from "vscode-languageserver-textdocument";
import { _Connection, Diagnostic, DiagnosticSeverity } from "vscode-languageserver";

import path = require("node:path");
import { readFileSync } from "node:fs";
import { splitWithIndices } from "./split";
import { parse } from "./parser";

function getAllIndexes(str: string, pattern: string): number[] {
  if (!pattern) return []; // Avoid infinite loop for empty pattern

  let indexes: number[] = [];
  let index = str.indexOf(pattern);

  while (index !== -1) {
    indexes.push(index);
    index = str.indexOf(pattern, index + pattern.length); // Skip past the found match
  }

  return indexes;
}

const getLeadHome: (w: string) => string | undefined = (w: string) => {
  try {
    return readFileSync(path.join(w, ".leadhome")).toString().trim();
  } catch (_) {
    return process.env["LEAD_HOME"];
  }
}

const getVersion = (w: string, home: string) => {
  try {
    return readFileSync(path.join(w, ".leadver")).toString().trim();
  } catch (_) {
    try {
      return readFileSync(path.join(home, "versions", "current")).toString().trim();
    } catch (_) {
      return null;
    }
  }
}

const getLeadLibDir: (home: string, ver: string) => string | undefined = (home, ver) => path.join(home, "versions", ver, "lib");


export async function analyzeCode(con: _Connection, workspace: string, document: TextDocument) {
  const data = document.getText();

  const home = getLeadHome(workspace);

  if (!home) {
    con.sendDiagnostics({
      uri: document.uri,
      diagnostics: [
        {
          message: "LeadLang is not installed or LEAD_HOME is not set!",
          range: {
            start: document.positionAt(0),
            end: document.positionAt(Number.MAX_VALUE)
          },
          severity: DiagnosticSeverity.Error,
          code: "Install",
          codeDescription: {
            href: "https://leadlang.github.io/download"
          },
          source: "LeadLang LEAD_HOME detector"
        }
      ]
    });
    return;
  }

  const ver = getVersion(workspace, home);

  if (!ver) {
    con.sendDiagnostics({
      uri: document.uri,
      diagnostics: [
        {
          message: "LeadLang version is not configured, consider creating a `.leadver` file with the version or configure one with `leadman use`!",
          range: {
            start: document.positionAt(0),
            end: document.positionAt(Number.MAX_VALUE)
          },
          severity: DiagnosticSeverity.Error,
          code: "Install",
          codeDescription: {
            href: "https://leadlang.github.io/download"
          },
          source: "LeadLang LEAD_HOME detector"
        }
      ]
    });
    return;
  }

  console.info(`[LeadHome] ${home}`);
  console.info(`[LeadVer] ${ver}`);

  const diagnostics = [];
  if (data.includes("\r")) {
    getAllIndexes(data, "\r").forEach((index) => {
      const diag: Diagnostic = {
        range: {
          start: document.positionAt(index),
          end: document.positionAt(index)
        },
        message: "Carriage Return (CRLF) files are not supported",
        severity: DiagnosticSeverity.Error,
        code: "CRLF",
        codeDescription: {
          href: "https://leadlang.github.io/errors/CRLF"
        }
      };

      diagnostics.push(
        diag
      )
    });

    con.sendDiagnostics({ uri: document.uri, diagnostics });
    return;
  }

  const lib = getLeadLibDir(home, ver);

  const diag = [];

  await parse(lib, workspace, diag, splitWithIndices(data, "\n"), document);

  con.sendDiagnostics({ uri: document.uri, diagnostics: diag });
}