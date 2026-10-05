export const slugify = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

/**
 * Imagens em documentos A4 (ex.: logos, timbres) devem respeitar as margens
 * sem distorcer proporções nem estourar o layout.
 */
export function constrainImages(html: string): string {
    return html.replace(
        /<img(?![^>]*\bstyle=)/gi,
        '<img style="max-width:100%;height:auto;object-fit:contain;"',
    );
}

export function cleanHtml(html: string): string {
    return html
        .replace(/&nbsp;/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/>\s*[\r\n]+\s*</g, '><')
        .trim();
}
