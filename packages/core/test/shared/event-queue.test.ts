import { McpEventQueue } from '../../src/shared/event-queue.js';
import { ProvenanceEnvelope } from '../../src/shared/provenance.js';

function makeEnvelope(topic: string, payload: unknown = {}): ProvenanceEnvelope {
    return new ProvenanceEnvelope(
        { topic, payload, event_id: `evt-${topic}` },
        { server_id: 'test', server_trust: 'trusted', received_at: new Date().toISOString() }
    );
}

describe('McpEventQueue', () => {
    it('should enqueue and drain events', () => {
        const queue = new McpEventQueue();
        const e1 = makeEnvelope('a');
        const e2 = makeEnvelope('b');
        expect(queue.enqueue(e1)).toBe(true);
        expect(queue.enqueue(e2)).toBe(true);
        expect(queue.size).toBe(2);

        const drained = queue.drain();
        expect(drained).toHaveLength(2);
        expect(queue.isEmpty).toBe(true);
    });

    it('should drain highest priority first', () => {
        const queue = new McpEventQueue({
            priorityFn: (env) => env.event.topic === 'urgent' ? 10 : 1,
        });
        queue.enqueue(makeEnvelope('normal'));
        queue.enqueue(makeEnvelope('urgent'));
        queue.enqueue(makeEnvelope('normal2'));

        const drained = queue.drain();
        expect(drained[0].event.topic).toBe('urgent');
    });

    it('should respect drain count', () => {
        const queue = new McpEventQueue();
        queue.enqueue(makeEnvelope('a'));
        queue.enqueue(makeEnvelope('b'));
        queue.enqueue(makeEnvelope('c'));

        const drained = queue.drain(2);
        expect(drained).toHaveLength(2);
        expect(queue.size).toBe(1);
    });

    it('should reject enqueue when full and new item has lower priority', () => {
        const queue = new McpEventQueue({
            maxSize: 2,
            priorityFn: (env) => env.event.topic === 'high' ? 10 : 1,
        });
        queue.enqueue(makeEnvelope('high'));
        queue.enqueue(makeEnvelope('high'));
        // Queue full with 2 high-priority items. Low-priority item should be rejected.
        expect(queue.enqueue(makeEnvelope('low'))).toBe(false);
        expect(queue.size).toBe(2);
    });

    it('should evict lowest priority when full and new item has higher priority', () => {
        const queue = new McpEventQueue({
            maxSize: 2,
            priorityFn: (env) => env.event.topic === 'high' ? 10 : 1,
        });
        queue.enqueue(makeEnvelope('low'));
        queue.enqueue(makeEnvelope('low'));
        expect(queue.enqueue(makeEnvelope('high'))).toBe(true);
        expect(queue.size).toBe(2);

        const drained = queue.drain();
        expect(drained[0].event.topic).toBe('high');
    });

    it('should return empty array when draining empty queue', () => {
        const queue = new McpEventQueue();
        expect(queue.drain()).toEqual([]);
        expect(queue.isEmpty).toBe(true);
    });

    it('should default to maxSize 1000', () => {
        const queue = new McpEventQueue();
        for (let i = 0; i < 1000; i++) {
            expect(queue.enqueue(makeEnvelope(`evt-${i}`))).toBe(true);
        }
        expect(queue.size).toBe(1000);
        // 1001st with equal priority should be rejected (default priorityFn returns 0 for all)
        expect(queue.enqueue(makeEnvelope('overflow'))).toBe(false);
    });
});
