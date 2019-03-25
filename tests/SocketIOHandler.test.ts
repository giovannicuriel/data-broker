import "jest";
import redis = require("redis");

const redisCreateClientOrigFn = redis.createClient;
redis.createClient = jest.fn();

import { Messenger } from "@dojot/dojot-module";
import { FilterManager } from "../src/FilterManager";
import { RedisManager } from "../src/redisManager";
import { SocketIOHandler } from "../src/SocketIOHandler";
import { TopicManagerBuilder } from "../src/TopicBuilder";

// There should be an easier way to implement these tests.
// But, for now, this is working as expected.
const mockTestConfig = {
    filterCheckFilterFn: jest.fn(),
    filterUpdate: jest.fn(),
    getClientFn: jest.fn(),
    getClientOrigFn: RedisManager.getClient,
    getCreateTopicFn: jest.fn(),
    getTopicManagerBuilderFn: jest.fn(),
    getTopicManagerBuilderOrigFn: TopicManagerBuilder.get,
    ioServerOnFn: jest.fn(),
    ioServerUseFn: jest.fn(),
    messengerInitFn: jest.fn(),
    messengerMock: {},
    messengerOnFn: jest.fn(),
    messengerUnregisterFn: jest.fn(),
    redisRunScriptFn: jest.fn(),
    redisSetEx: jest.fn(),
    socketSample: {
        disconnect: jest.fn(),
        emit: jest.fn(),
        handshake: {
            query: {
                subject: "sample",
                token: "sample-token",
            },
        },
        id: 0,
        join: jest.fn(),
        on: jest.fn(),
    },
};

jest.mock("socket.io", () => {
    return () => {
        return  {
            on: mockTestConfig.ioServerOnFn,
            use: mockTestConfig.ioServerUseFn,
        };
    };
});

jest.mock("uuid/v4", () => {
    return () => "sample-uuid";
});

jest.mock("@dojot/dojot-module");
jest.mock("../src/FilterManager");

beforeAll(() => {
    const mockMessenger: any = Messenger;
    mockMessenger.mockImplementation(() => {
        return {
            init: mockTestConfig.messengerInitFn,
            on: mockTestConfig.messengerOnFn,
            unregisterCallback: mockTestConfig.messengerUnregisterFn,
        };
    });
    mockTestConfig.messengerMock = mockMessenger();

    const mockFilter: any = FilterManager;
    mockFilter.mockImplementation(() => {
        return {
            checkFilter: mockTestConfig.filterCheckFilterFn,
            update: mockTestConfig.filterUpdate,
        };
    });

    mockTestConfig.getClientFn.mockImplementation(() => {
        return {
            client: {
                setex: mockTestConfig.redisSetEx,
            },
            runScript: mockTestConfig.redisRunScriptFn,
        };
    });
    mockTestConfig.getTopicManagerBuilderFn.mockImplementation(() => {
        return {
            getCreateTopic: mockTestConfig.getCreateTopicFn,
        };
    });
});

beforeEach(() => {
    mockTestConfig.ioServerOnFn.mockClear();
    mockTestConfig.ioServerUseFn.mockClear();
    mockTestConfig.getClientFn.mockClear();
    mockTestConfig.getTopicManagerBuilderFn.mockClear();
    mockTestConfig.getCreateTopicFn.mockClear();
    mockTestConfig.redisSetEx.mockClear();
    mockTestConfig.socketSample.join.mockClear();
    mockTestConfig.socketSample.disconnect.mockClear();
    RedisManager.getClient = mockTestConfig.getClientFn;
    TopicManagerBuilder.get = mockTestConfig.getTopicManagerBuilderFn;

    mockTestConfig.socketSample.disconnect.mockClear();
    mockTestConfig.socketSample.emit.mockClear();
    mockTestConfig.socketSample.join.mockClear();
    mockTestConfig.socketSample.on.mockClear();

    mockTestConfig.messengerInitFn.mockClear();
    mockTestConfig.messengerOnFn.mockClear();
    mockTestConfig.messengerUnregisterFn.mockClear();
});

afterEach(() => {
    RedisManager.getClient = mockTestConfig.getClientOrigFn;
    TopicManagerBuilder.get = mockTestConfig.getTopicManagerBuilderOrigFn;
    redis.createClient = redisCreateClientOrigFn;
});

