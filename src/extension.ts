import * as vscode from "vscode";
import * as util from "./util";
import Manual from "./manual";

const types = ["void", "int8", "int16", "int", "int64", "uint8", "uint16", "uint", "uint64", "s8", "s16", "s32", "s64", "u8", "u16", "u32", "u64"];
const hookRegex = new RegExp(`^((?:${types.join("|")})?\\s*\\w*)?$`);

export function activate(context: vscode.ExtensionContext) {
	const manual = new Manual("D:/KAG/KAG dev/Manual/interface/");

	vscode.languages.registerSignatureHelpProvider("angelscript", {
		provideSignatureHelp(document, position, token, context) {
			return null;
		},
	});

	vscode.languages.registerCompletionItemProvider("angelscript", {
		provideCompletionItems(document, position, token, context) {
			// Get text on current line up to cursor
			let text = document.lineAt(position.line).text.substr(0, position.character);

			// Don't show completion items if cursor is in a comment
			if (util.isCursorInComment(document, position)) {
				return null;
			}

			const items: vscode.CompletionItem[] = [];

			if (hookRegex.test(text)) {
				items.push(...manual.hooks.map((x) => x.toCompletionItem()));
			}

			if (/^(?<=^|[^\w\s)@.])\s*\w*$/.test(text)) {
				items.push(...manual.enums.map((x) => x.toCompletionItem()));
				items.push(...manual.functions.map((x) => x.toCompletionItem()));
				items.push(...manual.variables.map((x) => x.toCompletionItem()));
				items.push(...manual.objects.map((x) => x.toCompletionItem()));
				items.push(...util.getAllVariableNames(document).map((x) => new vscode.CompletionItem(x, vscode.CompletionItemKind.Variable)));
			}

			return items;
		},
	});
}

export function deactivate() {}
