/* jslint node: true */
"use strict";

import { Condition } from "./Condition";
import { Notification } from "./Notification";

class Subscription {
  public id: string;
  public subject: {
    entities: {
      id: string;
      idPattern: string;
      model: string;
      modelPattern: string;
      type: string;
      typePattern: string;
    };
    condition: Condition | null;
  };
  public notification: Notification;

  constructor() {
    this.id = "";
    this.subject = {
      condition: null,
      entities: {
        id: "",
        idPattern: "",
        model: "",
        modelPattern: "",
        type: "",
        typePattern: "",
      },
    };
    this.notification = new Notification();
  }
}

export { Subscription };
