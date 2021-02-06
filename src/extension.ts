import * as vscode from "vscode";
import BaseFolder from "./base-folder";
import Func from "./function";
import Manual from "./manual";
import * as util from "./util";

const primitives = ["void", "bool", "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64", "s8", "s16", "s32", "s64", "u8", "u16", "u32", "u64"];

const help = new vscode.SignatureHelp();
let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
	util.promptInvalidKAGPath();

	const manual = Manual.getManual();
	if (!manual) {
		return;
	}

	BaseFolder.getFiles();

	diagnosticCollection = vscode.languages.createDiagnosticCollection("angelscript");
	context.subscriptions.push(diagnosticCollection);

	vscode.workspace.onDidChangeTextDocument((changeEvent) => {
		const uri = changeEvent.document.uri;
		const diagnostics = util.checkForProblems(changeEvent.document);

		diagnosticCollection.clear();
		diagnosticCollection.set(uri, diagnostics);
	});

	vscode.languages.registerSignatureHelpProvider(
		"angelscript",
		{
			provideSignatureHelp(document, position, token, context) {
				const chainArgs = util.getChainWithArgs(document, position);
				if (!chainArgs) {
					return null;
				}

				const [chain, args] = chainArgs;
				const subroutine = util.parseChainForLastSubroutine(chain, document, position, manual);
				if (!subroutine) {
					return null;
				}

				help.signatures = subroutine.toSignatureInformation();
				help.activeParameter = args.length - 1;

				return help;
			},
		},
		",",
		"("
	);

	vscode.languages.registerCompletionItemProvider(
		"angelscript",
		{
			async provideCompletionItems(document, position, token, context) {
				if (!util.canShowCompletionItems(document, position)) {
					return;
				}

				// Get text on current line up to cursor
				const textToCursor = util.sanitise(document, position);

				const items: vscode.CompletionItem[] = [];

				const chain = util.getChain(document, position);
				if (chain.length) {
					const obj = util.parseChainForLastObject(chain, document, position, manual);
					if (obj) {
						items.push(...obj.methods.map((x) => x.toCompletionItem()));
						items.push(...obj.properties.map((x) => x.toCompletionItem()));
					}
				} else {
					items.push(...manual.enums.map((x) => x.toCompletionItem()));
					items.push(...manual.variables.map((x) => x.toCompletionItem()));
					items.push(...manual.objects.map((x) => x.toCompletionItem()));
					items.push(...util.getVariableNames(document, position).map((x) => new vscode.CompletionItem(x, vscode.CompletionItemKind.Variable)));
					items.push(...primitives.map((x) => new vscode.CompletionItem(x, vscode.CompletionItemKind.Keyword)));

					if (/^([^{]|{})*$/.test(util.removeCodeOutOfScope(textToCursor))) {
						items.push(...manual.hooks.map((x) => x.toCompletionItem()));
					}

					// Clone to make sure we aren't adding to the manual's functions
					const funcs = { ...manual.functions };

					// Get functions in the current document
					util.getScriptFunctions(document, funcs);

					// Get functions in included documents
					const documents = await util.getIncludeDocuments(document);
					for (const document of documents) {
						util.getScriptFunctions(document, funcs);
					}

					// Convert functions to completion items
					items.push(...Object.values(funcs).map((x) => x.toCompletionItem()));
				}

				return items;
			},
		},
		"."
	);
}

export function deactivate() {}
