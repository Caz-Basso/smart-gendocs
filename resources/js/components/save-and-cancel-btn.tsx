import { Button } from "@/components/ui/button";

import { Loader2, Save, X } from "lucide-react";
interface SaveAndCancelBtnProps {
    processing: boolean;
}

export default function SaveAndCancelBtn({
processing,
}: SaveAndCancelBtnProps) {
    return (
        <div className="flex gap-3 border-t pt-6">
            <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                className="w-1/2"
            >
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>

            <Button
                type="submit"
                disabled={processing}
                className="w-1/2 bg-emerald-700 text-white hover:bg-emerald-800"
            >
                {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Modelo
            </Button>
        </div>
    );
}
