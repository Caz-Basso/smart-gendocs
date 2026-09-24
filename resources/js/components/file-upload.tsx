import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload } from "lucide-react";

interface FileUploadProps {
    templateFile: File | null;
    handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    error?: string;
}

export default function FileUpload({
    templateFile,
    handleFileChange,
    onClearFile,
    error,
}: FileUploadProps) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor="template">Arquivo Base (.docx ou .pdf)</Label>

            {!templateFile ? (
                <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/20 p-4 text-center transition-colors hover:bg-muted/50">
                    <Upload className="mb-1.5 h-6 w-6 text-muted-foreground" />

                    <span className="text-xs font-medium">
                        Clique ou arraste seu arquivo
                    </span>

                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                        Suporta DOCX e PDF
                    </span>

                    <input
                        type="file"
                        id="template"
                        name="template"
                        accept=".docx,.pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </label>
            ) : (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="h-5 w-5 shrink-0 text-primary" />

                        <span className="truncate text-xs font-medium">
                            {templateFile.name}
                        </span>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={onClearFile}
                    >
                        Trocar
                    </Button>
                </div>
            )}

            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    );
}
