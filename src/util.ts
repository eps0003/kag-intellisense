import * as vscode from "vscode";
import Manual from "./manual";
import KAGObject from "./object";
import Variable from "./variable";

export function sanitise(text: string): string {
	// Remove single line comments
	text = text.replace(/\s*\/\/.*/g, "");

	// Remove contents of multi line comments
	text = text.replace(/\/\*(?:.|\n|\r)*?(?:\*\/|$)/g, "");

	// Remove contents of strings
	text = text.replace(/(?<=.*)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, `""`);

	return text;
}

export function isCursorInComment(document: vscode.TextDocument, position: vscode.Position): boolean {
	const lineToCursor = document.lineAt(position.line).text.substr(0, position.character);
	const textToCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

	// Single line comment
	if (/\/\/.*$/g.test(lineToCursor)) {
		return true;
	}

	// Multi line comment
	if (/(?:\/\*)([^\/])*$/.test(textToCursor)) {
		return true;
	}

	return false;
}

export function isCursorInString(document: vscode.TextDocument, position: vscode.Position): boolean {
	const lineToCursor = document.lineAt(position.line).text.substr(0, position.character);

	const regex = /(?<=.*)("(?:[^"\\]|\\.)*("|$)|'(?:[^'\\]|\\.)*('|$))/g;
	const match = lineToCursor.match(regex);

	if (match && lineToCursor.endsWith(match[match.length - 1])) {
		return true;
	}

	return false;
}

export function getAllVariableNames(document: vscode.TextDocument): string[] {
	const text = sanitise(document.getText());
	const regex = /(?:^|[(,\n\s])(?!return|else)(?:const\s+)?(?:\w+(?:@?(?:\[\])+)?|array(?:<.+>))@?(?:\s+&(?:in|out|inout))?[^\S\n]+(\w+)[^\w(.]/g;
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
	if (/^(.+?)@?(?:\[\])+@?$/.test(type)) {
		return "array";
	}

	// T@
	match = /^(.+?)@?$/.exec(type);
	if (match) {
		return match[1];
	}

	return type;
}

export function getChain(document: vscode.TextDocument, position: vscode.Position): string[] {
	let lineToCursor = document.lineAt(position.line).text.substr(0, position.character);

	{
		// Remove things inside brackets
		const regex = /(\()[^\)].*?(\)(?:[^\)]|$))/;
		while (regex.test(lineToCursor)) {
			lineToCursor = lineToCursor.replace(regex, "$1$2");
		}
	}

	{
		// Get chain string
		const regex = /\s(\S*)$/;
		const match = lineToCursor.match(regex);
		if (match) {
			lineToCursor = match[1];
		}
	}

	const chain = lineToCursor.split(".");
	chain.pop();
	return chain;
}

export function getGlobalScriptVariables(document: vscode.TextDocument): Variable[] {
	const vars: Variable[] = [];

	const text = sanitise(document.getText());
	const lines = text.split("\n");

	const regex = /^(?:const\s+)?(\w+(?:@?(?:\[\])+)?|array(?:<.+>))@?\s+(\w+)/;

	for (const line of lines) {
		const match = regex.exec(line);
		if (match) {
			const type = getTrueType(match[1]);
			const name = match[2];
			vars.push(new Variable(null, type, name));
		}
	}
	return vars;
}

export function findVariableType(document: vscode.TextDocument, position: vscode.Position, varName: string): string | null {
	let text = "";

	// Get scope (really scuffed and not complete)
	const textToCursor = sanitise(document.getText(new vscode.Range(new vscode.Position(0, 0), position)));
	const lines = textToCursor.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i];
		if (/^\w/.test(line)) {
			text = lines.slice(i, lines.length).join("\n");
			break;
		}
	}

	let last: string | undefined;

	// Get last match
	let match;
	const regex = new RegExp(`(?:^|[(,\\n\\s])(?:const\s+)?(\\w+(?:@?(?:\\[\\])+)?|array(?:<.+>))@?(?:\\s+&(?:in|out|inout))?\\s+${varName}\\b`, "g");
	while ((match = regex.exec(text))) {
		last = match[1];
	}

	// Return last match
	if (last) {
		return getTrueType(last);
	}

	// Look for match in global script variables
	const globalVars = getGlobalScriptVariables(document);
	for (const variable of globalVars) {
		if (variable.name === varName) {
			return variable.type;
		}
	}

	// Couldn't find variable declaration
	return null;
}

export function parseChain(document: vscode.TextDocument, position: vscode.Position, manual: Manual): KAGObject | null {
	// Get chain
	const chain = getChain(document, position);
	if (!chain.length) {
		return null;
	}

	let obj: KAGObject | null = null;
	let type: string | null = null;

	// Iterate through chain
	for (let i = 0; i < chain.length; i++) {
		let text = chain[i];

		if (text.endsWith("()")) {
			text = text.slice(0, -2);

			if (i === 0) {
				// Function
				const func = manual.getFunction(text);
				type = func ? getTrueType(func.returnType) : null;
			} else if (obj) {
				// Method
				const method = obj.getMethod(text);
				type = method ? getTrueType(method.returnType) : null;
			}
		} else {
			if (i === 0) {
				// Variable
				type = findVariableType(document, position, chain[0]);
			} else if (obj) {
				// Property
				const property = obj.getProperty(text);
				type = property ? getTrueType(property.type) : null;
			}
		}

		// Couldn't find type
		if (!type) {
			return null;
		}

		obj = manual.getObject(type);
	}

	return obj;
}
