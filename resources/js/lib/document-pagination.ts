import type { DocumentMargins } from '@/components/model/rich-document-editor';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const MM_TO_PX_96DPI = 96 / 25.4; // ~3.7795 px por mm

export const PAGE_BREAK_REGEX =
    /(?:<hr[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>|<div[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>(?:\s*<\/div>)?|<!--\s*(?:a4-)?page-break\s*-->)/gi;

const EMPTY_PAGE_HTML =
    '<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>';

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
 * Opções de medição. Devem reproduzir o contexto de estilo em que o HTML
 * é exibido na preview (fonte, tamanho, line-height, classe do conteúdo).
 * `className` deve ser a classe do elemento que contém o conteúdo da página
 * (SEM o padding das margens: a largura útil já é aplicada pela paginação).
 */
export interface PaginationOptions {
    className?: string;
    /** Propriedades CSS em kebab-case, ex.: { 'font-family': 'Arial', 'line-height': '1.5' } */
    style?: Record<string, string>;
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
        return [EMPTY_PAGE_HTML];
    }

    // Divide pelas quebras de página explícitas
    const rawPages = clean.split(PAGE_BREAK_REGEX);

    const pages = rawPages
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    return pages.length > 0 ? pages : [EMPTY_PAGE_HTML];
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

/* -------------------------------------------------------------------------- */
/*  Paginação automática baseada em medição real do DOM                        */
/* -------------------------------------------------------------------------- */

const INLINE_TAGS = new Set([
    'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn',
    'em', 'font', 'i', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small',
    'span', 'strike', 'strong', 'sub', 'sup', 'time', 'tt', 'u', 'var', 'wbr',
]);

const RUN_ATTR = 'data-pg-run';

function isInlineNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) return true;
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    return INLINE_TAGS.has((node as Element).tagName.toLowerCase());
}

function hasBlockChildren(el: Element): boolean {
    return Array.from(el.children).some(
        (c) => !INLINE_TAGS.has(c.tagName.toLowerCase()),
    );
}

/** Elemento cujo conteúdo é só texto/inline: pode ser dividido por palavras. */
function isTextBlock(el: Element): boolean {
    return !hasBlockChildren(el) && el.tagName.toLowerCase() !== 'table';
}

/**
 * Converte os filhos de um nó em blocos. Sequências de texto/inline soltas
 * são agrupadas em um wrapper de bloco para poderem ser medidas e movidas.
 */
