/**
 * Provenance metadata for MCP events received by a client.
 *
 * This is client-side metadata, NOT a wire-transmitted type. The client
 * generates `trust` from its own configuration (for example, a per-server
 * `events.trust` entry in the application's MCP config). Servers MUST NOT
 * supply their own trust level.
 *
 * Per MCP Events spec v2, `correlationId` has been removed from both the
 * wire format and the XML provenance envelope. Applications that need
 * request/response correlation should carry an identifier inside the
 * event payload.
 */
export interface ProvenanceData {
    server: string;
    trust: 'trusted' | 'untrusted' | 'unknown' | 'configured';
    received_at?: string;
    source?: string;
}

/**
 * Wraps an MCP event with client-side provenance metadata.
 * Used by host applications (e.g., opencode) to track where events came from
 * and render them as XML for LLM context injection.
 *
 * XML format (normative, per MCP Events Spec v2):
 * ```xml
 * <mcp:event server="NAME" topic="TOPIC" priority="PRIORITY" event_id="ID"
 *            trust="LEVEL" source="SOURCE">
 * ESCAPED_PAYLOAD
 * </mcp:event>
 * ```
 *
 * Attribute emission order is fixed: server, topic, priority, event_id,
 * trust, source. Both `event_id` and `source` are emitted only when
 * present. `trust` is always emitted from the client-supplied provenance.
 */
export class ProvenanceEnvelope {
    constructor(
        public readonly event: {
            topic: string;
            payload: unknown;
            eventId?: string;
            priority?: string;
            source?: string;
        },
        public readonly provenance: ProvenanceData
    ) {}

    /** Render as XML for LLM context injection. */
    toXml(): string {
        const attrs = [
            `server="${escapeXml(this.provenance.server)}"`,
            `topic="${escapeXml(this.event.topic)}"`,
            `priority="${escapeXml(this.event.priority ?? 'normal')}"`
        ];
        if (this.event.eventId) {
            attrs.push(`event_id="${escapeXml(this.event.eventId)}"`);
        }
        attrs.push(`trust="${escapeXml(this.provenance.trust)}"`);
        const source = this.event.source ?? this.provenance.source;
        if (source) attrs.push(`source="${escapeXml(source)}"`);

        const payloadStr =
            this.event.payload === undefined
                ? ''
                : typeof this.event.payload === 'string'
                  ? this.event.payload
                  : JSON.stringify(this.event.payload);
        const payloadXml = escapeXml(payloadStr);

        return `<mcp:event ${attrs.join(' ')}>\n${payloadXml}\n</mcp:event>`;
    }
}

function escapeXml(s: string): string {
    return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
