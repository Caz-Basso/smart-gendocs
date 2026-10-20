import { Node, mergeAttributes } from '@tiptap/core';

export interface TagNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        tagNode: {
            insertTag: (slug: string, label: string) => ReturnType;
        };
    }
}

export const TagNode = Node.create<TagNodeOptions>({
    name: 'tagNode',

    group: 'inline',

    inline: true,

    atom: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            slug: {
                default: null,
            },
            label: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="tag"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(
                {
                    'data-type': 'tag',
                    class: 'inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors',
                },
                HTMLAttributes,
            ),
            ['span', { class: 'font-bold' }, '{{'],
            HTMLAttributes.label || HTMLAttributes.slug,
            ['span', { class: 'font-bold' }, '}}'],
        ];
    },

    addCommands() {
        return {
            insertTag:
                (slug, label) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: { slug, label },
                    });
                },
        };
    },
});
