import * as vscode from "vscode";
import Declaration from "./declaration";

export default class Variable extends Declaration {
	namespace: string | null;

	constructor(namespace: string | null, type: string, name: string) {
		super(type, name);
		this.namespace = namespace;
	}

	toString(): string {
		const namespace = this.namespace ? this.namespace + "::" : "";
		return namespace + this.name;
	}

	toCompletionItem(): vscode.CompletionItem {
		return new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.Variable);
	}
}
