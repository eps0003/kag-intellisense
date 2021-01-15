import * as fs from "fs";
import * as vscode from "vscode";
import Constructor from "./constructor";
import Declaration from "./declaration";
import Method from "./method";
import Property from "./property";
import Signature from "./signature";

export default class KAGObject extends Declaration {
	construct: Constructor | null = null;
	private _properties: Property[] = [];
	private _methods: { [name: string]: Method } = {};

	constructor(name: string, path: string) {
		super(name, name);

		this.parseFile(path);
	}

	getMethod(name: string): Method | null {
		return this._methods[name];
	}

	getProperty(name: string): Property | null {
		for (const property of this._properties) {
			if (property.name === name) {
				return property;
			}
		}
		return null;
	}

	get properties(): Property[] {
		return this._properties;
	}

	get methods(): Method[] {
		return Object.values(this._methods);
	}

	toString(): string {
		return this.name;
	}

	toCompletionItem(): vscode.CompletionItem {
		return new vscode.CompletionItem(this.toString(), vscode.CompletionItemKind.Class);
	}

	private parseFile(path: string) {
		fs.readFile(path, "utf8", (err, data) => {
			if (err) {
				return;
			}

			const lines = data.split("\n");
			for (const line of lines) {
				const text = line.trim();
				if (!text || text.startsWith("--")) {
					continue;
				}

				{
					// Constructor
					const regex = /^<constructor>\((.*)\)$/;
					const match = text.match(regex);
					if (match) {
						const signature = Signature.parse(match[1]);

						if (!this.construct) {
							this.construct = new Constructor(this.name);
						}

						this.construct.addSignature(signature);
						continue;
					}
				}

				{
					// Method
					const regex = /^(?:const\s+)?(\S+)\s+(?:::)?(\S+)\((.*)\)(?:\s+const)?$/;
					const match = text.match(regex);
					if (match) {
						const returnType = match[1];
						const name = match[2];
						const signature = Signature.parse(match[3]);

						if (!this._methods.hasOwnProperty(name)) {
							this._methods[name] = new Method(this, returnType, name);
						}

						this._methods[name].addSignature(signature);
						continue;
					}
				}

				{
					// Property
					const regex = /^(\S+)\s+(\S+)$/;
					const match = text.match(regex);
					if (match) {
						const type = match[1];
						const name = match[2];

						this._properties.push(new Property(this, type, name));
						continue;
					}
				}
			}
		});
	}
}
