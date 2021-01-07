import * as vscode from "vscode";

export default class Variable {
	namespace: string | null;
	type: string;
	name: string;

	constructor(namespace: string | null, type: string, name: string) {
		this.namespace = namespace;
		this.type = type;
		this.name = name;
	}

	toString(): string {
		const namespace = this.namespace ? this.namespace + "::" : "";
		return namespace + this.name;
	}

	toCompletionItem(): vscode.CompletionItem {
		return new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.Variable);
	}
}