function toBlocks(parent: Node, runTag: 'p' | 'span'): Element[] {
    const out: Element[] = [];
    let run: Node[] = [];

    const flushRun = () => {
        const meaningful = run.some(
            (n) =>
                n.nodeType === Node.ELEMENT_NODE ||
                (n.textContent ?? '').trim().length > 0,
        );

        if (meaningful) {
            const wrapper = document.createElement(runTag);
            wrapper.setAttribute(RUN_ATTR, '');

            if (runTag === 'span') wrapper.style.display = 'block';

            run.forEach((n) => wrapper.appendChild(n.cloneNode(true)));
            out.push(wrapper);
        }

        run = [];
    };

    parent.childNodes.forEach((node) => {
        if (node.nodeType === Node.COMMENT_NODE) return;

        if (isInlineNode(node)) {
            run.push(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            flushRun();
            out.push(node.cloneNode(true) as Element);
        }
    });

    flushRun();

    return out;
}

function countWords(node: Node): number {
    if (node.nodeType === Node.TEXT_NODE) {
        return ((node.textContent ?? '').match(/\S+/g) ?? []).length;
    }

    let total = 0;
    node.childNodes.forEach((c) => {
        total += countWords(c);
    });

    return total;
}

/**
 * Devolve uma cópia de `root` contendo apenas as palavras [from, to),
 * preservando a marcação inline (strong, span, links...).
 */
function sliceWords(root: Element, from: number, to: number): Element {
    let counter = 0;

    const walk = (node: Node): Node | null => {
        if (node.nodeType === Node.TEXT_NODE) {
            let out = '';

            for (const token of (node.textContent ?? '').split(/(\s+)/)) {
                if (token === '') continue;

                if (/^\s+$/.test(token)) {
                    // espaço só é mantido depois de uma palavra incluída
                    if (counter > from && counter <= to) out += token;
                    continue;
                }

                if (counter >= from && counter < to) out += token;
                counter++;
            }

            return out ? document.createTextNode(out) : null;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return null;

        const el = node as Element;
        const clone = el.cloneNode(false) as Element;
        const isVoid = el.childNodes.length === 0;

        // continuação: elementos que reaparecem em outra página não repetem o id
        if (from > 0) clone.removeAttribute('id');

        if (isVoid) {
            // img, br, etc.: pertencem ao trecho em que sua posição cai
            return counter >= from && counter < to ? clone : null;
        }

        el.childNodes.forEach((child) => {
            const piece = walk(child);
            if (piece) clone.appendChild(piece);
        });

        return clone.childNodes.length > 0 ? clone : null;
    };

    const result =
        (walk(root) as Element | null) ?? (root.cloneNode(false) as Element);

    if (from > 0) {
        // continuação do mesmo bloco: sem id duplicado, recuo ou marcador de lista
        result.removeAttribute('id');
        (result as HTMLElement).style.textIndent = '0';

        if (result.tagName === 'LI') {
            (result as HTMLElement).style.listStyle = 'none';
        }
    }

    return result;
}

/** Maior n em [0, total-1] tal que o trecho [0, n) cabe segundo `fits`. */
function maxWordsFitting(
    el: Element,
    total: number,
    fits: (slice: Element) => boolean,
): number {
    let lo = 0;
    let hi = total - 1;

    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);

        if (fits(sliceWords(el, 0, mid))) lo = mid;
        else hi = mid - 1;
    }

    return lo;
}

/**
 * Container invisível com a largura útil da página e os mesmos estilos do
 * conteúdo exibido na preview. Mede alturas reais via getBoundingClientRect.
 */
class Measurer {
    readonly page: HTMLElement;
    private readonly scratch: HTMLElement;
    private readonly host: HTMLElement;

    constructor(
        widthPx: number,
        private readonly usableHeightPx: number,
        options: PaginationOptions,
    ) {
        this.host = document.createElement('div');
        this.host.setAttribute('aria-hidden', 'true');
        this.host.style.cssText =
            'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;';

        const makeBox = () => {
            const box = document.createElement('div');
            if (options.className) box.className = options.className;

            box.style.setProperty('font-size', '12pt');
            box.style.setProperty('line-height', '1.5');

            Object.entries(options.style ?? {}).forEach(([k, v]) =>
                box.style.setProperty(k, v),
            );

            box.style.setProperty('width', `${widthPx}px`);
            box.style.setProperty('box-sizing', 'content-box');
            box.style.setProperty('display', 'flow-root'); // evita colapso de margem com o container
            box.style.setProperty('padding', '0');
            box.style.setProperty('margin', '0');
            box.style.setProperty('border', '0');
            box.style.setProperty('height', 'auto');

            return box;
        };

        this.page = makeBox();
        this.scratch = makeBox();
        this.host.append(this.page, this.scratch);
        document.body.appendChild(this.host);
    }

    fits(box: HTMLElement): boolean {
        return box.getBoundingClientRect().height <= this.usableHeightPx + 0.5;
    }

    fitsAlone(el: Element): boolean {
        this.scratch.replaceChildren(el.cloneNode(true));

        return this.fits(this.scratch);
    }

    dispose() {
        this.host.remove();
    }
}

/** Divide um bloco de texto em partes que cabem, cada uma, em uma página vazia. */
function splitText(el: Element, m: Measurer): Element[] {
    const total = countWords(el);

    if (total <= 1) return [el];

    const pieces: Element[] = [];
    let from = 0;

    while (from < total) {
        const rest = sliceWords(el, from, Infinity);

        if (m.fitsAlone(rest)) {
            pieces.push(rest);
            break;
        }

        // maior n tal que [from, n) cabe sozinho; no mínimo 1 palavra
        let lo = from + 1;
        let hi = total - 1;

        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);

            if (m.fitsAlone(sliceWords(el, from, mid))) lo = mid;
            else hi = mid - 1;
        }

        pieces.push(sliceWords(el, from, lo));
        from = lo;
    }

    return pieces;
}

