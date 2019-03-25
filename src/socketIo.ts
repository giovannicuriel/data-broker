/* jslint node: true */
"use strict";

import { Messenger } from "@dojot/dojot-module";
import { SocketIOHandler } from "./SocketIOHandler";

class SocketIOSingletonImpl {
  private handler: SocketIOHandler | null;
  constructor() {
    this.handler = null;
  }

  public getInstance(httpServer?: any, messenger?: Messenger) {
    if (this.handler != null) {
      return this.handler;
    }

    if (httpServer && messenger) {
      this.handler = new SocketIOHandler(httpServer, messenger);
      return this.handler;
    }

    throw new Error("Failed to instantiate socketio server");
  }
}

const SocketIOSingleton = new SocketIOSingletonImpl();

export { SocketIOSingleton };
