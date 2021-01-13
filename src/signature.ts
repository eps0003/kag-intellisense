import Param from "./param";

export default class Signature {
	params: Param[];

	constructor(params: Param[]) {
		this.params = params;
	}

	toString(): string {
		return this.params.map((x) => x.toString()).join(", ");
	}
}
