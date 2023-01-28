import * as fs from "fs";
import * as vscode from "vscode";
import BaseFolder from "./base-folder";
import Func from "./function";
import Manual from "./manual";
import KAGObject from "./object";
import Signature from "./signature";
import Subroutine from "./subroutine";
import Variable from "./variable";

// Checks for strings and both types of comments: /string|block comment|line comment/
export const stringCommentRegex =
  /(["'])(?:[^\1\\]|\\.)*?(?:\1|$)|\/\*(?:[^/]|[^*]\/)*(?:\*\/|$)|\/\/.*/g;

export function canShowCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  const text = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  );

  const match = text.match(stringCommentRegex);
  if (!match) {
    // No string or comments exist
    return true;
  }

  const lastMatch = match[match.length - 1];
  if (!text.endsWith(lastMatch)) {
    // Text doesnt end with string or comment
    return true;
  }

  if (/^["']/.test(lastMatch)) {
    // String
    const quote = lastMatch.charAt(0);
    // Check if string is not closed
    if (new RegExp(`(^${quote}|\\\\${quote}|[^${quote}])$`).test(lastMatch)) {
      // Inside string
      return false;
    }
  } else if (lastMatch.startsWith("/*")) {
    // Block comment
    // Check if comment is not closed
    if (!lastMatch.endsWith("*/")) {
      // Inside comment
      return false;
    }
  } else {
    // Line comment
    return false;
  }

  return true;
}

export function sanitise(
  document: vscode.TextDocument,
  position: vscode.Position | undefined = undefined,
  notStrings = false
): string {
  let text = document.getText(
    position ? new vscode.Range(new vscode.Position(0, 0), position) : undefined
  );
  text = sanitiseStringsAndComments(text, notStrings);
  text = fixPointerHandles(text);
  return text;
}

export function sanitiseStringsAndComments(
  text: string,
  notStrings = false
): string {
  return text.replace(stringCommentRegex, (match, quote) => {
    if (quote) {
      if (notStrings) {
        // Ignore strings
        return match;
      }

      // Replace contents of string with spaces
      // /[^"\s]|(?<=\\)"/g.source with occurences of " replaced with ${quote}
      return match.replace(
        new RegExp(`[^${quote}\\s]|(?<=\\\\)${quote}`, "g"),
        " "
      );
    }

    // Entirely replace comments with spaces
    return match.replace(/\S/g, " ");
  });
}

export function fixPointerHandles(text: string): string {
  return text.replace(/(?<=[\w\]>])\s+@\s*/g, (match) => {
    const len = match.length - 1;
    return "@" + " ".repeat(len);
  });
}

