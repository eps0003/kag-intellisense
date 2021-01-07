import * as vscode from "vscode";
import Param from "./param";

export default class Func {
	namespace: string | null;
	returnType: string;
	name: string;
	params: Param[];

	constructor(namespace: string | null, returnType: string, name: string, params: Param[]) {
		this.namespace = namespace;
		this.returnType = returnType;
		this.name = name;
		this.params = params;
	}

	toString(): string {
		const namespace = this.namespace ? this.namespace + "::" : "";
		return namespace + this.name;
	}

	toCompletionItem(): vscode.CompletionItem {
		return new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.Function);
	}
}
