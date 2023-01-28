import * as vscode from "vscode";
import Declaration from "./declaration";
import Member from "./member";
import KAGObject from "./object";
import Signature from "./signature";
import Subroutine from "./subroutine";

export default class Method extends Declaration implements Member, Subroutine {
  parent: KAGObject;
  signatures: Signature[];

  constructor(parent: KAGObject, type: string, name: string) {
    super(type, name);
    this.parent = parent;
    this.signatures = [];
  }

  addSignature(signature: Signature) {
    this.signatures.push(signature);
  }

  toString(): string {
    return this.name;
  }

  toCompletionItem(): vscode.CompletionItem {
    return new vscode.CompletionItem(
      this.toString(),
      vscode.CompletionItemKind.Method
    );
  }

  toSignatureInformation(): vscode.SignatureInformation[] {
    const infoArr: vscode.SignatureInformation[] = [];
    const signatures = this.signatures.sort(
      (a, b) => a.params.length - b.params.length
    );
    for (const signature of signatures) {
      const info = new vscode.SignatureInformation(
        `${this.type} ${this.name}(${signature})`
      );
      info.parameters = signature.params.map(
        (x) => new vscode.ParameterInformation(x.toString())
      );
      infoArr.push(info);
    }
    return infoArr;
  }
}