describe("SocketIOHandler", () => {
    it("should build an empty handler", (done) => {
        mockTestConfig.messengerInitFn.mockReturnValue(Promise.reject("reasons"));
        const MockKill = jest.fn().mockImplementation(() => {
            // Avoid application crash!
        });
        process.kill = MockKill;
        const httpServerMock = jest.fn();
        const obj = new SocketIOHandler(httpServerMock, mockTestConfig.messengerMock as any);
        obj.processNewSocketIo = jest.fn();
        expect(obj).not.toBe(undefined);
        expect(mockTestConfig.ioServerUseFn).toBeCalled();
        expect(mockTestConfig.ioServerOnFn).toHaveBeenCalledTimes(1);
        const [event, ioCbk] = mockTestConfig.ioServerOnFn.mock.calls[0];
        expect(event).toEqual("connection");
        // Running ioserver callback
        ioCbk(mockTestConfig.socketSample);
        expect(mockTestConfig.redisRunScriptFn).toBeCalledTimes(1);
        const [script, keys, vals, redisCbk] = mockTestConfig.redisRunScriptFn.mock.calls[0];
        expect(script).toEqual(expect.stringContaining("/lua/setDel.lua"));
        expect(keys).toEqual(["si:sample-token"]);
        expect(vals).toEqual([]);
        // Testing redis callbacks
        redisCbk(null, "sample-tenant");
        expect(obj.processNewSocketIo).toHaveBeenCalled();
        redisCbk("error", "sample-tenant");
        expect(mockTestConfig.socketSample.disconnect).toBeCalledTimes(1);
        done();
    });

    it("should process a new regular socket.io connection", () => {
        const obj = new SocketIOHandler(jest.fn(), mockTestConfig.messengerMock as any);
        obj.registerSocketIoNotification = jest.fn();
        mockTestConfig.socketSample.handshake.query.subject = "sample-subject";
        obj.processNewSocketIo(mockTestConfig.socketSample as any, "sample-tenant");
        expect(mockTestConfig.socketSample.join).toHaveBeenCalled();
        expect(obj.registerSocketIoNotification).not.toHaveBeenCalled();
    });

    it("should process a new notification socket.io connection", () => {
        const obj = new SocketIOHandler(jest.fn(), mockTestConfig.messengerMock as any);
        obj.registerSocketIoNotification = jest.fn();
        mockTestConfig.socketSample.handshake.query.subject = "dojot.notifications";
        obj.processNewSocketIo(mockTestConfig.socketSample as any, "sample-tenant");
        expect(mockTestConfig.socketSample.join).not.toHaveBeenCalled();
        expect(obj.registerSocketIoNotification).toHaveBeenCalled();
    });

    it("should register a new notification socket.io connection", () => {
        const obj = new SocketIOHandler(jest.fn(), mockTestConfig.messengerMock as any);
        mockTestConfig.filterCheckFilterFn.mockReturnValue(true);
        obj.registerSocketIoNotification(mockTestConfig.socketSample as any, "sample-tenant");
        expect(mockTestConfig.messengerOnFn).toHaveBeenCalled();
        const [subject, event, onCbk] = mockTestConfig.messengerOnFn.mock.calls[1];
        expect(subject).toEqual("dojot.notifications");
        expect(event).toEqual("message");
        onCbk("sample-tenant", "sample-msg");
        expect(mockTestConfig.filterCheckFilterFn).toBeCalled();
        expect(mockTestConfig.socketSample.emit).toHaveBeenCalled();

        let [sioEvent, sioCbk] = mockTestConfig.socketSample.on.mock.calls[0];
        expect(sioEvent).toEqual("filter");
        sioCbk("{}");
        expect(mockTestConfig.filterUpdate).toHaveBeenCalled();

        [sioEvent, sioCbk] = mockTestConfig.socketSample.on.mock.calls[1];
        expect(sioEvent).toEqual("disconnect");
        sioCbk();
        expect(
          mockTestConfig.messengerUnregisterFn,
        ).toHaveBeenCalledWith(
          "dojot.notifications",
          "message",
          mockTestConfig.socketSample.id,
        );

        // Clearing mocks for alternate unit tests
        // "Publishing" messages in different tenant
        mockTestConfig.socketSample.emit.mockClear();
        mockTestConfig.filterCheckFilterFn.mockClear();
        onCbk("sample-tenant-2", "sample-msg");
        expect(mockTestConfig.filterCheckFilterFn).not.toHaveBeenCalled();
        expect(mockTestConfig.socketSample.emit).not.toHaveBeenCalled();

        mockTestConfig.socketSample.emit.mockClear();
        mockTestConfig.filterCheckFilterFn.mockClear();

        // Publishing messages that do not match any filter.
        mockTestConfig.filterCheckFilterFn.mockReturnValue(false);
        onCbk("sample-tenant", "sample-msg");
        expect(mockTestConfig.filterCheckFilterFn).toHaveBeenCalled();
        expect(mockTestConfig.socketSample.emit).not.toHaveBeenCalled();
    });

    it("should get a token", (done) => {
        const obj = new SocketIOHandler({}, mockTestConfig.messengerMock as any);
        const token = obj.getToken("sample-tenant");

        expect(token).toEqual("sample-uuid");

        // Retrieve getCreateTopic call
        expect(mockTestConfig.getCreateTopicFn).toBeCalledTimes(1);
        const [subject, cbk] = mockTestConfig.getCreateTopicFn.mock.calls[0];
        expect(subject).toEqual("device-data");

        // Calling callback when the topic is retrieved
        cbk(undefined, "sample-topic");

        // Calling callback when the topic is retrieved
        cbk("generic-error");

        // Retrieve redis calls
        expect(mockTestConfig.redisSetEx).toBeCalledTimes(1);
        const [key, time, tenant] = mockTestConfig.redisSetEx.mock.calls[0];
        expect(key).toEqual("si:sample-uuid");
        expect(time).toEqual(60);
        expect(tenant).toEqual("sample-tenant");
        done();
    });
});
