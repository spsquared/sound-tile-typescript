import { IOptions as SanitizeHtmlIOptions } from 'sanitize-html';
// code splitting (I hope the type import doesnt import the package too)
const sanitizeHtml = import('sanitize-html');

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

type Extract<Name extends keyof SanitizeHtmlIOptions> = Exclude<SanitizeHtmlIOptions[Name], undefined | boolean>

const rules: SanitizeHtmlIOptions = {
    allowedTags: tags,
    allowedAttributes: tags.reduce<Extract<'allowedAttributes'>>((obj, tag) => (obj[tag] = ['style'], obj), {}),
    allowedStyles: tags.reduce<Extract<'allowedStyles'>>((obj, tag) => (obj[tag] = styles, obj), {})
};
export async function sanitize(dirty: string): Promise<string> {
    return (await sanitizeHtml).default(dirty, rules);
}
