'use strict'

import * as path from 'path'
import { ExtensionContext, ExtensionMode } from 'vscode'
import { Executable, LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node'

export function activate(context: ExtensionContext) {
  const execPrefix = process.platform == 'win32' ? '.exe' : ''

  const { exec: serverExec, args: serverArgs } = (
    context.extensionMode == ExtensionMode.Production
      ? { exec: context.asAbsolutePath('NMLServer' + execPrefix) }
      : { exec: 'dotnet', args: ['run', '--project', context.asAbsolutePath(path.join('src', 'server'))] }
  )

  const serverOptions: ServerOptions = {
    run: <Executable>{
      command: serverExec, args: serverArgs, options: { detached: false },
    },
    debug: <Executable>{
      // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
      command: serverExec, args: serverArgs, options: { execArgv: ['--nolazy', '--inspect=6009'] }
    }
  }

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'nml' },
      { scheme: 'file', language: 'pnml' }
    ],
    // synchronize: { fileEvents: workspace.createFileSystemWatcher("**/.clientrc") },
  }
  // Create the language client
  const client = new LanguageClient(
    'nmlserver',
    'NML Intellisense Server',
    serverOptions,
    clientOptions
  )
  // Start the client. This will also launch the server
  context.subscriptions.push(client.start())
}