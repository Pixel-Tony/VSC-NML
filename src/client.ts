'use strict'

import * as path from 'path'
import * as vscode from 'vscode'
import { Executable, LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node'

export function activate(context: vscode.ExtensionContext) {
  const execPrefix = process.platform == 'win32' ? '.exe' : ''

  const { exec: serverExec, args: serverArgs } = (
    context.extensionMode == vscode.ExtensionMode.Production
      ? { exec: context.asAbsolutePath('NMLServer' + execPrefix) }
      : { exec: 'dotnet', args: ['run', '--project', context.asAbsolutePath(path.join('src', 'server'))] }
  )

  const serverOptions: ServerOptions = {
    run: <Executable>{ command: serverExec, args: serverArgs, options: { detached: false } },
    debug: <Executable>{ command: serverExec, args: serverArgs }
  }

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'nml' },
      { scheme: 'file', language: 'pnml' }
    ],
  }
  // Create the language client
  const client = new LanguageClient(
    'nmlclient',
    'NewGRF Meta Language',
    serverOptions,
    clientOptions
  )

  const disposable = vscode.commands.registerTextEditorCommand('nml-language.drawAST',
    (textEditor: vscode.TextEditor) => {
      if (context.extensionMode != vscode.ExtensionMode.Development)
        return vscode.window.showErrorMessage("Command only available in debug")

      client.sendRequest("nml/debug/drawAST", textEditor.document.uri.toString())
        .then(async (s: string) => await vscode.commands.executeCommand(
          "vscode.openWith", vscode.Uri.file(s), "imagePreview.previewEditor"))
    })

  context.subscriptions.push(client.start(), disposable)
}