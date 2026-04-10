import { ProvenanceEnvelope, type ProvenanceData } from '../../src/shared/provenance.js';

describe('ProvenanceEnvelope', () => {
    const baseEvent = {
        topic: 'myapp/status',
        payload: { status: 'ok' },
        event_id: 'evt-123'
    };

    const baseProvenance: ProvenanceData = {
        server_id: 'test-server',
        server_trust: 'trusted',
        received_at: '2026-04-10T12:00:00Z'
    };

    describe('toXml()', () => {
        it('should produce correct XML structure', () => {
            const envelope = new ProvenanceEnvelope(baseEvent, baseProvenance);
            const xml = envelope.toXml();
            expect(xml).toBe(
                '<mcp:event server="test-server" trust="trusted" received="2026-04-10T12:00:00Z" topic="myapp/status">{&quot;status&quot;:&quot;ok&quot;}</mcp:event>'
            );
        });

        it('should include event_id when original_event_id is present', () => {
            const envelope = new ProvenanceEnvelope(baseEvent, {
                ...baseProvenance,
                original_event_id: 'evt-original'
            });
            const xml = envelope.toXml();
            expect(xml).toContain('event_id="evt-original"');
        });

        it('should escape XML special characters in payload', () => {
            const envelope = new ProvenanceEnvelope({ ...baseEvent, payload: '<script>alert("xss")</script>' }, baseProvenance);
            const xml = envelope.toXml();
            expect(xml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            expect(xml).not.toContain('<script>');
        });

        it('should escape XML special characters in server_id', () => {
            const envelope = new ProvenanceEnvelope(baseEvent, {
                ...baseProvenance,
                server_id: 'server<&"name'
            });
            const xml = envelope.toXml();
            expect(xml).toContain('server="server&lt;&amp;&quot;name"');
        });

        it('should handle string payload directly', () => {
            const envelope = new ProvenanceEnvelope({ ...baseEvent, payload: 'hello world' }, baseProvenance);
            const xml = envelope.toXml();
            expect(xml).toContain('>hello world</mcp:event>');
        });
    });
});
