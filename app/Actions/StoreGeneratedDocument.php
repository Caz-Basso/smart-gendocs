<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use App\Models\GeneratedDocument;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final readonly class StoreGeneratedDocument
{ 
    public function handle(
        string $pdfContent,
        string $name,
        User $user,
        ?DocumentModel $model = null,
    ): GeneratedDocument {
        $id = (string) Str::uuid();
        $fileName = Str::slug($name).'-'.now()->format('YmdHis').'-'.Str::random(6).'.pdf';
        $path = 'generated-documents/'.$fileName;

        Storage::disk('local')->put($path, $pdfContent);

        return GeneratedDocument::query()->create([
            'id' => $id,
            'user_id' => $user->id,
            'document_model_id' => $model?->id,
            'name' => $name,
            'file_path' => $path,
        ]);
    }
}
