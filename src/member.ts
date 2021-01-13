import KAGObject from "./object";

export default class Member {
	parent: KAGObject;

	constructor(parent: KAGObject) {
		this.parent = parent;
	}
}
