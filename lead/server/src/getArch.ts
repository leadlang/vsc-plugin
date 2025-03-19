import path = require("node:path");
import { _Connection } from "vscode-languageserver";

// Find arch, x86_64 or aarch64
export function getArch(con: _Connection) {
  switch (process.arch) {
    case "x64":
      return "x86_64";
    case "arm64":
      return "aarch64";
    default:
      console.error(`Unsupported architecture: ${process.arch}`);
      con.window.showWarningMessage("Your current Operating System does not support Lead Lang Intellisense");
      return undefined;
  }
}

const getOs = (con: _Connection) => {
  switch (process.platform) {
    case "darwin":
      return "apple-darwin";
    case "win32":
      return "pc-windows-msvc";
    case "linux":
      return "unknown-linux-gnu";
    default:
      console.error(`Unsupported OS: ${process.platform}`);
      con.window.showWarningMessage("Your current Operating System does not support Lead Lang Intellisense");
      return undefined;
  }
};

export interface Library {
  load_all: (path: string) => ({
    cmds: {
      [key: string]: {
        package: string,
        description: string,
        regex: string,
        returns: string
      }
    };
    rts: {
      [key: string]: {
        [key: string]: {
          package: string,
          description: string,
          regex: string,
          returns: string
        }
      }
    }
  }),
  prefix: string,
  suffix: string
}

export async function downloadLibrust(con: _Connection, dir: string): Promise<Library> {
  const arch = getArch(con);

  if (!arch) process.exit(1);

  const os = getOs(con);

  if (!os) process.exit(1);

  const uri = path.join(dir, `${arch}-${os}.node`);
  const dll = require(uri);

  return dll;
}