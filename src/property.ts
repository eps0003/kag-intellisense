import * as vscode from "vscode";

export default class Property {
	type: string;
	name: string;

	constructor(type: string, name: string) {
		this.type = type;
		this.name = name;
	}

	toString(): string {
		return this.name;
	}

	toCompletionItem(): vscode.CompletionItem {
		return new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.Property);
	}
}
