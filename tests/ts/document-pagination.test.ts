import { describe, expect, it } from 'bun:test';
import { paginateDocument } from '../../resources/js/lib/document-pagination';

const margins = { top: 30, left: 30, right: 20, bottom: 20 };

describe('paginateDocument with headers and footers', () => {
    it('reserves the configured header and footer spacing before splitting content', () => {
        const body = Array.from(
            { length: 22 },
            (_, index) => `<p>Parágrafo de conteúdo ${index + 1}.</p>`,
        ).join('');
        const withHeaderFooter = `<header class="document-header"><p>Cabeçalho institucional</p></header>${body}<footer class="document-footer"><p>Rodapé institucional</p></footer>`;

        const withoutElements = paginateDocument(body, margins);
        const withElements = paginateDocument(withHeaderFooter, margins, {
            headerSpacingCm: 0.6,
            footerSpacingCm: 0.8,
        });

        expect(withElements.length).toBeGreaterThan(withoutElements.length);
    });

    it('keeps explicit page breaks while accounting for header and footer spacing', () => {
        const html = [
            '<header class="document-header"><p>Cabeçalho</p></header><p>Primeira página</p><footer class="document-footer"><p>Rodapé</p></footer>',
            '<p>Segunda página</p>',
        ].join('<div class="page-break" style="page-break-after: always;"></div>');

        expect(
            paginateDocument(html, margins, {
                headerSpacingCm: 1.5,
                footerSpacingCm: 2.5,
            }),
        ).toHaveLength(2);
    });
});
