const defaultTableHeaders = ['Item', 'Descrição Oficial', 'Qtd', 'Valor'];

export function buildTableHtml(rowCount: number, columnCount: number): string {
    const headers = Array.from(
        { length: columnCount },
        (_, index) => defaultTableHeaders[index] ?? `Coluna ${index + 1}`,
    );
    const headerCells = headers
        .map(
            (header, index) =>
                `<th style="border: 1px solid #94a3b8; padding: 6pt 10pt; text-align: ${index === 2 ? 'center' : index === 3 ? 'right' : 'left'}; font-weight: bold;">${header}</th>`,
        )
        .join('');
    const rows = Array.from({ length: rowCount - 1 }, () => {
        const cells = headers
            .map(
                (_, index) =>
                    `<td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;${index === 2 ? ' text-align: center;' : index === 3 ? ' text-align: right;' : ''}"><br></td>`,
            )
            .join('');

        return `<tr>${cells}</tr>`;
    }).join('');

    return `<table style="width: 100%; border-collapse: collapse; margin: 14pt 0; font-size: 10.5pt;"><thead><tr style="background-color: #f8fafc;">${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
}
