<?php

declare(strict_types=1);

namespace App\Actions;

use Mpdf\Mpdf;

final readonly class GenerateSampleDocumentAction
{
    /**
     * @param  array<int, string|null>  $preview
     * @param  array<string, string|null>  $data
     */
    public function handle(array $preview, array $data): string
    {
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => 20,
            'margin_right' => 20,
            'margin_top' => 20,
            'margin_bottom' => 20,
        ]);

        $html = collect($preview)
            ->map(function (?string $paragraph) use ($data): string {
                if ($paragraph === null || $paragraph === '') {
                    return '<p style="margin: 0 0 10px">&nbsp;</p>';
                }

                $escapedParagraph = htmlspecialchars(
                    $paragraph,
                    ENT_QUOTES | ENT_SUBSTITUTE,
                    'UTF-8',
                );

                $renderedParagraph = preg_replace_callback(
                    '/\{\{([a-zA-Z0-9_]+)\}\}/',
                    static function (array $matches) use ($data): string {
                        $value = $data[$matches[1]] ?? '';

                        return htmlspecialchars(
                            (string) $value,
                            ENT_QUOTES | ENT_SUBSTITUTE,
                            'UTF-8',
                        );
                    },
                    $escapedParagraph,
                );

                return '<p style="margin: 0 0 10px; line-height: 1.5">'
                    .$renderedParagraph
                    .'</p>';
            })
            ->implode('');

        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }
}
