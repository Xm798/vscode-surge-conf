import * as vscode from 'vscode';
import { SurgeFormatter } from './formatter';
import { SurgeCompletionProvider } from './completion';
import { SurgeHoverProvider } from './hover';

export function activate(context: vscode.ExtensionContext) {
  const formatter = new SurgeFormatter();
  const completionProvider = new SurgeCompletionProvider();
  const hoverProvider = new SurgeHoverProvider();

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('surge', formatter),
    vscode.languages.registerDocumentRangeFormattingEditProvider('surge', formatter),
    vscode.languages.registerCompletionItemProvider('surge', completionProvider, '[', '#', ',', '='),
    vscode.languages.registerHoverProvider('surge', hoverProvider)
  );
}

export function deactivate() {}
