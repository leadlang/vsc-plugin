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
      con.sendNotification("unsupported");
      process.exit(1);
  }
}