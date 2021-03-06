const kafka = {
  consumer: {
    autoCommit: true,
    fetchMaxBytes: 1048576,
    fetchMaxWaitMs: 1000,
    group: "subscription-engine",
    id: "consumer-1",
  },
  kafkaAddress: process.env.KAFKA_ADDRESS || "kafka",
  kafkaPort: process.env.KAFKA_PORT || "9092",
  zookeeperAddress: process.env.ZOOKEEPER_ADDRESS || "zookeeper",
  zookeeperPort: process.env.ZOOKEEPER_PORT || "2181",
};

const broker = {
  ingestion: [process.env.DOJOT_SUBJECT_DEVICE_DATA || "device-data"],
  port: process.env.DATABROKER_PORT || "80",
};

const cache = {
  address: process.env.DATABROKER_CACHE_ADDRESS || "data-broker-redis",
  database: process.env.DATABROKER_CACHE_DATABASE || "0",
  name: process.env.DATABROKER_CACHE_NAME || "redis",
  port: process.env.DATABROKER_CACHE_PORT || "6379",
  pwd: process.env.DATABROKER_CACHE_PWD || "",
  user: process.env.DATABROKER_CACHE_USER || "redis",
};

const healthcheck = {
  timeout: {
    cpu: Number(process.env.HC_CPU_USAGE_TIMEOUT) || 300000,
    kafka: Number(process.env.HC_KAFKA_TIMEOUT) || 30000,
    memory: Number(process.env.HC_MEMORY_USAGE_TIMEOUT) || 300000,
    mongodb: Number(process.env.HC_MONGODB_TIMEOUT) || 30000,
    uptime: Number(process.env.HC_UPTIME_TIMEOUT) || 300000,
  },
};

export { kafka, broker, cache, healthcheck};
