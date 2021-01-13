export default class Param {
	type: string;
	name: string | null;

	constructor(type: string, name: string | null = null) {
		this.type = type;
		this.name = name;
	}

	toString(): string {
		if (this.name) {
			return `${this.type} ${this.name}`;
		}
		return this.type;
	}
}
