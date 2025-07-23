import sanitizeHtml from 'sanitize-html';

const tags = [
    'br',
    'div',
    'span',
    'b',
    'i',
    'em',
    'strong',
    'del',
    'align-left',
    'align-center',
    'align-right',
    'align-justified',
    'blockquote',
    'pre',
    'code',
    'ul',
    'ol',
    'li'
];
const styles: Record<string, RegExp[]> = {
    'text-align': [/center|left|right|justified/],
    'font-size': [/\d+em/]
};

type Extract<Name extends keyof sanitizeHtml.IOptions> = Exclude<sanitizeHtml.IOptions[Name], undefined | boolean>

const rules: sanitizeHtml.IOptions = {
    allowedTags: tags,
    allowedAttributes: tags.reduce<Extract<'allowedAttributes'>>((obj, tag) => (obj[tag] = ['style'], obj), {}),
    allowedStyles: tags.reduce<Extract<'allowedStyles'>>((obj, tag) => (obj[tag] = styles, obj), {})
};
export function sanitize(dirty: string): string {
    return sanitizeHtml(dirty, rules);
}
