import * as vscode from "vscode";
import Declaration from "./declaration";
import Signature from "./signature";

export default class Hook extends Declaration {
  signature: Signature;

  constructor(type: string, name: string, signature: Signature) {
    super(type, name);
    this.signature = signature;
  }

  toString(): string {
    return `${this.type} ${this.name}(${this.signature})`;
  }

  toSnippet(): vscode.SnippetString | string {
    return new vscode.SnippetString(`${this}\n{\n\t$0\n}`);
  }

  toCompletionItem(): vscode.CompletionItem {
    const item = new vscode.CompletionItem(
      this.toString(),
      vscode.CompletionItemKind.Event
    );
    item.insertText = this.toSnippet();
    return item;
  }
}
