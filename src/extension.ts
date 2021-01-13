import * as vscode from "vscode";
import Manual from "./manual";
import * as util from "./util";

const primitives = ["void", "bool", "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64", "s8", "s16", "s32", "s64", "u8", "u16", "u32", "u64"];
const hookRegex = new RegExp(`^((${primitives.join("|")})\\s*)?\\w*$`);

const help = new vscode.SignatureHelp();

export function activate(context: vscode.ExtensionContext) {
	const manual = new Manual("D:/KAG/KAG dev/Manual/interface/");

	vscode.languages.registerSignatureHelpProvider(
		"angelscript",
		{
			provideSignatureHelp(document, position, token, context) {
				// Don't show signature help if cursor is in a string or comment
				if (util.isCursorInString(document, position) || util.isCursorInComment(document, position)) {
					return null;
				}

				const chainArgs = util.getChainWithArgs(document, position);
				if (!chainArgs) {
					return null;
				}

				const [chain, args] = chainArgs;
				const subroutine = util.parseChainForLastSubroutine(chain, document, position, manual);
				if (subroutine) {
					help.signatures = subroutine.toSignatureInformation();
					help.activeParameter = args.length - 1;
				}

				return help;
			},
		},
		",",
		"("
	);

	vscode.languages.registerCompletionItemProvider(
		"angelscript",
		{
			provideCompletionItems(document, position, token, context) {
				// Get text on current line up to cursor
				const lineToCursor = document.lineAt(position.line).text.substr(0, position.character);

				// Don't show completion items if cursor is in a string or comment
				if (util.isCursorInString(document, position) || util.isCursorInComment(document, position)) {
					return null;
				}

				const items: vscode.CompletionItem[] = [];

				if (/\.\w*$/.test(lineToCursor)) {
					const chainArr = util.getChain(document, position);
					const obj = util.parseChainForLastObject(chainArr, document, position, manual);
					if (obj) {
						items.push(...obj.methods.map((x) => x.toCompletionItem()));
						items.push(...obj.properties.map((x) => x.toCompletionItem()));
					}
				} else if (hookRegex.test(lineToCursor)) {
					items.push(...manual.hooks.map((x) => x.toCompletionItem()));
				}

				if (/(^|[\s,(])\w*$/.test(lineToCursor)) {
					items.push(...manual.enums.map((x) => x.toCompletionItem()));
					items.push(...manual.functions.map((x) => x.toCompletionItem()));
					items.push(...manual.variables.map((x) => x.toCompletionItem()));
					items.push(...manual.objects.map((x) => x.toCompletionItem()));
					items.push(...util.getVariableNames(document, position).map((x) => new vscode.CompletionItem(x, vscode.CompletionItemKind.Variable)));
					items.push(...primitives.map((x) => new vscode.CompletionItem(x, vscode.CompletionItemKind.Keyword)));
				}

				return items;
			},
		},
		"."
	);
}

export function deactivate() {}
