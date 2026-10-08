import type { DocumentMargins } from '@/components/model/rich-document-editor';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const MM_TO_PX_96DPI = 96 / 25.4; // ~3.7795 px por mm

export const PAGE_BREAK_REGEX =
    /(?:<hr[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>|<div[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>(?:\s*<\/div>)?|<!--\s*(?:a4-)?page-break\s*-->)/gi;

export interface PageDimensions {
    widthMm: number;
    heightMm: number;
    usableHeightMm: number;
    usableHeightPx: number;
    totalHeightPx: number;
    usableWidthMm: number;
    usableWidthPx: number;
}

/**
 * Calcula as dimensões e área útil real da folha A4 com base nas margens
 */
export function getPageDimensions(margins: DocumentMargins): PageDimensions {
    const usableHeightMm = Math.max(
        50,
        A4_HEIGHT_MM - margins.top - margins.bottom,
    );
    const usableWidthMm = Math.max(
        50,
        A4_WIDTH_MM - margins.left - margins.right,
    );

    return {
        widthMm: A4_WIDTH_MM,
        heightMm: A4_HEIGHT_MM,
        usableHeightMm,
        usableHeightPx: Math.round(usableHeightMm * MM_TO_PX_96DPI),
        totalHeightPx: Math.round(A4_HEIGHT_MM * MM_TO_PX_96DPI),
        usableWidthMm,
        usableWidthPx: Math.round(usableWidthMm * MM_TO_PX_96DPI),
    };
}

/**
 * Extrai a configuração gravada nos comentários do HTML
 */
export function extractConfigComment(rawHtml: string): string {
    const match = rawHtml.match(/<!--\s*a4-config:\s*[^>]*-->/);

    return match ? match[0] : '';
}

/**
 * Remove comentários de configuração para processar apenas o conteúdo do documento
 */
export function stripConfigComment(rawHtml: string): string {
    return rawHtml.replace(/<!--\s*a4-config:\s*[^>]*-->\s*/g, '');
}

/**
 * Divide o HTML em páginas respeitando as quebras de página explícitas
 */
export function splitHtmlIntoPages(rawHtml: string): string[] {
    const clean = stripConfigComment(rawHtml).trim();

    if (!clean) {
        return ['<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>'];
    }

    // Divide pelas quebras de página explícitas
    const rawPages = clean.split(PAGE_BREAK_REGEX);

    const pages = rawPages
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    return pages.length > 0
        ? pages
        : ['<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>'];
}

/**
 * Une as páginas individuais gerando o HTML consolidado com quebras e metadados
 */
export function joinPagesIntoHtml(
    pages: string[],
    configComment = '',
): string {
    const validPages = pages
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    if (validPages.length === 0) {
        return configComment
            ? `${configComment}\n<p><br/></p>`
            : '<p><br/></p>';
    }

    const pageBreakHtml =
        '\n<div class="page-break" style="page-break-after: always;"></div>\n<hr class="page-break" style="page-break-after: always; margin: 25px 0; border: none; border-top: 2px dashed #94a3b8; display: none;" />\n';

    const joined = validPages.join(pageBreakHtml);

    return configComment ? `${configComment}\n${joined}` : joined;
}

/**
 * Estima a altura em pixels de um elemento HTML para cálculo de quebra natural de página
 */
function estimateElementHeightPx(tag: string, text: string, htmlContent: string): number {
    const lowerTag = tag.toLowerCase();

    if (lowerTag === 'h1') return 52;
    if (lowerTag === 'h2') return 42;
    if (lowerTag === 'h3') return 34;
    if (lowerTag === 'header') return 70;
    if (lowerTag === 'footer') return 55;

    if (lowerTag === 'table') {
        const rowCount = (htmlContent.match(/<tr\b/gi) || []).length || 1;

        return Math.max(60, rowCount * 38 + 20);
    }

    if (htmlContent.includes('<img')) {
        return 140;
    }

    // Parágrafos: estima altura com base no comprimento do texto (aprox. 85 caracteres por linha em A4 com margens ABNT)
    const charCount = text.trim().length;
    const estimatedLines = Math.max(1, Math.ceil(charCount / 85));
    const lineHeightPx = 28; // ~1.5 de entrelinhas em 12pt
    const marginSpacingPx = 14;

    return estimatedLines * lineHeightPx + marginSpacingPx;
}

/**
 * Divide blocos HTML dentro de uma página que excede naturalmente o limite de altura da folha A4
 */
export function autoPaginateExceededPage(
    pageHtml: string,
    usableHeightPx: number,
): string[] {
    // Quebra o HTML em blocos principais (p, h1, h2, h3, table, header, footer, etc.)
    const blockRegex = /<(p|h1|h2|h3|table|header|footer|div|blockquote)[^>]*>[\s\S]*?<\/\1>|<(hr|br)[^>]*\/?>/gi;
    const matches = Array.from(pageHtml.matchAll(blockRegex));

    if (matches.length <= 1) {
        return [pageHtml];
    }

    const pages: string[] = [];
    let currentBlocks: string[] = [];
    let currentHeight = 0;

    for (const match of matches) {
        const fullBlock = match[0];
        const tag = match[1] || match[2] || 'p';
        const textContent = fullBlock.replace(/<[^>]*>/g, '').trim();
        const blockHeight = estimateElementHeightPx(tag, textContent, fullBlock);

        // Se o bloco atual faz a página estourar a altura útil e já temos blocos na página atual
        if (currentHeight + blockHeight > usableHeightPx && currentBlocks.length > 0) {
            pages.push(currentBlocks.join('\n'));
            currentBlocks = [fullBlock];
            currentHeight = blockHeight;
        } else {
            currentBlocks.push(fullBlock);
            currentHeight += blockHeight;
        }
    }

    if (currentBlocks.length > 0) {
        pages.push(currentBlocks.join('\n'));
    }

    return pages.length > 0 ? pages : [pageHtml];
}

/**
 * Pagina integralmente um documento:
 * 1. Respeita as quebras explícitas existentes
 * 2. Distribui páginas que excedem naturalmente a altura útil da folha A4
 */
export function paginateDocument(
    rawHtml: string,
    margins: DocumentMargins,
): string[] {
    const explicitPages = splitHtmlIntoPages(rawHtml);
    const { usableHeightPx } = getPageDimensions(margins);

    const paginatedPages: string[] = [];

    for (const page of explicitPages) {
        const subPages = autoPaginateExceededPage(page, usableHeightPx);
        paginatedPages.push(...subPages);
    }

    return paginatedPages.length > 0
        ? paginatedPages
        : ['<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>'];
}
