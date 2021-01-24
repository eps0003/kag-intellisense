import * as fs from "fs";
import { glob } from "glob";
import * as path from "path";
import * as vscode from "vscode";
import * as util from "./util";

export default class BaseFolder {
	private static files: string[] = [];

	private static getBasePath(): string | null {
		const kagPath = util.getKAGPath();
		if (!kagPath) {
			return null;
		}

		const basePath = path.join(kagPath, "Base");
		if (!fs.existsSync(basePath)) {
			return null;
		}

		return basePath;
	}

	static getFiles(): void {
		this.files = [];

		const basePath = BaseFolder.getBasePath();
		if (!basePath) {
			vscode.window.showInformationMessage("KAG AngelScript IntelliSense was unable to start because an invalid/nonexistent KAG path was provided", "Set Path").then((value) => {
				if (value) {
					vscode.commands.executeCommand("workbench.action.openSettings", "KAG.path");
				}
			});
			return;
		}

		glob(path.join(basePath, "**/*.as"), (err, matches) => {
			if (err) {
				throw err;
			}

			this.files = matches;
		});
	}

	static getInclude(include: string): string[] {
		const matches: string[] = [];
		for (const file of this.files) {
			if (file.endsWith(include)) {
				matches.push(file);
			}
		}
		return matches;
	}
}
