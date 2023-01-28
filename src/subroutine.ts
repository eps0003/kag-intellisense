import * as vscode from "vscode";
import Signature from "./signature";

export default interface Subroutine {
  signatures: Signature[];
  addSignature(signature: Signature): void;
  toSignatureInformation(): vscode.SignatureInformation[];
}
