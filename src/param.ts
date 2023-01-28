export default class Param {
  isConst: boolean;
  type: string;
  ref: string | null; // https://www.angelcode.com/angelscript/sdk/docs/manual/doc_script_func_ref.html
  name: string;
  defaultVal: string | null;

  constructor(
    isConst: boolean,
    type: string,
    ref: string | null,
    name: string,
    defaultVal: string | null
  ) {
    this.type = type;
    this.name = name;
    this.ref = ref;
    this.isConst = isConst;
    this.defaultVal = defaultVal;
  }

  toString(): string {
    const arr: string[] = [];
    if (this.isConst) {
      arr.push("const");
    }
    arr.push(this.type);
    if (this.ref) {
      arr.push(this.ref);
    }
    arr.push(this.name);
    if (this.defaultVal) {
      arr.push(`= ${this.defaultVal}`);
    }
    return arr.join(" ");
  }

  static parse(str: string, i: number): Param {
    {
      // Fix cases where pointer @ aligns with the variable name, not the type
      const regex = /(?<=[\w\]>])\s+@/g;
      str = str.replace(regex, "@ ");
    }

    {
      const regex =
        /^(?:(const)\s+)?([^\s&]+)\s*(?:(&in|&out|&inout)\s*)?(?:\s+(\w+)(?:\s*=\s*(.+))?)?$/;
      const match = regex.exec(str);
      if (!match) {
        throw new Error("Unable to parse param: " + str);
      }

      const isConst = Boolean(match[1]);
      const type = match[2];
      const ref = match[3] || null;
      const name = match[4] || String.fromCharCode(97 + i);
      const defaultVal = match[5] || null;

      return new Param(isConst, type, ref, name, defaultVal);
    }
  }
}
