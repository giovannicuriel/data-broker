/* jslint node: true */
"use strict";

class Condition {
  public attrs: string[];
  public expression: {
    coords: string[] | null;
    geometry: "point" | "polygon" | null;
    georel: "convered-by" | "intersects" | null;
    mq: string | null;
    q: string | null;
  };

  constructor() {
    this.attrs = [];
    this.expression = {
      coords : null,
      geometry: null,
      georel: null,
      mq: null,
      q: null,
    };
  }
}

export { Condition };
