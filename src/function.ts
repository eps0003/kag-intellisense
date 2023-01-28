import * as vscode from "vscode";
import Declaration from "./declaration";
import Signature from "./signature";
import Subroutine from "./subroutine";

export default class Func extends Declaration implements Subroutine {
  namespace: string | null;
  signatures: Signature[];

  constructor(namespace: string | null, type: string, name: string) {
    super(type, name);
    this.namespace = namespace;
    this.signatures = [];
  }

  addSignature(signature: Signature) {
    this.signatures.push(signature);
  }

  toString(): string {
    const namespace = this.namespace ? this.namespace + "::" : "";
    return namespace + this.name;
  }

  toCompletionItem(): vscode.CompletionItem {
    return new vscode.CompletionItem(
      this.toString(),
      vscode.CompletionItemKind.Function
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
