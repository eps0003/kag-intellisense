import * as vscode from "vscode";
import Declaration from "./declaration";
import Member from "./member";
import KAGObject from "./object";

export default class Property extends Declaration implements Member {
	parent: KAGObject;

	constructor(parent: KAGObject, type: string, name: string) {
		super(type, name);
		this.parent = parent;
	}

	toString(): string {
		return this.name;
	}

	toCompletionItem(): vscode.CompletionItem {
		return new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.Field);
	}
}
