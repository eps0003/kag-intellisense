import * as vscode from "vscode";
import Param from "./param";

export default class Method {
	returnType: string;
	name: string;
	params: Param[];

	constructor(returnType: string, name: string, params: Param[]) {
		this.returnType = returnType;
		this.name = name;
		this.params = params;
	}

	toString(): string {
		return this.name;
	}

	toCompletionItem(): vscode.CompletionItem {
		return new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.Method);
	}
}