/** Divide uma tabela por linhas, repetindo colgroup e thead em cada parte. */
function splitTable(table: Element, m: Measurer): Element[] {
    const rows = Array.from(
        table.querySelectorAll(':scope > tbody > tr, :scope > tr'),
    );

    if (rows.length < 2) return [table];

    const colgroups = Array.from(table.querySelectorAll(':scope > colgroup'));
    const thead = table.querySelector(':scope > thead');
    const tfoot = table.querySelector(':scope > tfoot');

    const groups: HTMLElement[] = [];

    const makeGroup = () => {
        const t = table.cloneNode(false) as HTMLElement;
        colgroups.forEach((c) => t.appendChild(c.cloneNode(true)));

        if (thead) t.appendChild(thead.cloneNode(true));

        // só a primeira parte mantém o id (evita ids duplicados)
        if (groups.length > 0) {
            t.removeAttribute('id');
            t.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
        }

        const tbody = document.createElement('tbody');
        t.appendChild(tbody);

        return { t, tbody };
    };

    let cur = makeGroup();

    for (const row of rows) {
        const clone = row.cloneNode(true);
        cur.tbody.appendChild(clone);

        if (!m.fitsAlone(cur.t) && cur.tbody.childElementCount > 1) {
            cur.tbody.removeChild(clone);
            groups.push(cur.t);
            cur = makeGroup();
            cur.tbody.appendChild(clone);
        }
    }

    if (tfoot) cur.t.appendChild(tfoot.cloneNode(true));
    groups.push(cur.t);

    return groups;
}

/** Divide um container (div, ul, ol, blockquote, li...) agrupando seus filhos. */
function splitContainer(el: Element, m: Measurer): Element[] {
    const children = toBlocks(el, 'span');
    const pieces = children.flatMap((c) => (m.fitsAlone(c) ? [c] : explode(c, m)));

    const isOl = el.tagName === 'OL';
    const baseStart = parseInt(el.getAttribute('start') ?? '1', 10) || 1;
    let liSeen = 0;

    const makeShell = () => {
        const s = el.cloneNode(false) as HTMLElement;
        // só o primeiro grupo mantém o id (evita ids duplicados)
        if (groups.length > 0) s.removeAttribute('id');
        if (isOl) s.setAttribute('start', String(baseStart + liSeen));

        return s;
    };

    const countNewLi = (piece: Element) =>
        piece.tagName === 'LI' &&
        (piece as HTMLElement).style.listStyle !== 'none'
            ? 1
            : 0;

    const groups: Element[] = [];
    let cur = makeShell();
    let curLi = 0;

    for (const piece of pieces) {
        cur.appendChild(piece);

        if (!m.fitsAlone(cur) && cur.childNodes.length > 1) {
            cur.removeChild(piece);
            groups.push(cur);
            liSeen += curLi;
            cur = makeShell();
            curLi = 0;
            cur.appendChild(piece);
        }

        curLi += countNewLi(piece);
    }

    if (cur.childNodes.length > 0) groups.push(cur);

    return groups;
}

/**
 * Quebra um elemento que não cabe sozinho numa página em partes menores.
 * Retorna [el] quando ele não pode ser dividido (ex.: imagem mais alta que a página).
 */
function explode(el: Element, m: Measurer): Element[] {
    if (el.tagName.toLowerCase() === 'table') return splitTable(el, m);
    if (isTextBlock(el)) return splitText(el, m);

    return splitContainer(el, m);
}

function serializePage(page: HTMLElement): string {
    return Array.from(page.children)
        .map((c) => c.outerHTML)
        .join('\n')
        .replace(new RegExp(`\\s${RUN_ATTR}=""`, 'g'), '');
}

