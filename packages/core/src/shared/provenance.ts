/**
 * Provenance metadata for MCP events received by a client.
 * This is client-side metadata, NOT a wire-transmitted type.
 */
export interface ProvenanceData {
    server_id: string;
    server_trust: 'trusted' | 'untrusted' | 'unknown' | 'configured';
    received_at: string; // ISO 8601
    original_event_id?: string;
    forwarded_by?: string[];
}

/**
 * Wraps an MCP event with client-side provenance metadata.
 * Used by host applications (e.g., opencode) to track where events came from
 * and render them as XML for LLM context injection.
 */
export class ProvenanceEnvelope {
    constructor(
        public readonly event: { topic: string; payload: unknown; event_id?: string; [key: string]: unknown },
        public readonly provenance: ProvenanceData
    ) {}

    /** Render as XML for LLM context injection. */
    toXml(): string {
        const attrs = [
            `server="${escapeXml(this.provenance.server_id)}"`,
            `trust="${escapeXml(this.provenance.server_trust)}"`,
            `received="${escapeXml(this.provenance.received_at)}"`,
        ];
        if (this.provenance.original_event_id) {
            attrs.push(`event_id="${escapeXml(this.provenance.original_event_id)}"`);
        }

        const payloadXml = typeof this.event.payload === 'string'
            ? escapeXml(this.event.payload)
            : escapeXml(JSON.stringify(this.event.payload));

        return `<mcp:event ${attrs.join(' ')} topic="${escapeXml(this.event.topic)}">${payloadXml}</mcp:event>`;
    }
}

function escapeXml(s: string): string {
    return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
