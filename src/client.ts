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

  const hoverDataPath = path.join(context.extensionPath, 'src', 'hoverData.json');
	let hoverData = loadHoverData(hoverDataPath);

	// Watcher: automatically reload the hoverData.json everytime it's changed
	const watcher = fs.watch(hoverDataPath, (eventType) => {
		if (eventType === 'change') {
			try {
				hoverData = loadHoverData(hoverDataPath);
				console.log('hoverData.json automatically reloaded');
			} catch (err) {
				console.error('An error ocurred while loading hoverData.json:', err);
			}
		}
	});

	const provider = vscode.languages.registerHoverProvider('nml', {
		provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(position);
			const word = document.getText(range);

			const info = hoverData[word];
			if (info) {
				const md = new vscode.MarkdownString();
				if (info.title) {
					md.appendCodeblock(`${info.title}`, "ts");
				} else {
					md.appendMarkdown(`**${word}**\n\n\n`);
				}
				md.appendMarkdown(`${info.description}\n\n`);
				if (info.example) {
					md.appendCodeblock(info.example, 'ts'); // later on I'll change it to NML once this s+++ works.
				}
				md.isTrusted = true;
				return new vscode.Hover(md);
			}
			return null;
		}
	});

	context.subscriptions.push(provider);
	context.subscriptions.push({ dispose: () => watcher.close() });
}

function loadHoverData(filePath: string): Record<string, any> {
	const raw = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(raw);
}


