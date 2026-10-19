import { describe, expect, it } from 'bun:test';
import { buildTableHtml } from '../../resources/js/lib/document-table';

describe('buildTableHtml', () => {
    it('builds the requested number of rows and columns', () => {
        const html = buildTableHtml(3, 2);

        expect(html.match(/<tr\b/g) ?? []).toHaveLength(3);
        expect(html.match(/<th /g) ?? []).toHaveLength(2);
        expect(html.match(/<td /g) ?? []).toHaveLength(4);
    });

    it('uses generic labels when more than four columns are requested', () => {
        const html = buildTableHtml(1, 5);

        expect(html).toContain('Coluna 5');
        expect(html.match(/<td /g) ?? []).toHaveLength(0);
    });
});
