import { useCallback } from "react";
import type { ModelField } from "@/types/model-field";
import { slugify } from "@/utils/slugify";

interface UseModelFieldsProps {
    fields: ModelField[];
    setFields: (fields: ModelField[]) => void;
}

export function useModelFields({
    fields,
    setFields,
}: UseModelFieldsProps) {
    const addField = useCallback(() => {
        setFields([
            ...fields,
            {
                id: crypto.randomUUID(),
                name: "",
                slug: "",
                type: "text",
            },
        ]);
    }, [fields, setFields]);

    const removeField = useCallback(
        (id: string) => {
            setFields(fields.filter((field) => field.id !== id));
        },
        [fields, setFields]
    );

    const updateFieldName = useCallback(
        (id: string, name: string) => {
            setFields(
                fields.map((field) =>
                    field.id === id
                        ? {
                              ...field,
                              name,
                              slug: slugify(name),
                          }
                        : field
                )
            );
        },
        [fields, setFields]
    );

    const updateFieldType = useCallback(
        (id: string, type: string) => {
            setFields(
                fields.map((field) =>
                    field.id === id
                        ? {
                              ...field,
                              type,
                          }
                        : field
                )
            );
        },
        [fields, setFields]
    );

    return {
        addField,
        removeField,
        updateFieldName,
        updateFieldType,
    };
}