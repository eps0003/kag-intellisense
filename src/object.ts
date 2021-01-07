import * as vscode from "vscode";
import * as fs from "fs";
import Param from "./param";
import Method from "./method";
import Property from "./property";

export default class KAGObject {
	name: string;
	properties: Property[];
	methods: Method[];

	constructor(name: string, path: string) {
		this.name = name;
		this.properties = [];
		this.methods = [];

		this.parseFile(path);
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

				//method
				{
					const regex = /^(\S+)\s+(?:::)?(\S+)\((.*)\)$/;
					const match = text.match(regex);
					if (match) {
						const returnType = match[1];
						const name = match[2];
						const params = match[3]
							.trim()
							.split(/\s*,\s*/g)
							.filter(Boolean)
							.map((str) => {
								const [type, name] = str.split(/\s+/);
								return new Param(type, name);
							});

						this.methods.push(new Method(returnType, name, params));
						continue;
					}
				}

				//property
				{
					const regex = /^(\S+)\s+(\S+)$/;
					const match = text.match(regex);
					if (match) {
						const type = match[1];
						const name = match[2];

						this.properties.push(new Property(type, name));
						continue;
					}
				}
			}
		});
	}
}
