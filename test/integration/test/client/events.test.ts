import { Client } from '@modelcontextprotocol/client';
import type { EventParams } from '@modelcontextprotocol/core';
import { InMemoryTransport } from '@modelcontextprotocol/core';
import { Server } from '@modelcontextprotocol/server';

describe('Client event methods', () => {
    let client: Client;
    let server: Server;
    let clientTransport: InstanceType<typeof InMemoryTransport>;
    let serverTransport: InstanceType<typeof InMemoryTransport>;

    beforeEach(async () => {
        [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

        client = new Client({ name: 'test-client', version: '1.0.0' });
        server = new Server({ name: 'test-server', version: '1.0.0' }, { capabilities: { events: { topics: [] } } });

        // Register event handlers on the server
        server.setRequestHandler('events/subscribe', async request => {
            return {
                subscribed: (request.params as { topics: string[] }).topics.map((t: string) => ({ pattern: t })),
                rejected: [],
                retained: []
            };
        });

        server.setRequestHandler('events/unsubscribe', async request => {
            return { unsubscribed: (request.params as { topics: string[] }).topics };
        });

        server.setRequestHandler('events/list', async () => {
            return {
                topics: [{ pattern: 'myapp/status', description: 'Status updates' }]
            };
        });

        await server.connect(serverTransport);
        await client.connect(clientTransport);
    });

    afterEach(async () => {
        await client.close();
        await server.close();
    });

    it('subscribeEvents() should send events/subscribe and parse response', async () => {
        const result = await client.subscribeEvents({ topics: ['myapp/status'] });
        expect(result.subscribed).toHaveLength(1);
        expect(result.subscribed[0].pattern).toBe('myapp/status');
    });

    it('unsubscribeEvents() should send events/unsubscribe and parse response', async () => {
        const result = await client.unsubscribeEvents({ topics: ['myapp/status'] });
        expect(result.unsubscribed).toHaveLength(1);
        expect(result.unsubscribed[0]).toBe('myapp/status');
    });

    it('listEvents() should send events/list and parse response', async () => {
        const result = await client.listEvents();
        expect(result.topics).toHaveLength(1);
        expect(result.topics[0].pattern).toBe('myapp/status');
    });

    it('onEvent() should receive events/emit notifications', async () => {
        const received: EventParams[] = [];
        client.onEvent(event => {
            received.push(event);
        });

        // Server emits an event notification
        await server.notification({
            method: 'events/emit',
            params: {
                topic: 'myapp/status',
                payload: { status: 'ok' },
                event_id: 'evt-1'
            }
        });

        // Poll until the event arrives (up to 2000ms) to avoid flaky fixed delays
        const deadline = Date.now() + 2000;
        while (received.length === 0 && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 10));
        }

        expect(received).toHaveLength(1);
        expect(received[0].topic).toBe('myapp/status');
        expect(received[0].payload).toEqual({ status: 'ok' });
    });
});
