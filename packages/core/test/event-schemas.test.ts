import {
    EventTopicDescriptorSchema,
    EventsCapabilitySchema,
    EventParamsSchema,
    EventEmitNotificationSchema,
    EventSubscribeParamsSchema,
    SubscribedTopicSchema,
    RejectedTopicSchema,
    RetainedEventSchema,
    EventSubscribeResultSchema,
    EventSubscribeRequestSchema,
    EventUnsubscribeParamsSchema,
    EventUnsubscribeResultSchema,
    EventUnsubscribeRequestSchema,
    EventListResultSchema,
    EventListRequestSchema,
    ServerCapabilitiesSchema,
    ServerNotificationSchema,
    ClientRequestSchema,
    ServerResultSchema
} from '../src/types/index.js';

describe('Event Zod schemas', () => {
    describe('EventTopicDescriptorSchema', () => {
        it('should parse a minimal topic descriptor', () => {
            const result = EventTopicDescriptorSchema.parse({
                pattern: 'agents/{agent_id}/messages',
                kind: 'content'
            });
            expect(result.pattern).toBe('agents/{agent_id}/messages');
            expect(result.kind).toBe('content');
            expect(result.description).toBeUndefined();
            expect(result.suggestedHandle).toBeUndefined();
            expect(result.retained).toBeUndefined();
            expect(result.schema).toBeUndefined();
        });

        it('should parse a full topic descriptor', () => {
            const result = EventTopicDescriptorSchema.parse({
                pattern: 'build/status',
                kind: 'content',
                description: 'Build status events',
                suggestedHandle: 'inject',
                retained: true,
                schema: { type: 'object', properties: { status: { type: 'string' } } }
            });
            expect(result.pattern).toBe('build/status');
            expect(result.kind).toBe('content');
            expect(result.description).toBe('Build status events');
            expect(result.suggestedHandle).toBe('inject');
            expect(result.retained).toBe(true);
            expect(result.schema).toBeDefined();
        });

        it('should accept both content and signal kinds', () => {
            expect(() => EventTopicDescriptorSchema.parse({ pattern: 'a', kind: 'content' })).not.toThrow();
            expect(() => EventTopicDescriptorSchema.parse({ pattern: 'a', kind: 'signal' })).not.toThrow();
        });

        it('should reject invalid kind', () => {
            expect(() => EventTopicDescriptorSchema.parse({ pattern: 'a', kind: 'other' })).toThrow();
        });

        it('should reject missing kind', () => {
            expect(() => EventTopicDescriptorSchema.parse({ pattern: 'a' })).toThrow();
        });

        it('should accept all valid suggestedHandle values', () => {
            for (const handle of ['drop', 'silent', 'notify', 'ask', 'inject', 'interrupt']) {
                expect(() =>
                    EventTopicDescriptorSchema.parse({
                        pattern: 'a',
                        kind: 'content',
                        suggestedHandle: handle
                    })
                ).not.toThrow();
            }
        });

        it('should reject invalid suggestedHandle', () => {
            expect(() =>
                EventTopicDescriptorSchema.parse({
                    pattern: 'a',
                    kind: 'content',
                    suggestedHandle: 'bogus'
                })
            ).toThrow();
        });

        it('should reject missing pattern', () => {
            expect(() => EventTopicDescriptorSchema.parse({ kind: 'content' })).toThrow();
            expect(() => EventTopicDescriptorSchema.parse({ description: 'no pattern' })).toThrow();
        });
    });

    describe('EventsCapabilitySchema', () => {
        it('should parse empty capability', () => {
            const result = EventsCapabilitySchema.parse({});
            expect(result.topics).toEqual([]);
            expect(result.instructions).toBeUndefined();
        });

        it('should parse capability with topics and instructions', () => {
            const result = EventsCapabilitySchema.parse({
                topics: [{ pattern: 'foo/bar', kind: 'content' }],
                instructions: 'Subscribe to foo/bar for updates'
            });
            expect(result.topics).toHaveLength(1);
            expect(result.instructions).toBe('Subscribe to foo/bar for updates');
        });

        it('should accept unknown extra fields (looseObject)', () => {
            const result = EventsCapabilitySchema.parse({
                topics: [],
                customField: 'extra',
                anotherField: 42
            });
            expect(result.topics).toEqual([]);
            expect((result as Record<string, unknown>).customField).toBe('extra');
            expect((result as Record<string, unknown>).anotherField).toBe(42);
        });
    });

    describe('EventParamsSchema', () => {
        it('should parse minimal event params', () => {
            const result = EventParamsSchema.parse({
                topic: 'build/status',
                eventId: 'evt-001',
                payload: { status: 'success' }
            });
            expect(result.topic).toBe('build/status');
            expect(result.eventId).toBe('evt-001');
            expect(result.payload).toEqual({ status: 'success' });
        });

        it('should parse full event params', () => {
            const result = EventParamsSchema.parse({
                topic: 'build/status',
                eventId: 'evt-002',
                payload: 'plain text payload',
                priority: 'urgent',
                retained: true,
                source: 'ci-server',
                expiresAt: '2026-04-08T00:00:00Z'
            });
            expect(result.topic).toBe('build/status');
            expect(result.eventId).toBe('evt-002');
            expect(result.payload).toBe('plain text payload');
            expect(result.priority).toBe('urgent');
            expect(result.retained).toBe(true);
            expect(result.source).toBe('ci-server');
            expect(result.expiresAt).toBe('2026-04-08T00:00:00Z');
        });

        it('should accept all valid priority levels', () => {
            for (const priority of ['urgent', 'high', 'normal', 'low']) {
                expect(() =>
                    EventParamsSchema.parse({
                        topic: 't',
                        eventId: 'e',
                        priority
                    })
                ).not.toThrow();
            }
        });

        it('should reject invalid priority', () => {
            expect(() =>
                EventParamsSchema.parse({
                    topic: 't',
                    eventId: 'e',
                    priority: 'critical'
                })
            ).toThrow();
        });

        it('should accept _meta from NotificationsParamsSchema', () => {
            const result = EventParamsSchema.parse({
                topic: 'test',
                eventId: 'evt-003',
                payload: null,
                _meta: { progressToken: 'tok-1' }
            });
            expect(result._meta).toBeDefined();
            expect(result._meta!.progressToken).toBe('tok-1');
            expect(result.topic).toBe('test');
            expect(result.eventId).toBe('evt-003');
            expect(result.payload).toBeNull();
        });

        it('should parse without payload (payload is optional)', () => {
            const result = EventParamsSchema.parse({
                topic: 'build/status',
                eventId: 'evt-no-payload'
            });
            expect(result.topic).toBe('build/status');
            expect(result.eventId).toBe('evt-no-payload');
            expect(result.payload).toBeUndefined();
        });

        it('should accept unknown extra fields (loose)', () => {
            const result = EventParamsSchema.parse({
                topic: 'build/status',
                eventId: 'evt-extra',
                payload: null,
                customField: 'extra-value'
            });
            expect(result.topic).toBe('build/status');
            expect((result as Record<string, unknown>).customField).toBe('extra-value');
        });

        it('should reject invalid data with missing required fields', () => {
            // Missing topic
            expect(() =>
                EventParamsSchema.parse({
                    eventId: 'evt-bad',
                    payload: null
                })
            ).toThrow();

            // Missing eventId
            expect(() =>
                EventParamsSchema.parse({
                    topic: 'test',
                    payload: null
                })
            ).toThrow();

            // Wrong type for topic
            expect(() =>
                EventParamsSchema.parse({
                    topic: 123,
                    eventId: 'evt-bad',
                    payload: null
                })
            ).toThrow();

            // Wrong type for eventId
            expect(() =>
                EventParamsSchema.parse({
                    topic: 'test',
                    eventId: 456,
                    payload: null
                })
            ).toThrow();

            // Empty object
            expect(() => EventParamsSchema.parse({})).toThrow();
        });
    });

    describe('EventEmitNotificationSchema', () => {
        it('should parse a valid event emit notification', () => {
            const notification = {
                method: 'events/emit',
                params: {
                    topic: 'sessions/abc/messages',
                    eventId: 'evt-100',
                    payload: { text: 'hello' }
                }
            };
            const result = EventEmitNotificationSchema.parse(notification);
            expect(result.method).toBe('events/emit');
            expect(result.params.topic).toBe('sessions/abc/messages');
        });

        it('should reject wrong method', () => {
            expect(() =>
                EventEmitNotificationSchema.parse({
                    method: 'events/wrong',
                    params: { topic: 'x', eventId: 'y', payload: null }
                })
            ).toThrow();
        });
    });

    describe('EventSubscribeParamsSchema', () => {
        it('should reject missing topics', () => {
            expect(() => EventSubscribeParamsSchema.parse({})).toThrow();
        });

        it('should reject wrong type for topics', () => {
            expect(() => EventSubscribeParamsSchema.parse({ topics: 'not-an-array' })).toThrow();
            expect(() => EventSubscribeParamsSchema.parse({ topics: 123 })).toThrow();
        });
    });

    describe('EventSubscribeRequestSchema', () => {
        it('should parse a subscribe request', () => {
            const result = EventSubscribeRequestSchema.parse({
                method: 'events/subscribe',
                params: { topics: ['build/#', 'sessions/+/messages'] }
            });
            expect(result.method).toBe('events/subscribe');
            expect(result.params.topics).toEqual(['build/#', 'sessions/+/messages']);
        });

        it('should reject wrong method literal', () => {
            expect(() =>
                EventSubscribeRequestSchema.parse({
                    method: 'events/wrong',
                    params: { topics: ['foo'] }
                })
            ).toThrow();
        });
    });

    describe('EventSubscribeResultSchema', () => {
        it('should parse a minimal subscribe result', () => {
            const result = EventSubscribeResultSchema.parse({
                subscribed: [{ pattern: 'build/#' }]
            });
            expect(result.subscribed).toHaveLength(1);
            expect(result.subscribed[0]!.pattern).toBe('build/#');
            expect(result.rejected).toEqual([]);
            expect(result.retained).toEqual([]);
        });

        it('should parse a subscribe result with rejected and retained', () => {
            const result = EventSubscribeResultSchema.parse({
                subscribed: [{ pattern: 'build/#' }],
                rejected: [{ pattern: 'secret/#', reason: 'permission_denied' }],
                retained: [
                    {
                        topic: 'build/status',
                        eventId: 'ret-001',
                        payload: { status: 'passing' },
                        retained: true
                    }
                ]
            });
            expect(result.subscribed).toHaveLength(1);
            expect(result.subscribed[0]!.pattern).toBe('build/#');
            expect(result.rejected).toHaveLength(1);
            expect(result.rejected![0]!.pattern).toBe('secret/#');
            expect(result.rejected![0]!.reason).toBe('permission_denied');
            expect(result.retained).toHaveLength(1);
            expect(result.retained![0]!.topic).toBe('build/status');
            expect(result.retained![0]!.eventId).toBe('ret-001');
            expect(result.retained![0]!.retained).toBe(true);
            expect(result.retained![0]!.payload).toEqual({ status: 'passing' });
        });
    });

    describe('EventUnsubscribeParamsSchema', () => {
        it('should reject missing topics', () => {
            expect(() => EventUnsubscribeParamsSchema.parse({})).toThrow();
        });

        it('should reject wrong type for topics', () => {
            expect(() => EventUnsubscribeParamsSchema.parse({ topics: 'not-an-array' })).toThrow();
        });
    });

    describe('EventUnsubscribeRequestSchema', () => {
        it('should parse an unsubscribe request', () => {
            const result = EventUnsubscribeRequestSchema.parse({
                method: 'events/unsubscribe',
                params: { topics: ['build/#'] }
            });
            expect(result.method).toBe('events/unsubscribe');
            expect(result.params.topics).toEqual(['build/#']);
        });

        it('should reject wrong method literal', () => {
            expect(() =>
                EventUnsubscribeRequestSchema.parse({
                    method: 'events/wrong',
                    params: { topics: ['foo'] }
                })
            ).toThrow();
        });
    });

    describe('EventUnsubscribeResultSchema', () => {
        it('should parse an unsubscribe result', () => {
            const result = EventUnsubscribeResultSchema.parse({
                unsubscribed: ['build/#', 'sessions/abc/messages']
            });
            expect(result.unsubscribed).toEqual(['build/#', 'sessions/abc/messages']);
        });

        it('should reject missing unsubscribed', () => {
            expect(() => EventUnsubscribeResultSchema.parse({})).toThrow();
        });
    });

    describe('EventListRequestSchema', () => {
        it('should parse a list request', () => {
            const result = EventListRequestSchema.parse({
                method: 'events/list'
            });
            expect(result.method).toBe('events/list');
        });

        it('should accept optional cursor param (paginated)', () => {
            const result = EventListRequestSchema.parse({
                method: 'events/list',
                params: { cursor: 'abc123' }
            });
            expect(result.method).toBe('events/list');
            expect(result.params!.cursor).toBe('abc123');
        });

        it('should reject wrong method literal', () => {
            expect(() => EventListRequestSchema.parse({ method: 'events/wrong' })).toThrow();
        });
    });

    describe('EventListResultSchema', () => {
        it('should parse a list result', () => {
            const result = EventListResultSchema.parse({
                topics: [
                    { pattern: 'build/status', kind: 'content', description: 'Build status', retained: true },
                    { pattern: 'agents/{agent_id}/messages', kind: 'content' }
                ]
            });
            expect(result.topics).toHaveLength(2);
            expect(result.topics[0]!.pattern).toBe('build/status');
            expect(result.topics[0]!.description).toBe('Build status');
            expect(result.topics[0]!.retained).toBe(true);
            expect(result.topics[1]!.pattern).toBe('agents/{agent_id}/messages');
            expect(result.topics[1]!.description).toBeUndefined();
            expect(result.topics[1]!.retained).toBeUndefined();
        });

        it('should accept nextCursor for pagination', () => {
            const result = EventListResultSchema.parse({
                topics: [{ pattern: 'foo/bar', kind: 'signal' }],
                nextCursor: 'page2'
            });
            expect(result.nextCursor).toBe('page2');
        });

        it('should reject missing topics', () => {
            expect(() => EventListResultSchema.parse({})).toThrow();
        });
    });

    describe('RetainedEventSchema', () => {
        it('should parse a retained event', () => {
            const result = RetainedEventSchema.parse({
                topic: 'build/status',
                eventId: 'ret-001',
                payload: { status: 'green' },
                retained: true
            });
            expect(result.topic).toBe('build/status');
            expect(result.eventId).toBe('ret-001');
            expect(result.payload).toEqual({ status: 'green' });
            expect(result.retained).toBe(true);
        });

        it('should parse without optional fields', () => {
            const result = RetainedEventSchema.parse({
                topic: 'x',
                eventId: 'y',
                payload: null
            });
            expect(result.retained).toBeUndefined();
        });

        it('should parse without payload (payload is optional)', () => {
            const result = RetainedEventSchema.parse({
                topic: 'x',
                eventId: 'y'
            });
            expect(result.payload).toBeUndefined();
        });

        it('should reject missing required fields', () => {
            // Missing topic and eventId
            expect(() => RetainedEventSchema.parse({})).toThrow();
            // Missing eventId
            expect(() => RetainedEventSchema.parse({ topic: 'x' })).toThrow();
            // Missing topic
            expect(() => RetainedEventSchema.parse({ eventId: 'y', payload: null })).toThrow();
        });
    });

    describe('RejectedTopicSchema', () => {
        it('should parse a rejected topic', () => {
            const result = RejectedTopicSchema.parse({
                pattern: 'secret/data',
                reason: 'unknown_topic'
            });
            expect(result.pattern).toBe('secret/data');
            expect(result.reason).toBe('unknown_topic');
        });

        it('should reject missing pattern', () => {
            expect(() => RejectedTopicSchema.parse({ reason: 'denied' })).toThrow();
        });

        it('should reject missing reason', () => {
            expect(() => RejectedTopicSchema.parse({ pattern: 'foo' })).toThrow();
        });
    });

    describe('SubscribedTopicSchema', () => {
        it('should parse a subscribed topic', () => {
            const result = SubscribedTopicSchema.parse({
                pattern: 'build/#'
            });
            expect(result.pattern).toBe('build/#');
        });

        it('should reject missing pattern', () => {
            expect(() => SubscribedTopicSchema.parse({})).toThrow();
        });
    });
});

