<?php

declare(strict_types=1);

namespace App\Actions;

use Mpdf\Mpdf;

final readonly class ConvertHtmlToPdfAction
{
    public function handle(string $html): string
    {
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => 15,
            'margin_right' => 15,
            'margin_top' => 15,
            'margin_bottom' => 15,
        ]);

        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }
}
