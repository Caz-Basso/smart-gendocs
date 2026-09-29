export const slugify = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

/**
 * Imagens extraídas de DOCX (ex.: logos) vêm em resolução nativa; sem limite
 * elas estouram a largura do editor. Injetamos estilo inline limitando a largura.
 */
export function constrainImages(html: string): string {
    return html.replace(
        /<img(?![^>]*\bstyle=)/g,
        '<img style="max-width:180px;max-height:72px;width:auto;height:auto"',
    );
}

export function cleanHtml(html: string): string {
    return html
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
}
