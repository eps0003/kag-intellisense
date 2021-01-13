import * as fs from "fs";
import { glob } from "glob";
import Enum from "./enum";
import Func from "./function";
import Hook from "./hook";
import KAGObject from "./object";
import Param from "./param";
import Signature from "./signature";
import Variable from "./variable";

export default class Manual {
	private _path: string;

	private _enums: Enum[] = [];
	private _functions: { [name: string]: Func } = {};
	private _hooks: Hook[] = [];
	private _objects: KAGObject[] = [];
	private _variables: Variable[] = [];

	constructor(path: string) {
		this._path = path;

		this.initEnums();
		this.initFunctions();
		this.initHooks();
		this.initObjects();
		this.initVariables();
	}

	get enums(): Enum[] {
		return this._enums;
	}

	get functions(): Func[] {
		return Object.values(this._functions);
	}

	get hooks(): Hook[] {
		return this._hooks;
	}

	get objects(): KAGObject[] {
		return this._objects;
	}

	get variables(): Variable[] {
		return this._variables;
	}

	getObject(name: string): KAGObject | null {
		for (const obj of this._objects) {
			if (obj.name === name) {
				return obj;
			}
		}
		return null;
	}

	getFunction(namespace: string | null, name: string): Func | null {
		const key = `${namespace || ""}::${name}`;
		return this._functions[key];
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

				this._objects.push(new KAGObject(name, path));
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
					const params = match[3]
						.trim()
						.split(/\s*,\s*/g)
						.filter(Boolean)
						.map((str) => {
							const [type, name] = str.split(/\s+/);
							return new Param(type, name);
						});

					this._hooks.push(new Hook(returnType, name, new Signature(params)));
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

					this._variables.push(new Variable(namespace, type, name));
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
					const params = match[4]
						.trim()
						.split(/\s*,\s*/g)
						.filter(Boolean)
						.map((str) => {
							const [type, name] = str.split(/\s+/);
							return new Param(type, name);
						});

					const key = `${namespace || ""}::${name}`;

					if (!this._functions.hasOwnProperty(key)) {
						this._functions[key] = new Func(namespace, returnType, name);
					}

					this._functions[key].addSignature(new Signature(params));
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

					this._enums.push(new Enum(namespace, name));
					continue;
				}
			}
		});
	}
}