describe('Event schemas wired into unions and capabilities', () => {
    describe('ServerCapabilitiesSchema', () => {
        it('should accept the events field', () => {
            const result = ServerCapabilitiesSchema.parse({
                events: {
                    topics: [{ pattern: 'build/status', kind: 'content', description: 'Build events' }],
                    instructions: 'Subscribe for build updates'
                }
            });
            expect(result.events).toBeDefined();
            expect(result.events!.topics).toHaveLength(1);
            expect(result.events!.instructions).toBe('Subscribe for build updates');
        });

        it('should accept empty events capability', () => {
            const result = ServerCapabilitiesSchema.parse({
                events: {}
            });
            expect(result.events).toBeDefined();
            expect(result.events!.topics).toEqual([]);
        });

        it('should accept capabilities without events', () => {
            const result = ServerCapabilitiesSchema.parse({});
            expect(result.events).toBeUndefined();
        });
    });

    describe('ServerNotificationSchema', () => {
        it('should accept EventEmitNotification', () => {
            const notification = {
                method: 'events/emit',
                params: {
                    topic: 'test/topic',
                    eventId: 'evt-1',
                    payload: { data: 'value' }
                }
            };
            const parsed = ServerNotificationSchema.parse(notification);
            expect(parsed.method).toBe('events/emit');
            const params = parsed.params as { topic: string; eventId: string; payload: unknown };
            expect(params.topic).toBe('test/topic');
            expect(params.eventId).toBe('evt-1');
            expect(params.payload).toEqual({ data: 'value' });
        });
    });

    describe('ClientRequestSchema', () => {
        it('should accept EventSubscribeRequest', () => {
            const parsed = ClientRequestSchema.parse({
                method: 'events/subscribe',
                params: { topics: ['foo/#'] }
            });
            expect(parsed.method).toBe('events/subscribe');
            expect((parsed.params as { topics: string[] }).topics).toEqual(['foo/#']);
        });

        it('should accept EventUnsubscribeRequest', () => {
            const parsed = ClientRequestSchema.parse({
                method: 'events/unsubscribe',
                params: { topics: ['foo/#'] }
            });
            expect(parsed.method).toBe('events/unsubscribe');
            expect((parsed.params as { topics: string[] }).topics).toEqual(['foo/#']);
        });

        it('should accept EventListRequest', () => {
            const parsed = ClientRequestSchema.parse({
                method: 'events/list'
            });
            expect(parsed.method).toBe('events/list');
        });
    });

    describe('ServerResultSchema', () => {
        it('should accept EventSubscribeResult', () => {
            const parsed = ServerResultSchema.parse({
                subscribed: [{ pattern: 'foo/#' }]
            }) as { subscribed: { pattern: string }[] };
            expect(parsed.subscribed).toHaveLength(1);
            expect(parsed.subscribed[0]!.pattern).toBe('foo/#');
        });

        it('should accept EventUnsubscribeResult', () => {
            const parsed = ServerResultSchema.parse({
                unsubscribed: ['foo/#']
            }) as { unsubscribed: string[] };
            expect(parsed.unsubscribed).toEqual(['foo/#']);
        });

        it('should accept EventListResult', () => {
            const parsed = ServerResultSchema.parse({
                topics: [{ pattern: 'foo/bar', kind: 'content' }]
            }) as { topics: { pattern: string }[] };
            expect(parsed.topics).toHaveLength(1);
            expect(parsed.topics[0]!.pattern).toBe('foo/bar');
        });
    });
});
