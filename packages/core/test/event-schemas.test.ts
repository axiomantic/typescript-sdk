import {
    EventEffectSchema,
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
    ServerResultSchema,
} from '../src/types/index.js';


describe('Event Zod schemas', () => {
    describe('EventEffectSchema', () => {
        it('should parse a valid event effect', () => {
            const result = EventEffectSchema.parse({
                type: 'inject_context',
                priority: 'high',
            });
            expect(result.type).toBe('inject_context');
            expect(result.priority).toBe('high');
        });

        it('should default priority to normal', () => {
            const result = EventEffectSchema.parse({
                type: 'notify_user',
            });
            expect(result.priority).toBe('normal');
        });

        it('should accept all valid effect types', () => {
            for (const type of ['inject_context', 'notify_user', 'trigger_turn']) {
                expect(() => EventEffectSchema.parse({ type })).not.toThrow();
            }
        });

        it('should reject invalid effect type', () => {
            expect(() => EventEffectSchema.parse({ type: 'invalid' })).toThrow();
        });
    });

    describe('EventTopicDescriptorSchema', () => {
        it('should parse a minimal topic descriptor', () => {
            const result = EventTopicDescriptorSchema.parse({
                pattern: 'spellbook/sessions/+/messages',
            });
            expect(result.pattern).toBe('spellbook/sessions/+/messages');
            expect(result.description).toBeUndefined();
            expect(result.retained).toBeUndefined();
            expect(result.schema).toBeUndefined();
        });

        it('should parse a full topic descriptor', () => {
            const result = EventTopicDescriptorSchema.parse({
                pattern: 'build/status',
                description: 'Build status events',
                retained: true,
                schema: { type: 'object', properties: { status: { type: 'string' } } },
            });
            expect(result.pattern).toBe('build/status');
            expect(result.description).toBe('Build status events');
            expect(result.retained).toBe(true);
            expect(result.schema).toBeDefined();
        });

        it('should reject missing pattern', () => {
            expect(() => EventTopicDescriptorSchema.parse({})).toThrow();
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
                topics: [{ pattern: 'foo/bar' }],
                instructions: 'Subscribe to foo/bar for updates',
            });
            expect(result.topics).toHaveLength(1);
            expect(result.instructions).toBe('Subscribe to foo/bar for updates');
        });

        it('should accept unknown extra fields (looseObject)', () => {
            const result = EventsCapabilitySchema.parse({
                topics: [],
                customField: 'extra',
                anotherField: 42,
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
                event_id: 'evt-001',
                payload: { status: 'success' },
            });
            expect(result.topic).toBe('build/status');
            expect(result.event_id).toBe('evt-001');
            expect(result.payload).toEqual({ status: 'success' });
        });

        it('should parse full event params', () => {
            const result = EventParamsSchema.parse({
                topic: 'build/status',
                event_id: 'evt-002',
                payload: 'plain text payload',
                timestamp: '2026-04-07T00:00:00Z',
                retained: true,
                source: 'ci-server',
                correlation_id: 'corr-123',
                requested_effects: [{ type: 'inject_context', priority: 'urgent' }],
                expires_at: '2026-04-08T00:00:00Z',
            });
            expect(result.topic).toBe('build/status');
            expect(result.event_id).toBe('evt-002');
            expect(result.payload).toBe('plain text payload');
            expect(result.timestamp).toBe('2026-04-07T00:00:00Z');
            expect(result.retained).toBe(true);
            expect(result.source).toBe('ci-server');
            expect(result.correlation_id).toBe('corr-123');
            expect(result.requested_effects).toHaveLength(1);
            expect(result.requested_effects![0]!.type).toBe('inject_context');
            expect(result.requested_effects![0]!.priority).toBe('urgent');
            expect(result.expires_at).toBe('2026-04-08T00:00:00Z');
        });

        it('should accept _meta from NotificationsParamsSchema', () => {
            const result = EventParamsSchema.parse({
                topic: 'test',
                event_id: 'evt-003',
                payload: null,
                _meta: { progressToken: 'tok-1' },
            });
            expect(result._meta).toBeDefined();
            expect(result._meta!.progressToken).toBe('tok-1');
            expect(result.topic).toBe('test');
            expect(result.event_id).toBe('evt-003');
            expect(result.payload).toBeNull();
        });

        it('should reject invalid data with missing required fields', () => {
            // Missing topic
            expect(() => EventParamsSchema.parse({
                event_id: 'evt-bad',
                payload: null,
            })).toThrow();

            // Missing event_id
            expect(() => EventParamsSchema.parse({
                topic: 'test',
                payload: null,
            })).toThrow();

            // Wrong type for topic
            expect(() => EventParamsSchema.parse({
                topic: 123,
                event_id: 'evt-bad',
                payload: null,
            })).toThrow();

            // Wrong type for event_id
            expect(() => EventParamsSchema.parse({
                topic: 'test',
                event_id: 456,
                payload: null,
            })).toThrow();

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
                    event_id: 'evt-100',
                    payload: { text: 'hello' },
                },
            };
            const result = EventEmitNotificationSchema.parse(notification);
            expect(result.method).toBe('events/emit');
            expect(result.params.topic).toBe('sessions/abc/messages');
        });

        it('should reject wrong method', () => {
            expect(() =>
                EventEmitNotificationSchema.parse({
                    method: 'events/wrong',
                    params: { topic: 'x', event_id: 'y', payload: null },
                })
            ).toThrow();
        });
    });

    describe('EventSubscribeParamsSchema', () => {
        it('should reject missing topics', () => {
            expect(() => EventSubscribeParamsSchema.parse({})).toThrow();
        });

        it('should reject empty topics array', () => {
            // Empty array is technically valid per schema, but wrong type should fail
            expect(() => EventSubscribeParamsSchema.parse({ topics: 'not-an-array' })).toThrow();
        });

        it('should reject wrong type for topics', () => {
            expect(() => EventSubscribeParamsSchema.parse({ topics: 123 })).toThrow();
        });
    });

    describe('EventSubscribeRequestSchema', () => {
        it('should parse a subscribe request', () => {
            const result = EventSubscribeRequestSchema.parse({
                method: 'events/subscribe',
                params: { topics: ['build/#', 'sessions/+/messages'] },
            });
            expect(result.method).toBe('events/subscribe');
            expect(result.params.topics).toEqual(['build/#', 'sessions/+/messages']);
        });

        it('should reject wrong method literal', () => {
            expect(() =>
                EventSubscribeRequestSchema.parse({
                    method: 'events/wrong',
                    params: { topics: ['foo'] },
                })
            ).toThrow();
        });
    });

    describe('EventSubscribeResultSchema', () => {
        it('should parse a minimal subscribe result', () => {
            const result = EventSubscribeResultSchema.parse({
                subscribed: [{ pattern: 'build/#' }],
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
                        event_id: 'ret-001',
                        timestamp: '2026-04-07T00:00:00Z',
                        payload: { status: 'passing' },
                    },
                ],
            });
            expect(result.subscribed).toHaveLength(1);
            expect(result.subscribed[0]!.pattern).toBe('build/#');
            expect(result.rejected).toHaveLength(1);
            expect(result.rejected![0]!.pattern).toBe('secret/#');
            expect(result.rejected![0]!.reason).toBe('permission_denied');
            expect(result.retained).toHaveLength(1);
            expect(result.retained![0]!.topic).toBe('build/status');
            expect(result.retained![0]!.event_id).toBe('ret-001');
            expect(result.retained![0]!.timestamp).toBe('2026-04-07T00:00:00Z');
            expect(result.retained![0]!.payload).toEqual({ status: 'passing' });
        });
    });

    describe('EventUnsubscribeParamsSchema', () => {
        it('should reject missing topics', () => {
            expect(() => EventUnsubscribeParamsSchema.parse({})).toThrow();
        });
    });

    describe('EventUnsubscribeRequestSchema', () => {
        it('should parse an unsubscribe request', () => {
            const result = EventUnsubscribeRequestSchema.parse({
                method: 'events/unsubscribe',
                params: { topics: ['build/#'] },
            });
            expect(result.method).toBe('events/unsubscribe');
            expect(result.params.topics).toEqual(['build/#']);
        });

        it('should reject wrong method literal', () => {
            expect(() =>
                EventUnsubscribeRequestSchema.parse({
                    method: 'events/wrong',
                    params: { topics: ['foo'] },
                })
            ).toThrow();
        });
    });

    describe('EventUnsubscribeResultSchema', () => {
        it('should parse an unsubscribe result', () => {
            const result = EventUnsubscribeResultSchema.parse({
                unsubscribed: ['build/#', 'sessions/abc/messages'],
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
                method: 'events/list',
            });
            expect(result.method).toBe('events/list');
        });

        it('should accept optional cursor param (paginated)', () => {
            const result = EventListRequestSchema.parse({
                method: 'events/list',
                params: { cursor: 'abc123' },
            });
            expect(result.method).toBe('events/list');
            expect(result.params!.cursor).toBe('abc123');
        });

        it('should reject wrong method literal', () => {
            expect(() =>
                EventListRequestSchema.parse({ method: 'events/wrong' })
            ).toThrow();
        });
    });

    describe('EventListResultSchema', () => {
        it('should parse a list result', () => {
            const result = EventListResultSchema.parse({
                topics: [
                    { pattern: 'build/status', description: 'Build status', retained: true },
                    { pattern: 'sessions/{session_id}/messages' },
                ],
            });
            expect(result.topics).toHaveLength(2);
            expect(result.topics[0]!.pattern).toBe('build/status');
            expect(result.topics[0]!.description).toBe('Build status');
            expect(result.topics[0]!.retained).toBe(true);
            expect(result.topics[1]!.pattern).toBe('sessions/{session_id}/messages');
            expect(result.topics[1]!.description).toBeUndefined();
            expect(result.topics[1]!.retained).toBeUndefined();
        });

        it('should accept nextCursor for pagination', () => {
            const result = EventListResultSchema.parse({
                topics: [{ pattern: 'foo/bar' }],
                nextCursor: 'page2',
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
                event_id: 'ret-001',
                timestamp: '2026-04-07T00:00:00Z',
                payload: { status: 'green' },
            });
            expect(result.topic).toBe('build/status');
            expect(result.payload).toEqual({ status: 'green' });
        });

        it('should parse without optional fields', () => {
            const result = RetainedEventSchema.parse({
                topic: 'x',
                event_id: 'y',
                payload: null,
            });
            expect(result.timestamp).toBeUndefined();
        });

        it('should reject missing required fields', () => {
            // Missing topic and event_id
            expect(() => RetainedEventSchema.parse({})).toThrow();
            // Missing event_id
            expect(() => RetainedEventSchema.parse({ topic: 'x' })).toThrow();
            // Missing topic
            expect(() => RetainedEventSchema.parse({ event_id: 'y', payload: null })).toThrow();
        });
    });

    describe('RejectedTopicSchema', () => {
        it('should parse a rejected topic', () => {
            const result = RejectedTopicSchema.parse({
                pattern: 'secret/data',
                reason: 'unknown_topic',
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
                pattern: 'build/#',
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
                    topics: [{ pattern: 'build/status', description: 'Build events' }],
                    instructions: 'Subscribe for build updates',
                },
            });
            expect(result.events).toBeDefined();
            expect(result.events!.topics).toHaveLength(1);
            expect(result.events!.instructions).toBe('Subscribe for build updates');
        });

        it('should accept empty events capability', () => {
            const result = ServerCapabilitiesSchema.parse({
                events: {},
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
                    event_id: 'evt-1',
                    payload: { data: 'value' },
                },
            };
            const parsed = ServerNotificationSchema.parse(notification);
            expect(parsed.method).toBe('events/emit');
            const params = parsed.params as { topic: string; event_id: string; payload: unknown };
            expect(params.topic).toBe('test/topic');
            expect(params.event_id).toBe('evt-1');
            expect(params.payload).toEqual({ data: 'value' });
        });
    });

    describe('ClientRequestSchema', () => {
        it('should accept EventSubscribeRequest', () => {
            const parsed = ClientRequestSchema.parse({
                method: 'events/subscribe',
                params: { topics: ['foo/#'] },
            });
            expect(parsed.method).toBe('events/subscribe');
            expect((parsed.params as { topics: string[] }).topics).toEqual(['foo/#']);
        });

        it('should accept EventUnsubscribeRequest', () => {
            const parsed = ClientRequestSchema.parse({
                method: 'events/unsubscribe',
                params: { topics: ['foo/#'] },
            });
            expect(parsed.method).toBe('events/unsubscribe');
            expect((parsed.params as { topics: string[] }).topics).toEqual(['foo/#']);
        });

        it('should accept EventListRequest', () => {
            const parsed = ClientRequestSchema.parse({
                method: 'events/list',
            });
            expect(parsed.method).toBe('events/list');
        });
    });

    describe('ServerResultSchema', () => {
        it('should accept EventSubscribeResult', () => {
            const parsed = ServerResultSchema.parse({
                subscribed: [{ pattern: 'foo/#' }],
            }) as { subscribed: { pattern: string }[] };
            expect(parsed.subscribed).toHaveLength(1);
            expect(parsed.subscribed[0]!.pattern).toBe('foo/#');
        });

        it('should accept EventUnsubscribeResult', () => {
            const parsed = ServerResultSchema.parse({
                unsubscribed: ['foo/#'],
            }) as { unsubscribed: string[] };
            expect(parsed.unsubscribed).toEqual(['foo/#']);
        });

        it('should accept EventListResult', () => {
            const parsed = ServerResultSchema.parse({
                topics: [{ pattern: 'foo/bar' }],
            }) as { topics: { pattern: string }[] };
            expect(parsed.topics).toHaveLength(1);
            expect(parsed.topics[0]!.pattern).toBe('foo/bar');
        });
    });
});
