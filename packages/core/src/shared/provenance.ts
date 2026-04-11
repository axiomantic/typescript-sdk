/**
 * Provenance metadata for MCP events received by a client.
 * This is client-side metadata, NOT a wire-transmitted type.
 */
export interface ProvenanceData {
    server: string;
    trust: 'trusted' | 'untrusted' | 'unknown' | 'configured';
    received_at?: string;
    source?: string;
    correlation_id?: string;
}

/**
 * Wraps an MCP event with client-side provenance metadata.
 * Used by host applications (e.g., opencode) to track where events came from
 * and render them as XML for LLM context injection.
 *
 * XML format (normative, per MCP Events spec):
 * ```xml
 * <mcp:event server="NAME" topic="TOPIC" priority="PRIORITY" event_id="ID"
 *            trust="LEVEL" source="SOURCE" correlation_id="CID">
 * ESCAPED_PAYLOAD
 * </mcp:event>
 * ```
 */
export class ProvenanceEnvelope {
    constructor(
        public readonly event: {
            topic: string;
            payload: unknown;
            event_id?: string;
            priority?: string;
            source?: string;
            correlation_id?: string;
        },
        public readonly provenance: ProvenanceData
    ) {}

    /** Render as XML for LLM context injection. */
    toXml(): string {
        const attrs = [
            `server="${escapeXml(this.provenance.server)}"`,
            `topic="${escapeXml(this.event.topic)}"`,
            `priority="${escapeXml(this.event.priority ?? 'normal')}"`,
        ];
        if (this.event.event_id) {
            attrs.push(`event_id="${escapeXml(this.event.event_id)}"`);
        }
        attrs.push(`trust="${escapeXml(this.provenance.trust)}"`);
        const source = this.event.source ?? this.provenance.source;
        if (source) attrs.push(`source="${escapeXml(source)}"`);
        const cid = this.event.correlation_id ?? this.provenance.correlation_id;
        if (cid) attrs.push(`correlation_id="${escapeXml(cid)}"`);

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
