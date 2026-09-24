import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

export interface PdfTextElement {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    text: string;
}

export interface PdfDocumentStructure {
    version: 1;
    pages: Array<{
        width: number;
        height: number;
        elements: PdfTextElement[];
    }>;
}

export interface ParsedPdfDocument {
    structure: PdfDocumentStructure;
    pageImages: string[];
}

export function sanitizePdfDocumentStructure(
    structure: PdfDocumentStructure,
): PdfDocumentStructure {
    const clamp = (value: number, minimum: number, maximum: number) =>
        Math.min(maximum, Math.max(minimum, value));

    return {
        version: 1,
        pages: structure.pages.map((page) => ({
            width: Number.isFinite(page.width) && page.width > 0 ? page.width : 595,
            height: Number.isFinite(page.height) && page.height > 0 ? page.height : 842,
            elements: Array.from(page.elements)
                .filter((element) =>
                    Boolean(element)
                    && [element.x, element.y, element.width, element.height, element.fontSize]
                        .every(Number.isFinite),
                )
                .map((element) => ({
                    x: clamp(element.x, 0, 1),
                    y: clamp(element.y, 0, 1),
                    width: clamp(element.width, 0, 1),
                    height: clamp(element.height, 0, 1),
                    fontSize: clamp(element.fontSize, 1, 200),
                    text: typeof element.text === 'string' ? element.text : '',
                })),
        })),
    };
}

export async function parsePdfDocument(file: File): Promise<ParsedPdfDocument> {
    return parsePdfBytes(await file.arrayBuffer());
}

export async function parsePdfBytes(data: ArrayBuffer): Promise<ParsedPdfDocument> {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const structure: PdfDocumentStructure = { version: 1, pages: [] };
    const pageImages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        const elements: PdfTextElement[] = [];

        for (const item of textContent.items) {
            if (!('str' in item) || !item.str.trim()) {
                continue;
            }

            const transform = item.transform;
            if (
                !Array.isArray(transform)
                || transform.length < 6
                || !transform.slice(0, 6).every(Number.isFinite)
                || !Number.isFinite(item.width)
                || !Number.isFinite(item.height)
            ) {
                continue;
            }

            const [x, y] = viewport.convertToViewportPoint(transform[4], transform[5]);
            const fontSize = Math.max(1, Math.hypot(transform[2], transform[3]));
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(fontSize)) {
                continue;
            }

            const top = Math.max(0, y - fontSize);
            const height = Math.min(viewport.height - top, Math.max(fontSize, item.height));
            const element = {
                x: Math.min(1, Math.max(0, x / viewport.width)),
                y: Math.min(1, Math.max(0, top / viewport.height)),
                width: Math.min(1, Math.max(0.002, item.width / viewport.width)),
                height: Math.min(1, Math.max(0.008, height / viewport.height)),
                fontSize: Math.min(200, fontSize),
                text: item.str,
            };

            const line = elements.find((candidate) =>
                Math.abs(candidate.y - element.y) <= Math.max(0.003, element.height / 2),
            );

            if (line) {
                const previousLineX = line.x;
                const right = Math.max(line.x + line.width, element.x + element.width);
                line.x = Math.min(line.x, element.x);
                line.width = Math.min(1 - line.x, right - line.x);
                line.y = Math.min(line.y, element.y);
                line.height = Math.max(line.height, element.height);
                line.fontSize = Math.max(line.fontSize, element.fontSize);
                line.text = element.x >= previousLineX
                    ? `${line.text} ${element.text}`
                    : `${element.text} ${line.text}`;
            } else {
                elements.push(element);
            }
        }

        elements.sort((left, right) => left.y - right.y || left.x - right.x);
        structure.pages.push({ width: viewport.width, height: viewport.height, elements });

        const renderViewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Não foi possível renderizar uma página do PDF.');
        }

        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);
        await page.render({ canvas, viewport: renderViewport }).promise;
        pageImages.push(canvas.toDataURL('image/png'));
    }

    return { structure, pageImages };
}
