import * as vscode from "vscode";
import Declaration from "./declaration";
import Signature from "./signature";
import Subroutine from "./subroutine";

export default class Constructor extends Declaration implements Subroutine {
  signatures: Signature[];

  constructor(name: string) {
    super(name, name);
    this.signatures = [];
  }

  addSignature(signature: Signature): void {
    this.signatures.push(signature);
  }

  toSignatureInformation(): vscode.SignatureInformation[] {
    const infoArr: vscode.SignatureInformation[] = [];
    const signatures = this.signatures.sort(
      (a, b) => a.params.length - b.params.length
    );
    for (const signature of signatures) {
      const info = new vscode.SignatureInformation(
        `${this.name}(${signature})`
      );
      info.parameters = signature.params.map(
        (x) => new vscode.ParameterInformation(x.toString())
      );
      infoArr.push(info);
    }
    return infoArr;
  }
}
