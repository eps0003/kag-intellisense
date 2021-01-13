import * as vscode from "vscode";
import Declaration from "./declaration";

export default class Enum extends Declaration {
	namespace: string;

	constructor(namespace: string, name: string) {
		super("int", name);
		this.namespace = namespace;
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
