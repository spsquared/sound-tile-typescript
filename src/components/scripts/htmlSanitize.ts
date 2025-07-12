import sanitizeHtml from 'sanitize-html';

export function sanitize(dirty: string): string {
    return sanitizeHtml(dirty, {
        allowedTags: [
            'div',
            'span',
            'b',
            'i',
            'em',
            'strong',
            'del',
            'br',
            'blockquote',
            'pre',
            'code',
            'ul',
            'ol',
            'li'
        ],
        allowedAttributes: {
            'div': ['style'],
            'span': ['style'],
        },
        // allowedStyles: {
        //     'div': ['text-align']
        // }
    });
}