export function getVariableNames(
  document: vscode.TextDocument,
  position: vscode.Position
): string[] {
  let textToCursor = removeCodeOutOfScope(sanitise(document, position));

  // Check if cursor is within a function
  if (/{/g.test(textToCursor)) {
    // Get variables in scope
    const regex =
      /(?:^|[(,\n\s])(?!return|else)(?:const\s+)?(?:\w+(?:@?(?:\[\])+)?|array(?:<.+>))@?(?:\s+&(?:in|out|inout))?[^\S\n]+(\w+)[^\w(.]/g;
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

export function getGlobalScriptVariables(
  document: vscode.TextDocument
): Variable[] {
  const vars: Variable[] = [];

  const text = sanitise(document);
  const lines = text.split("\n");

  const regex =
    /^(?:const\s+)?(\w+(?:@?(?:\[\])+)?|array(?:<.+>))@?\s+(\w+)\s*(?:;|=)/;

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

export function getChain(
  document: vscode.TextDocument,
  position: vscode.Position
): string[] {
  let textToCursor = sanitise(document, position);

  {
    // Remove things inside brackets
    const regex = /\((?:\(\)|[^(])+?\)/g;
    textToCursor = textToCursor.replace(regex, "()");
  }

  {
    // Get chain string
    const regex = /(\w*\s*(\(\))?\s*(\.|$))+$/;
    const match = textToCursor.match(regex);
    if (match) {
      const chain = match[0].split(".").map((x) => x.replace(/\s+/g, ""));
      chain.pop();
      return chain;
    }
  }

  return [];
}

export function getChainWithArgs(
  document: vscode.TextDocument,
  position: vscode.Position
): [string[], string[]] | null {
  let textToCursor = sanitise(document, position);

  // Check if inside method brackets
  if (/\(([^)]|\(\))*$/.test(textToCursor)) {
    {
      // Remove things inside brackets
      const regex = /\((?:\(\)|[^(])+?\)/g;
      textToCursor = textToCursor.replace(regex, "()");
    }

    {
      // Get chain string
      // (\w*\s*(?:\(\))?\s* - first variable or function
      // (?:\s*\.\s*\w+\s*(?:\(\))?)*) - chained properties or methods
      // \(((?:\(\)|[^(])*?)$ - arguments
      const regex =
        /(\w*\s*(?:\(\))?\s*(?:\s*\.\s*\w+\s*(?:\(\))?)*)\(((?:\(\)|[^(])*?)$/;
      const match = textToCursor.match(regex);
      if (match) {
        textToCursor = match[1];
        const args = match[2].split(/\s*,\s*/);

        const chain = textToCursor.split(".").map((x) => x.replace(/\s+/g, ""));
        chain[chain.length - 1] += "()";

        return [chain, args];
      }
    }
  }

  return null;
}

export function findVariableType(
  document: vscode.TextDocument,
  position: vscode.Position,
  varName: string
): string | null {
  let textToCursor = removeCodeOutOfScope(sanitise(document, position));

  // Check if cursor is within a function
  if (/{/g.test(textToCursor)) {
    let last: string | undefined;

    // Get last variable declaration
    let match;
    const regex = new RegExp(
      `(?:^|[(,\\n\\s])(?:const\s+)?(\\w+(?:@?(?:\\[\\])+)?|array(?:<.+>))@?(?:\\s+&(?:in|out|inout))?\\s+${varName}\\b`,
      "g"
    );
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

export function parseChainForLastObject(
  chain: string[],
  document: vscode.TextDocument,
  position: vscode.Position,
  manual: Manual
): KAGObject | null {
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

export function parseChainForLastSubroutine(
  chain: string[],
  document: vscode.TextDocument,
  position: vscode.Position,
  manual: Manual
): Subroutine | null {
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

export function filterUnique(
  value: any,
  index: number,
  arr: Array<any>
): boolean {
  return arr.indexOf(value) === index;
}

export function removeCodeOutOfScope(text: string) {
  const regex = /{([^{]|{})+?}/g;
  while (regex.test(text)) {
    text = text.replace(regex, "{}");
  }
  return text;
}

export function getScriptFunctions(
  document: vscode.TextDocument,
  funcs: { [name: string]: Func } = {}
): { [name: string]: Func } {
  const text = sanitise(document);

  const regex = /(?:^|\n)(\S+)[^\S\n]+(\w+)\((.*)\)/g;
  let match;
  while ((match = regex.exec(text))) {
    const type = match[1];
    const name = match[2];
    const signature = Signature.parse(match[3]);

    const key = `::${name}`;

    if (!funcs.hasOwnProperty(key)) {
      funcs[key] = new Func(null, type, name);
    }

    funcs[key].addSignature(signature);
  }

  return funcs;
}

export function getScriptClasses(document: vscode.TextDocument): KAGObject[] {
  const text = sanitise(document);

  const objArray: KAGObject[] = [];

  //\bclass\s+(\w+)
  //\bclass\s+(\w+)(?:.|\n)*?\{
  //(?<=\bclass\s+(\w+)(?:.|\n)*?\{(?:.|\n)*)(private\b|protected\b)?\s*(\S+)\s+(\w+)\s*(?:=\s*(\S+))?;

  return objArray;
}

export function checkForProblems(
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  const text = sanitise(document);
  const diagnostics: vscode.Diagnostic[] = [];

  // {
  // 	// Missing semicolon after #include
  // 	const regex = /(?<=#include\s+(["']).*?)\1(?!;)/g;
  // 	let match;
  // 	while ((match = regex.exec(text))) {
  // 		diagnostics.push(getDiagnostic(text, match, "Missing semicolon", vscode.DiagnosticSeverity.Error));
  // 	}
  // }

  // {
  // 	// 'const' not initialized
  // 	const regex = /(?<=(^|[;{}()])\s*const\s+\S+\s+)\w+(?=\s*;)/g;
  // 	let match;
  // 	while ((match = regex.exec(text))) {
  // 		diagnostics.push(getDiagnostic(text, match, "'const' declarations must be initialized", vscode.DiagnosticSeverity.Error));
  // 	}
  // }

  return diagnostics;
}

export function getDiagnostic(
  text: string,
  match: RegExpExecArray,
  message: string,
  severity: vscode.DiagnosticSeverity
): vscode.Diagnostic {
  const prevText = text.slice(0, match.index);
  const lines = prevText.split("\r\n");
  const line = lines.length - 1;
  const char = lines[lines.length - 1].length;
  const range = new vscode.Range(line, char, line, char + match[0].length);
  return new vscode.Diagnostic(range, message, severity);
}

export function getIncludes(document: vscode.TextDocument): string[] {
  const text = removeCodeOutOfScope(sanitise(document, undefined, true));
  const includes: string[] = [];

  const regex = /#include\s+(["'])(.*?[^\\])\1/g;
  let match;
  while ((match = regex.exec(text))) {
    includes.push(match[2]);
  }

  return includes;
}

export function getIncludeDocuments(
  document: vscode.TextDocument
): Promise<vscode.TextDocument[]> {
  const promises: Thenable<vscode.TextDocument>[] = [];

  const includes = getIncludes(document);
  for (const include of includes) {
    const fullIncludes = BaseFolder.getInclude(include);
    if (!fullIncludes.length) {
      console.warn("Included file not found: " + include);
      continue;
    }

    promises.push(vscode.workspace.openTextDocument(fullIncludes[0]));
  }

  return Promise.all(promises);
}

export function getKAGPath(): string {
  return vscode.workspace.getConfiguration("KAG").path;
}

export function promptInvalidKAGPath(): void {
  if (!fs.existsSync(getKAGPath())) {
    vscode.window
      .showInformationMessage(
        "KAG AngelScript IntelliSense was unable to start because an invalid/nonexistent KAG path was provided",
        "Set Path"
      )
      .then((value) => {
        if (value) {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "KAG.path"
          );
        }
      });
  }
}
