/* jslint node: true */
"use strict";

class Notification {
  public topic: string;
  public attrs: string[];

  constructor() {
    this.topic = "";
    this.attrs = [];
  }
}

export { Notification };
