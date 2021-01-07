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
		const formattedParams = this.params.map((param) => `${param.type} ${param.name}`).join(", ");
		return `${this.returnType} ${this.name}(${formattedParams})`;
	}

	toSnippet(): vscode.SnippetString | string {
		return new vscode.SnippetString(`${this.toString()}\n{\n\t$0\n}`);
	}

	toCompletionItem(): vscode.CompletionItem {
		const item = new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.Function);
		item.insertText = this.toSnippet();
		return item;
	}
}
