import * as vscode from "vscode";
import Func from "./function";
import Manual from "./manual";
import KAGObject from "./object";
import Param from "./param";
import Signature from "./signature";
import Subroutine from "./subroutine";
import Variable from "./variable";

export function removeComments(text: string): string {
	// Remove single line comments
	text = text.replace(/\s*\/\/.*/g, "");

	// Remove multi line comments
	text = text.replace(/\/\*(?:.|\n|\r)*?(?:\*\/|$)/g, "");

	return text;
}

export function sanitise(text: string): string {
	// Remove contents of strings
	text = text.replace(/(?<=.*)("(?:[^"\\]|\\.)*(?:"|$)|'(?:[^'\\]|\\.)*(?:'|$))/g, (x) => {
		// Get quote type
		const quote = x.charAt(0);

		const closed = x.endsWith(quote);

		// Remove quotes
		x = x.slice(1, closed ? -1 : undefined);

		const len = x.length;
		return quote + (len > 0 ? " ".repeat(len) : "") + (closed ? quote : "");
	});

	// Remove single line comments
	text = text.replace(/\/\/.*/g, (x) => {
		const len = x.length - 2;
		return "//" + (len > 0 ? " ".repeat(len) : "");
	});

	// Remove contents of multi line comments
	text = text.replace(/\/\*(?:.|\n|\r)*?(?:\*\/|$)/g, (x) => {
		// Remove /*
		x = x.slice(2);

		// Remove */ if there is one
		const closed = x.endsWith("*/");
		if (closed) {
			x = x.slice(0, -2);
		}

		// Replace contents of each line
		x = x
			.split("\n")
			.map((line) => {
				const len = line.length;
				return len > 0 ? " ".repeat(len) : "";
			})
			.join("\n");

		// Append /* */ and return sanitised comment
		return "/*" + x + (closed ? "*/" : "");
	});

	return text;
}

