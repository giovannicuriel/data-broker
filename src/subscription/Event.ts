/* jslint node: true */
"use strict";

class Event {
  // Metadata might be "any" as well.
  public metadata: {
    deviceid: string;
    model: string;
    payload: string;
    protocol: string;
    topic: string | null;
    type: string;
  };
  public attrs: any;

  constructor(data: any) {
    this.metadata = {
      deviceid: data.metadata.deviceid,
      model: data.metadata.model,
      payload: data.metadata.payload,
      protocol: data.metadata.protocol,
      topic: data.metadata.topic,
      type: data.metadata.type,
    };
    this.attrs = data.attrs;
  }
}

export { Event };
