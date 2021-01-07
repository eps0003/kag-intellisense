export default class Param {
	type: string;
	name: string;

	constructor(type: string, name: string) {
		this.type = type;
		this.name = name;
	}

	toString(): string {
		return `${this.type} ${this.name}`;
	}
}
