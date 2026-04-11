import { ProvenanceEnvelope, type ProvenanceData } from '../../src/shared/provenance.js';

describe('ProvenanceEnvelope', () => {
    const baseEvent = {
        topic: 'myapp/status',
        payload: { status: 'ok' },
        event_id: 'evt-123',
        priority: 'high',
    };

    const baseProvenance: ProvenanceData = {
        server: 'test-server',
        trust: 'trusted',
    };

    describe('toXml()', () => {
        it('should produce correct XML structure with standardized attributes', () => {
            const envelope = new ProvenanceEnvelope(baseEvent, baseProvenance);
            const xml = envelope.toXml();
            expect(xml).toContain('server="test-server"');
            expect(xml).toContain('topic="myapp/status"');
            expect(xml).toContain('priority="high"');
            expect(xml).toContain('event_id="evt-123"');
            expect(xml).toContain('trust="trusted"');
            expect(xml).toContain('{&quot;status&quot;:&quot;ok&quot;}');
            expect(xml).toMatch(/^<mcp:event /);
            expect(xml).toMatch(/<\/mcp:event>$/);
        });

        it('should default priority to normal when not specified', () => {
            const envelope = new ProvenanceEnvelope(
                { topic: 'test', payload: 'x' },
                baseProvenance,
            );
            const xml = envelope.toXml();
            expect(xml).toContain('priority="normal"');
        });

        it('should include source and correlation_id when present', () => {
            const envelope = new ProvenanceEnvelope(
                { ...baseEvent, source: 'tool/build', correlation_id: 'corr-456' },
                baseProvenance,
            );
            const xml = envelope.toXml();
            expect(xml).toContain('source="tool/build"');
            expect(xml).toContain('correlation_id="corr-456"');
        });

        it('should escape XML special characters in payload', () => {
            const envelope = new ProvenanceEnvelope(
                { ...baseEvent, payload: '<script>alert("xss")</script>' },
                baseProvenance,
            );
            const xml = envelope.toXml();
            expect(xml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            expect(xml).not.toContain('<script>');
        });

        it('should escape XML special characters in server name', () => {
            const envelope = new ProvenanceEnvelope(baseEvent, {
                ...baseProvenance,
                server: 'server<&"name',
            });
            const xml = envelope.toXml();
            expect(xml).toContain('server="server&lt;&amp;&quot;name"');
        });

        it('should handle string payload directly', () => {
            const envelope = new ProvenanceEnvelope(
                { ...baseEvent, payload: 'hello world' },
                baseProvenance,
            );
            const xml = envelope.toXml();
            expect(xml).toContain('hello world');
        });

        it('should handle undefined payload as empty body', () => {
            const envelope = new ProvenanceEnvelope(
                { ...baseEvent, payload: undefined },
                baseProvenance,
            );
            const xml = envelope.toXml();
            expect(xml).toMatch(/<mcp:event [^>]+>\n\n<\/mcp:event>/);
        });
    });
});
