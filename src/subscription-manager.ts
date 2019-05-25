import { Messenger } from "@dojot/dojot-module";
import { getHTTPRouter as getLoggerRouter, logger } from "@dojot/dojot-module-logger";
import bodyParser = require("body-parser");
import express = require("express");
import http = require("http");
import morgan = require("morgan");
import util = require("util");
import { authEnforce, authParse, IAuthRequest } from "./api/authMiddleware";
import { AgentHealthChecker } from "./Healthcheck";
import * as config from "./config";
import { ITopicProfile } from "./RedisClientWrapper";
import { RedisManager } from "./redisManager";
import { SocketIOSingleton } from "./socketIo";
import { SubscriptionEngine, SubscriptionType } from "./subscription-engine";
import { TopicManagerBuilder } from "./TopicBuilder";

const TAG = { filename: "sub-mng" };

class DataBroker {
  private app: express.Application;
  private subscrEngine: SubscriptionEngine;
  constructor(app: express.Application, subscriptionEngine: SubscriptionEngine) {
    this.app = app;
    this.subscrEngine = subscriptionEngine;
  }

  public start() {
    logger.info("Starting DataBroker...", TAG);
    logger.debug("Configuring Express app...", TAG);
    this.app.use(authParse);
    this.app.use(authEnforce);
    this.app.use(bodyParser.json()); // for parsing application/json
    this.app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
    this.app.use(morgan("short"));
    this.app.use(getLoggerRouter());
    logger.debug("... Express app was configured.", TAG);

    const httpServer = http.createServer(this.app);

    logger.debug("Initializing Kafka messenger...", TAG);
    this.initializeMessenger()
      .then((messenger: Messenger) => {
        logger.debug("... Kafka messenger successfully initialized.", TAG);
        logger.debug("Initializing Healthcheck...", TAG);
        const redis = RedisManager.getClient().client;
        const healthChecker = new AgentHealthChecker(messenger, redis);
        healthChecker.init();
        this.app.use(healthChecker.router);
        logger.debug("... healthcheck was successfully initialized.", TAG);
        // make sure singleton is instantiated
        logger.debug("Registering socket.io endpoints...", TAG);
        SocketIOSingleton.getInstance(httpServer, messenger);
        this.registerSocketIOEndpoints();
        logger.debug("... socket.io endpoints were successfully registered.", TAG);
      })
      .catch(() => {
        process.kill(process.pid, "SIGTERM");
      });
    logger.debug("... Kafka messenger initialization requested.", TAG);

    logger.debug("Registering common endpoints...", TAG);
    this.registerTopicEndpoints();
    logger.debug("... common endpoints were registered.", TAG);

    logger.debug("Starting HTTP server...", TAG);
    httpServer.listen(80, () => {
      logger.debug("Subscription manager listening on port 80", TAG);
    });
    logger.debug("... HTTP server startup requested.", TAG);
  }

  protected async initializeMessenger() {
    const messenger = new Messenger("data-broker-socketio");
    await messenger.init();
    return messenger;
  }

  protected registerTopicEndpoints() {
    /*
     * Subscription management endpoints
     */
    this.app.post("/subscription", (request: IAuthRequest, response: express.Response) => {
      const subscription = request.body;
      logger.debug("Received new subscription request.", TAG);
      logger.debug(`Subscription body is: ${util.inspect(subscription, { depth: null })}`, TAG);
      if ("id" in subscription.subject.entities) {
        this.subscrEngine.addSubscription(SubscriptionType.id, subscription.subject.entities.id, subscription);
      } else if ("model" in subscription.subject.entities) {
        this.subscrEngine.addSubscription(SubscriptionType.model, subscription.subject.entities.model, subscription);
      } else if ("type" in subscription.subject.entities) {
        this.subscrEngine.addSubscription(SubscriptionType.type, subscription.subject.entities.type, subscription);
      }
      response.send("Ok!");
    });

    /*
     * Topic registry endpoints
     */
    this.app.get("/topic/:subject", (req: IAuthRequest, response: express.Response) => {
      logger.debug("Received a topic GET request.", TAG);
      if (req.service === undefined) {
        logger.error("Service is not defined in GET request headers.", TAG);
        response.status(401);
        response.send({ error: "missing mandatory authorization header in get request" });
      } else {
        const topics = TopicManagerBuilder.get(req.service);
        logger.debug(`Topic for service ${req.service} and subject ${req.params.subject}.`, TAG);
        topics.getCreateTopic(req.params.subject, (error: any, data: any) => {
          if (error) {
            logger.error(`Failed to retrieve topic. Error is ${error}`, TAG);
            response.status(500);
            response.send({ error: "failed to process topic" });
          } else {
            response.status(200).send({ topic: data });
          }
        });
      }
    });
    /**
     * Getting profiles end point
     */
    this.app.get("/topic/:subject/profile", (req: IAuthRequest, response: express.Response) => {

      logger.debug("Received a profile GET request.", TAG);

      if (req.service === undefined) {
        response.status(401).send({ error: "Missing mandatory authorization header in profile request" });
      } else {
        const topics = TopicManagerBuilder.get(req.service);
        topics.getConfigTopics(req.params.subject).then((data: ITopicProfile | undefined) => {
          if (data === undefined) {
            response.status(404).send({ message: "Could not find profiles for this subject" });
          }
          response.status(200).send(data);
        }).catch((error: any) => {
          response.status(500).send({ message: "error", details: `${util.inspect(error, { depth: null })}` });
        });
      }

    });

    /**
     * Setting profiles end point
     */
    this.app.post("/topic/:subject/profile", (req: IAuthRequest, response: express.Response) => {
      logger.debug("Received a profile POST request.", TAG);
      if (req.service === undefined) {
        response.status(401).send({ error: "Missing mandatory authorization header in profile request" });
      } else {
        const topics = TopicManagerBuilder.get(req.service);
        topics.setConfigTopics(req.params.subject, req.body);
      }

      response.status(200).send({ message: "Set configs successfully" });
    });

    /**
     * Editing profiles end point
     */
    this.app.put("/topic/:subject/profile/:tenant", (req: IAuthRequest, response: express.Response) => {
      logger.debug(`Received a profile PUT request for tenant ${req.params.tenant}`, TAG);

      if (req.service === undefined) {
        response.status(401).send({ error: "Missing mandatory authorization header in profile request" });
      } else {
        const topics = TopicManagerBuilder.get(req.service);
        topics.setConfigTopics(req.params.subject, req.body);
      }

      response.status(200).send({ message: "Configs edited/created successfully" });

    });
  }
  protected registerSocketIOEndpoints() {

    /**
     * SocketIO endpoint
     */
    this.app.get("/socketio", (req: IAuthRequest, response: express.Response) => {
      logger.debug("Received a request for a new socketIO connection.", TAG);
      if (req.service === undefined) {
        logger.error("Service is not defined in SocketIO connection request headers.", TAG);
        response.status(401);
        response.send({ error: "missing mandatory authorization header in socketio request" });
      } else {
        const token = SocketIOSingleton.getInstance().getToken(req.service);
        response.status(200).send({ token });
      }
    });
  }
}

function main() {
  const app = express();
  const subscrEngine = new SubscriptionEngine();
  const dataBroker = new DataBroker(app, subscrEngine);
  dataBroker.start();
}

main();