export function isCursorInComment(document: vscode.TextDocument, position: vscode.Position): boolean {
	const lineToCursor = sanitise(document.lineAt(position.line).text.substr(0, position.character));
	const textToCursor = sanitise(document.getText(new vscode.Range(new vscode.Position(0, 0), position)));

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

export function getVariableNames(document: vscode.TextDocument, position: vscode.Position): string[] {
	let textToCursor = removeCodeOutOfScope(removeComments(sanitise(document.getText(new vscode.Range(new vscode.Position(0, 0), position)))));

	// Check if cursor is within a function
	if (/{/g.test(textToCursor)) {
		// Get variables in scope
		const regex = /(?:^|[(,\n\s])(?!return|else)(?:const\s+)?(?:\w+(?:@?(?:\[\])+)?|array(?:<.+>))@?(?:\s+&(?:in|out|inout))?[^\S\n]+(\w+)[^\w(.]/g;
		const vars = new Set<string>();

		let match;
		while ((match = regex.exec(textToCursor))) {
			vars.add(match[1]);
		}

		return Array.from(vars);
	}

	// Return global variables
	return getGlobalScriptVariables(document)
		.map((x) => x.name)
		.filter(filterUnique);
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

export function getGlobalScriptVariables(document: vscode.TextDocument): Variable[] {
	const vars: Variable[] = [];

	const text = removeComments(sanitise(document.getText()));
	const lines = text.split("\n");

	const regex = /^(?:const\s+)?(\w+(?:@?(?:\[\])+)?|array(?:<.+>))@?\s+(\w+)\s*(?:;|=)/;

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

export function getChain(document: vscode.TextDocument, position: vscode.Position): string[] {
	let textToCursor = removeComments(document.getText(new vscode.Range(new vscode.Position(0, 0), position)));

	{
		// Remove things inside brackets
		const regex = /\((?:\(\)|[^(])+?\)/g;
		textToCursor = textToCursor.replace(regex, "()");
	}

	{
		// Remove whitespace around fullstops and brackets
		const regex = /\s*([.()])\s*/g;
		textToCursor = textToCursor.replace(regex, (match, symbol) => symbol);
	}

	{
		// Get chain string
		const regex = /(?:[\w.:]|\(\)\.)+$/;
		const match = textToCursor.match(regex);
		if (match) {
			const chain = match[0].split(".");
			chain.pop();
			return chain;
		}
	}

	return [];
}

export function getChainWithArgs(document: vscode.TextDocument, position: vscode.Position): [string[], string[]] | null {
	let textToCursor = removeComments(document.getText(new vscode.Range(new vscode.Position(0, 0), position)));

	// Check if inside method brackets
	if (/\(([^)]|\(\))*$/.test(textToCursor)) {
		{
			// Remove things inside brackets
			const regex = /\((?:\(\)|[^(])+?\)/g;
			textToCursor = textToCursor.replace(regex, "()");
		}

		{
			// Remove whitespace around fullstops and brackets
			const regex = /\s*([.()])\s*/g;
			textToCursor = textToCursor.replace(regex, (match, symbol) => symbol);
		}

		{
			// Get chain string
			const regex = /((?:\(\)|[^(,\s])*)\(((?:\(\)|[^(])*?)$/;
			const match = textToCursor.match(regex);
			if (match) {
				textToCursor = match[1];
				const args = match[2].split(/\s*,\s*/);

				const chain = textToCursor.split(".");
				chain[chain.length - 1] += "()";

				return [chain, args];
			}
		}
	}

	return null;
}

export function findVariableType(document: vscode.TextDocument, position: vscode.Position, varName: string): string | null {
	let textToCursor = removeCodeOutOfScope(removeComments(sanitise(document.getText(new vscode.Range(new vscode.Position(0, 0), position)))));

	// Check if cursor is within a function
	if (/{/g.test(textToCursor)) {
		let last: string | undefined;

		// Get last variable declaration
		let match;
		const regex = new RegExp(`(?:^|[(,\\n\\s])(?:const\s+)?(\\w+(?:@?(?:\\[\\])+)?|array(?:<.+>))@?(?:\\s+&(?:in|out|inout))?\\s+${varName}\\b`, "g");
		while ((match = regex.exec(textToCursor))) {
			last = match[1];
		}

		// Return type of last match
		if (last) {
			return getTrueType(last);
		}
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

export function parseChainForLastObject(chain: string[], document: vscode.TextDocument, position: vscode.Position, manual: Manual): KAGObject | null {
	let obj: KAGObject | null = null;
	let type: string | null = null;

	// Iterate through chain
	for (let i = 0; i < chain.length; i++) {
		let text = chain[i];

		if (text.endsWith("()")) {
			text = text.slice(0, -2);

			if (i === 0) {
				const kagObject = manual.getObject(text);
				if (kagObject && kagObject.construct) {
					// Constructor
					type = kagObject.type;
				} else {
					// Function
					const funcs = getScriptFunctions(document, manual.functions);
					const func = funcs[`::${text}`];
					type = func ? getTrueType(func.type) : null;
				}
			} else if (obj) {
				// Method
				const method = obj.getMethod(text);
				type = method ? getTrueType(method.type) : null;
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

export function parseChainForLastSubroutine(chain: string[], document: vscode.TextDocument, position: vscode.Position, manual: Manual): Subroutine | null {
	let obj: KAGObject | null = null;
	let type: string | null = null;
	let subroutine: Subroutine | null = null;

	// Iterate through chain
	for (let i = 0; i < chain.length; i++) {
		let text = chain[i];

		if (text.endsWith("()")) {
			text = text.slice(0, -2);

			if (i === 0) {
				const kagObject = manual.getObject(text);
				if (kagObject && kagObject.construct) {
					// Constructor
					type = kagObject.type;
					subroutine = kagObject.construct;
				} else {
					// Function
					const match = text.match(/(?:(\w+)::)?(\w+)/);
					if (match) {
						const namespace = match[1] || null;
						const name = match[2];

						const funcs = getScriptFunctions(document, manual.functions);
						const func = funcs[`${namespace || ""}::${name}`];
						type = func ? getTrueType(func.type) : null;
						subroutine = func;
					}
				}
			} else if (obj) {
				// Method
				const method = obj.getMethod(text);
				type = method ? getTrueType(method.type) : null;
				subroutine = method;
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

			subroutine = null;
		}

		// Couldn't find type
		if (!type) {
			return null;
		}

		obj = manual.getObject(type);
	}

	return subroutine;
}

export function filterUnique(value: any, index: number, arr: Array<any>): boolean {
	return arr.indexOf(value) === index;
}

export function removeCodeOutOfScope(text: string) {
	const regex = /{[^{]*?}/g;
	while (regex.test(text)) {
		text = text.replace(regex, "");
	}
	return text;
}

export function getScriptFunctions(document: vscode.TextDocument, funcs: { [name: string]: Func } = {}): { [name: string]: Func } {
	const text = removeComments(sanitise(document.getText()));

	// Clone to make sure we aren't adding to the manual's functions
	funcs = { ...funcs };

	const regex = /(?:^|\n)(\S+)[^\S\n]+(\w+)\((.*)\)/g;
	let match;
	while ((match = regex.exec(text))) {
		const type = match[1];
		const name = match[2];
		const params = match[3]
			.trim()
			.split(/\s*,\s*/g)
			.filter(Boolean)
			.map((str) => {
				const [type, name] = str.split(/\s+/);
				return new Param(type, name);
			});

		const key = `::${name}`;

		if (!funcs.hasOwnProperty(key)) {
			funcs[key] = new Func(null, type, name);
		}

		funcs[key].addSignature(new Signature(params));
	}

	return funcs;
}
