import * as vscode from "vscode";

export default class Enum {
	namespace: string;
	name: string;

	constructor(namespace: string, name: string) {
		this.namespace = namespace;
		this.name = name;
	}

	toString(): string {
		return `${this.namespace}::${this.name}`;
	}

	toSnippet(): vscode.SnippetString | string {
		return new vscode.SnippetString(`${this.namespace.split("::")[0]}::${this.name}`);
	}

	toCompletionItem(): vscode.CompletionItem {
		const item = new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.EnumMember);
		item.insertText = this.toSnippet();
		return item;
	}
}
