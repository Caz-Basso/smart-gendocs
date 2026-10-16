
export interface DocumentMargins {
    top: number;
    left: number;
    right: number;
    bottom: number;
}

export type MarginPresetKey = "abnt" | "normal" | "narrow";

export interface EditorConfig {
    margins: DocumentMargins;
    fontFamily: string;
    lineHeight: string;
}

export interface PaginationOptions {
    className: string;
    style: Record<string, string>;
}

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
    margins: { top: 30, left: 30, right: 20, bottom: 20 },
    fontFamily: "'Times New Roman', Times, serif",
    lineHeight: "1.5",
};

export const MARGIN_PRESETS: Record<
    MarginPresetKey,
    { label: string; margins: DocumentMargins }
> = {
    abnt: {
        label: "ABNT Oficial (Sup 3cm, Esq 3cm, Dir 2cm, Inf 2cm)",
        margins: { top: 30, left: 30, right: 20, bottom: 20 },
    },
    normal: {
        label: "Padrão Simétrico (2,5 cm)",
        margins: { top: 25, left: 25, right: 25, bottom: 25 },
    },
    narrow: {
        label: "Margens Estreitas (1,5 cm)",
        margins: { top: 15, left: 15, right: 15, bottom: 15 },
    },
};

export function parseConfigFromHtml(rawHtml: string): EditorConfig {
    const configMatch = rawHtml.match(
        /<!--\s*a4-config:\s*([^>]+)\s*-->/,
    );

    if (!configMatch) {
        return {
            ...DEFAULT_EDITOR_CONFIG,
            margins: { ...DEFAULT_EDITOR_CONFIG.margins },
        };
    }

    const config = configMatch[1];

    const readMargin = (
        key: keyof DocumentMargins,
    ): number => {
        const value = config.match(
            new RegExp(`${key}=(\\d+)`),
        )?.[1];

        return value === undefined
            ? DEFAULT_EDITOR_CONFIG.margins[key]
            : Number(value);
    };

    const fontFamily =
        config.match(/font="([^"]+)"/)?.[1] ??
        DEFAULT_EDITOR_CONFIG.fontFamily;

    const lineHeight =
        config.match(/lineHeight=([0-9.]+)/)?.[1] ??
        DEFAULT_EDITOR_CONFIG.lineHeight;

    return {
        margins: {
            top: readMargin("top"),
            left: readMargin("left"),
            right: readMargin("right"),
            bottom: readMargin("bottom"),
        },
        fontFamily,
        lineHeight,
    };
}

export function getPaginationOptions(
    fontFamily: string,
    lineHeight: string,
): PaginationOptions {
    return {
        className:
            "a4-page-content text-[12pt] text-gray-900 " +
            "[&_h1]:my-4 [&_h1]:text-center [&_h1]:text-[17pt] [&_h1]:font-bold " +
            "[&_h2]:my-3 [&_h2]:text-[14pt] [&_h2]:font-bold " +
            "[&_h3]:my-2 [&_h3]:text-[12pt] [&_h3]:font-bold " +
            "[&_p]:my-1.5 [&_table]:my-3.5",
        style: {
            "font-family": fontFamily,
            "font-size": "12pt",
            "line-height": lineHeight,
            "text-align": "justify",
            "overflow-wrap": "anywhere",
            "word-break": "break-word",
        },
    };
}
