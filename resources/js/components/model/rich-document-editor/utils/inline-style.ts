const SKIP_WS_PARENTS = new Set(["UL", "OL", "TABLE", "THEAD", "TBODY", "TFOOT", "TR"]);

export function wrapRangeWithStyle(
    root: HTMLElement,
    range: Range,
    cssProperty: string,
    value: string,
): HTMLElement[] {
    const segments: { node: Text; start: number; end: number }[] = [];

    const collect = (t: Text) => {
        const start = t === range.startContainer ? range.startOffset : 0;
        const end = t === range.endContainer ? range.endOffset : t.data.length;
        if (start >= end) return;

        const parent = t.parentElement;
        const whitespaceOnly = !/\S/.test(t.data.slice(start, end));
        if (whitespaceOnly && (!parent || parent === root || SKIP_WS_PARENTS.has(parent.tagName))) {
            return;
        }
        segments.push({ node: t, start, end });
    };

    const ancestor = range.commonAncestorContainer;
    if (ancestor.nodeType === Node.TEXT_NODE) {
        collect(ancestor as Text);
    } else {
        const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
            if (range.intersectsNode(n)) collect(n as Text);
        }
    }

    const wrapped: HTMLElement[] = [];

    for (const { node, start, end } of segments) {
        let target = node;
        if (end < target.length) target.splitText(end);
        if (start > 0) target = target.splitText(start);

        const parent = target.parentElement;
        if (parent && parent !== root && parent.tagName === "SPAN" && parent.childNodes.length === 1) {
            parent.style.setProperty(cssProperty, value);
            wrapped.push(parent);
        } else {
            const span = document.createElement("span");
            span.style.setProperty(cssProperty, value);
            target.parentNode!.insertBefore(span, target);
            span.appendChild(target);
            wrapped.push(span);
        }
    }

    return wrapped;
}