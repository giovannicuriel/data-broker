import { logger } from "@dojot/dojot-module-logger";
import express from "express";

const TAG = { filename: "dojot-mock "};

const APP_PORT = 5002;

function initExpressApp() {
  const app = express();
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawToken = req.header("authorization");
    if (rawToken !== undefined) {
      const token = rawToken.split(".");
      const tokenData = JSON.parse(new Buffer(token[1], "base64").toString());
      (req as any).service = tokenData.service;
    }
    next();
  });

  app.get("/topic/:subject", (req, res) => {
    res.json({ topic: "topic-" + req.params.subject + "-" + (req as any).service });
  });

  app.get("/admin/tenants", (req, res) => {
    res.json({ tenants: ["admin"] });
  });

  app.listen(APP_PORT, "0.0.0.0", () => {
    logger.debug("dojot mocks started.", TAG);
  });
}

initExpressApp();
