export type DocumentElementType = 'header' | 'footer';

export interface DocumentElement {
    id: string;
    name: string;
    type: DocumentElementType;
    image_path: string;
    image_url: string;
    width: number; // in mm
    height: number; // in mm
    position_x: number; // in mm
    position_y: number; // in mm
    page_target: string;
    is_active: boolean;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    model_elements_count?: number;
}

export interface ModelElementAttachment {
    id?: string;
    /** Local-only key to uniquely identify each attachment instance (not sent to backend). */
    _instanceKey?: string;
    element_id: string;
    element?: DocumentElement;
    name?: string;
    type?: DocumentElementType;
    image_url?: string;
    position_x?: number; // override in mm
    position_y?: number; // override in mm
    width?: number; // override in mm
    height?: number; // override in mm
    repeat_all_pages: boolean;
    pages?: number[]; // e.g. [1] or [1, 2]
    z_index?: number;
}

