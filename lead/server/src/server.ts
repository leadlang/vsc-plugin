/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
  createConnection, TextDocuments, ProposedFeatures, TextDocumentSyncKind,
  TextDocumentChangeEvent
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';
import { downloadLibrust, Library } from './getArch';

export let library: Library = null;

// Creates the LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create a manager for open text documents
const documents = new TextDocuments(TextDocument);

// The workspace folder this server is operating on
export let workspaceFolder: string | null;

let eventBuffer: TextDocumentChangeEvent<TextDocument>[] = []
documents.onDidChangeContent(event => eventBuffer.push(event))

const setIntervalAysync = (f: () => Promise<void>, d = 1000) => {
  const fn = async () => {
    await f();
    setTimeout(fn, d);
  }

  setTimeout(fn, d);
}

setIntervalAysync(async () => {
  if (eventBuffer.length > 0) {
    const event = eventBuffer.pop()
    eventBuffer = []

    if (event) {
      console.log("Firing");
    }
  }
}, 1000);

documents.listen(connection);

connection.onInitialize(async (params) => {
  workspaceFolder = params.rootUri;

  const dir = params.initializationOptions.dir;

  connection.console.log(dir);
  connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Started and initialize received`);

  library = await downloadLibrust(connection, dir);

  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental
      }
    }
  };
});
connection.listen();