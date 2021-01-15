import * as fs from "fs";
import { glob } from "glob";
import * as path from "path";
import * as vscode from "vscode";
import Enum from "./enum";
import Func from "./function";
import Hook from "./hook";
import KAGObject from "./object";
import Signature from "./signature";
import Variable from "./variable";

export default class Manual {
	private _path: string;

	enums: Enum[] = [];
	functions: { [name: string]: Func } = {};
	hooks: Hook[] = [];
	objects: KAGObject[] = [];
	variables: Variable[] = [];

	constructor(path: string) {
		this._path = path;

		this.initEnums();
		this.initFunctions();
		this.initHooks();
		this.initObjects();
		this.initVariables();
	}

	getObject(name: string): KAGObject | null {
		for (const obj of this.objects) {
			if (obj.name === name) {
				return obj;
			}
		}
		return null;
	}

	getFunction(namespace: string | null, name: string): Func | null {
		const key = `${namespace || ""}::${name}`;
		return this.functions[key];
	}

	private initObjects() {
		glob(this._path + "Objects/*.txt", (err, matches) => {
			if (err) {
				throw err;
			}

			for (const path of matches) {
				const match = /(\w+)\.txt$/.exec(path);
				if (!match) {
					continue;
				}

				const name = match[1];
				if (name === "any") {
					continue;
				}

				this.objects.push(new KAGObject(name, path));
			}
		});
	}

	private initHooks() {
		fs.readFile(this._path + "Hooks.txt", "utf8", (err, data) => {
			if (err) {
				return;
			}

			const lines = data.split("\n");
			for (const line of lines) {
				const text = line.trim();
				if (!text || text.startsWith("--")) {
					continue;
				}

				const regex = /^(\S+)\s+(\S+)\((.*)\)$/;
				const match = text.match(regex);
				if (match) {
					const returnType = match[1];
					const name = match[2];
					const signature = Signature.parse(match[3]);

					this.hooks.push(new Hook(returnType, name, signature));
				}
			}
		});
	}

	private initVariables() {
		fs.readFile(this._path + "Variables.txt", "utf8", (err, data) => {
			if (err) {
				return;
			}

			const lines = data.split("\n");
			for (const line of lines) {
				const text = line.trim();
				if (!text || text.startsWith("--")) {
					continue;
				}

				const regex = /^(?:(\S+)::)?(\S+)\s+(\S+)$/;
				const match = text.match(regex);
				if (match) {
					const namespace = match[1] || null;
					const type = match[2];
					const name = match[3];

					this.variables.push(new Variable(namespace, type, name));
				}
			}
		});
	}

	private initFunctions() {
		fs.readFile(this._path + "Functions.txt", "utf8", (err, data) => {
			if (err) {
				return;
			}

			const lines = data.split("\n");
			for (const line of lines) {
				const text = line.trim();
				if (!text || text.startsWith("--")) {
					continue;
				}

				const regex = /^(\S+)\s+(?:(\S+?)::)?(?:::)?(\S+)\((.*)\)(?:\s+const)?$/;
				const match = text.match(regex);
				if (match) {
					const returnType = match[1];
					const namespace = match[2] || null;
					const name = match[3];
					const signature = Signature.parse(match[4]);

					const key = `${namespace || ""}::${name}`;

					if (!this.functions.hasOwnProperty(key)) {
						this.functions[key] = new Func(namespace, returnType, name);
					}

					this.functions[key].addSignature(signature);
				}
			}
		});
	}

	private initEnums() {
		fs.readFile(this._path + "Enums.txt", "utf8", (err, data) => {
			if (err) {
				return;
			}

			let namespace = "";

			const lines = data.split("\n");
			for (const line of lines) {
				const text = line.trimEnd();
				if (!text || text.startsWith("--")) {
					continue;
				}

				// Remember namespace as we look through the file
				if (/^\S+$/.test(text)) {
					namespace = text.trimStart();
				}

				const regex = /^\s+(\S+)$/;
				const match = text.match(regex);
				if (match) {
					const name = match[1];

					this.enums.push(new Enum(namespace, name));
					continue;
				}
			}
		});
	}

	static getManual(): Manual | null {
		const manualPath = this.getManualPath();
		if (!manualPath) {
			vscode.window.showInformationMessage("KAG AngelScript IntelliSense was unable to start because an invalid/nonexistent path to the KAG Manual was provided", "Set Path").then((value) => {
				if (value) {
					vscode.commands.executeCommand("workbench.action.openSettings", "KAG.manual");
				}
			});
			return null;
		}

		return new Manual(manualPath);
	}

	private static getManualPath(): string | null {
		const manualPath: string = vscode.workspace.getConfiguration("KAG").manual;
		if (!manualPath) {
			return null;
		}

		const fullPath = path.join(manualPath, "interface/");
		if (!fs.existsSync(fullPath)) {
			return null;
		}

		return fullPath;
	}
}
