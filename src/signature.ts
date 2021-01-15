import Param from "./param";

export default class Signature {
	params: Param[];

	constructor(params: Param[]) {
		this.params = params;
	}

	toString(): string {
		return this.params.map((x) => x.toString()).join(", ");
	}

	static parse(str: string): Signature {
		const params = str
			.trim()
			.split(/\s*,\s*/g)
			.filter(Boolean)
			.map(Param.parse);

		return new Signature(params);
	}
}
