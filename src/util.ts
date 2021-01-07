import * as vscode from "vscode";

export function sanitise(document: vscode.TextDocument): string {
	let text = document.getText();

	// Remove single line comments
	text = text.replace(/\s*\/\/.*/g, "");

	// Remove contents of multi line comments
	text = text.replace(/\/\*(?:.|\n|\r)*?(?:\*\/|$)/g, "");

	// Remove contents of strings
	text = text.replace(/(?<=.*)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, "");

	return text;
}

export function isCursorInComment(document: vscode.TextDocument, position: vscode.Position): boolean {
	const lineAtCursor = document.lineAt(position.line).text.substr(0, position.character);
	const textToCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

	// Single line comment
	if (/\/\/.*$/g.test(lineAtCursor)) {
		return true;
	}

	// Multi line comment
	if (/(?:\/\*)([^\/])*$/.test(textToCursor)) {
		return true;
	}

	return false;
}

export function getAllVariableNames(document: vscode.TextDocument): string[] {
	const text = sanitise(document);
	const regex = /(?:^|[(,\n\s])(?:\w+\s+)?(?!return)\w+(?:@?(?:\[\])+|<.+>)?@?[^\S\n]+(\w+)[^\w(.]/g;
	const vars = new Set<string>();

	let match;
	while ((match = regex.exec(text))) {
		vars.add(match[1]);
	}

	return Array.from(vars);
}

export function getTrueType(type: string): string {
	// array<T>
	let match = /^(array)<.*>@?$/.exec(type);
	if (match) {
		return match[1];
	}

	// T[]
	match = /^(.+?)@?(?:\[\])+@?$/.exec(type);
	if (match) {
		return match[1];
	}

	return type;
}
