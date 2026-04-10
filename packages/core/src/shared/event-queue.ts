import type { ProvenanceEnvelope } from './provenance.js';

export interface McpEventQueueOptions {
    /** Maximum queue size. Default: 1000. */
    maxSize?: number;
    /** Priority function. Higher return value = dequeued first. Default: () => 0. */
    priorityFn?: (event: ProvenanceEnvelope) => number;
}

/**
 * Priority-aware event queue for MCP events wrapped in ProvenanceEnvelopes.
 *
 * Named McpEventQueue (not EventQueue) to avoid collision with opencode's
 * internal EventQueue namespace.
 */
export class McpEventQueue {
    private queue: ProvenanceEnvelope[] = [];
    private maxSize: number;
    private priorityFn: (event: ProvenanceEnvelope) => number;

    constructor(options?: McpEventQueueOptions) {
        this.maxSize = options?.maxSize ?? 1000;
        this.priorityFn = options?.priorityFn ?? (() => 0);
    }

    /**
     * Add an event to the queue.
     * If the queue is full, evicts the lowest-priority item only if the new
     * item has strictly higher priority. Returns false if rejected.
     */
    enqueue(envelope: ProvenanceEnvelope): boolean {
        if (this.queue.length >= this.maxSize) {
            const minIdx = this._findMinPriorityIndex();
            // queue[minIdx] is always defined: queue is non-empty (length >= maxSize >= 1)
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const minPriority = this.priorityFn(this.queue[minIdx]!);
            const newPriority = this.priorityFn(envelope);
            if (newPriority > minPriority) {
                this.queue.splice(minIdx, 1);
            } else {
                return false;
            }
        }
        this.queue.push(envelope);
        return true;
    }

    /**
     * Drain up to `count` events, highest priority first.
     * Equal-priority events drain in FIFO order (ES2019+ stable sort).
     */
    drain(count?: number): ProvenanceEnvelope[] {
        this.queue.sort((a, b) => this.priorityFn(b) - this.priorityFn(a));
        const n = count ?? this.queue.length;
        return this.queue.splice(0, n);
    }

    get size(): number {
        return this.queue.length;
    }

    get isEmpty(): boolean {
        return this.queue.length === 0;
    }

    private _findMinPriorityIndex(): number {
        let minIdx = 0;
        // queue is non-empty when this is called (only called after length >= maxSize check)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        let minPri = this.priorityFn(this.queue[0]!);
        for (let i = 1; i < this.queue.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const pri = this.priorityFn(this.queue[i]!);
            if (pri < minPri) {
                minPri = pri;
                minIdx = i;
            }
        }
        return minIdx;
    }
}
