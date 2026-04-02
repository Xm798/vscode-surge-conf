import * as vscode from 'vscode';
import { SurgeFormatter } from './formatter';

export function activate(context: vscode.ExtensionContext) {
  const formatter = new SurgeFormatter();

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('surge', formatter),
    vscode.languages.registerDocumentRangeFormattingEditProvider('surge', formatter)
  );
}

export function deactivate() {}
