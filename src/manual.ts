import * as fs from "fs";
import { glob } from "glob";
import KAGObject from "./object";
import Hook from "./hook";
import Variable from "./variable";
import Func from "./function";
import Enum from "./enum";
import Param from "./param";

export default class Manual {
	path: string;

	enums: Enum[];
	functions: Func[];
	hooks: Hook[];
	objects: KAGObject[];
	variables: Variable[];

	constructor(path: string) {
		this.path = path;
		this.enums = [];
		this.functions = [];
		this.hooks = [];
		this.objects = [];
		this.variables = [];

		this.initEnums();
		this.initFunctions();
		this.initHooks();
		this.initObjects();
		this.initVariables();
	}

	private initObjects() {
		glob(this.path + "Objects/*.txt", (err, matches) => {
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
		fs.readFile(this.path + "Hooks.txt", "utf8", (err, data) => {
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

					this.hooks.push(new Hook(returnType, name, params));
				}
			}
		});
	}

	private initVariables() {
		fs.readFile(this.path + "Variables.txt", "utf8", (err, data) => {
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
					const namespace = match[1];
					const type = match[2];
					const name = match[3];

					this.variables.push(new Variable(namespace, type, name));
				}
			}
		});
	}

	private initFunctions() {
		fs.readFile(this.path + "Functions.txt", "utf8", (err, data) => {
			if (err) {
				return;
			}

			const lines = data.split("\n");
			for (const line of lines) {
				const text = line.trim();
				if (!text || text.startsWith("--")) {
					continue;
				}

				const regex = /^(\S+)\s+(?:(\S+?)::)?(?:::)?(\S+)\((.*)\)$/;
				const match = text.match(regex);
				if (match) {
					const returnType = match[1];
					const namespace = match[2];
					const name = match[3];
					const params = match[3]
						.trim()
						.split(/\s*,\s*/g)
						.filter(Boolean)
						.map((str) => {
							const [type, name] = str.split(/\s+/);
							return new Param(type, name);
						});

					this.functions.push(new Func(namespace, returnType, name, params));
				}
			}
		});
	}

	private initEnums() {
		fs.readFile(this.path + "Enums.txt", "utf8", (err, data) => {
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
}