/** Pagina o conteúdo de UMA página delimitada por quebras explícitas. */
function paginateExplicitPage(pageHtml: string, m: Measurer): string[] {
    const parsed = new DOMParser().parseFromString(pageHtml, 'text/html');
    const blocks = toBlocks(parsed.body, 'p');

    const pages: string[] = [];
    const page = m.page;
    page.replaceChildren();

    const flush = () => {
        if (page.childNodes.length > 0) {
            pages.push(serializePage(page));
            page.replaceChildren();
        }
    };

    const place = (el: Element): void => {
        // 1) cabe na página atual
        page.appendChild(el);
        if (m.fits(page)) return;
        el.remove();

        // 2) texto: preenche o espaço restante da página atual e continua na próxima
        const total = isTextBlock(el) ? countWords(el) : 0;

        if (total > 1 && page.childNodes.length > 0) {
            const n = maxWordsFitting(el, total, (slice) => {
                page.appendChild(slice);
                const ok = m.fits(page);
                slice.remove();

                return ok;
            });

            if (n > 0) {
                page.appendChild(sliceWords(el, 0, n));
                flush();
                place(sliceWords(el, n, Infinity));

                return;
            }
        }

        // 3) move o bloco inteiro para uma página nova
        if (page.childNodes.length > 0) {
            flush();
            page.appendChild(el);
            if (m.fits(page)) return;
            el.remove();
        }

        // 4) sozinho já excede a página: divide
        const pieces = explode(el, m);

        if (pieces.length <= 1) {
            // indivisível (ex.: imagem maior que a página): ocupa uma página própria
            page.appendChild(el);
            flush();

            return;
        }

        pieces.forEach(place);
    };

    blocks.forEach(place);
    flush();

    return pages.length > 0 ? pages : [pageHtml];
}

/**
 * Divide, via medição real do DOM, uma página que excede a altura útil da folha A4.
 * Sem DOM (SSR) devolve a página inalterada.
 */
export function autoPaginateExceededPage(
    pageHtml: string,
    margins: DocumentMargins,
    options: PaginationOptions = {},
): string[] {
    if (typeof document === 'undefined' || !document.body) return [pageHtml];

    const { usableHeightPx, usableWidthPx } = getPageDimensions(margins);
    const m = new Measurer(usableWidthPx, usableHeightPx, options);

    try {
        return paginateExplicitPage(pageHtml, m);
    } finally {
        m.dispose();
    }
}

/**
 * Pagina integralmente um documento (única fonte de verdade das páginas):
 * 1. Respeita as quebras explícitas (sempre iniciam nova página)
 * 2. Dentro de cada página explícita, distribui o conteúdo pela altura REAL medida
 *    no navegador, dividindo parágrafos/tabelas/listas que sozinhos excedem a folha.
 */
export function paginateDocument(
    rawHtml: string,
    margins: DocumentMargins,
    options: PaginationOptions = {},
): string[] {
    const explicitPages = splitHtmlIntoPages(rawHtml);

    if (typeof document === 'undefined' || !document.body) {
        return explicitPages;
    }

    const { usableHeightPx, usableWidthPx } = getPageDimensions(margins);
    const m = new Measurer(usableWidthPx, usableHeightPx, options);

    try {
        const result: string[] = [];

        for (const page of explicitPages) {
            result.push(...paginateExplicitPage(page, m));
        }

        return result.length > 0 ? result : [EMPTY_PAGE_HTML];
    } finally {
        m.dispose();
    }
}

/**
 * Aguarda fontes e imagens do HTML carregarem (com timeout) para que a medição
 * não use alturas de imagens/fontes ainda não carregadas. Depois, chame
 * paginateDocument de novo (ver DocumentPreview).
 */
export async function waitForLayoutAssets(
    html: string,
    timeoutMs = 3000,
): Promise<void> {
    if (typeof document === 'undefined') return;

    const tasks: Promise<unknown>[] = [];

    if (document.fonts?.ready) tasks.push(document.fonts.ready);

    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('img[src]').forEach((img) => {
        const src = img.getAttribute('src');
        if (!src) return;

        tasks.push(
            new Promise((resolve) => {
                const probe = new Image();
                probe.onload = probe.onerror = () => resolve(null);
                probe.src = src;
            }),
        );
    });

    await Promise.race([
        Promise.allSettled(tasks),
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
}