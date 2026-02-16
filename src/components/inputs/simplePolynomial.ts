export function parsePolynomial(input: string): { [key: number]: number } {
    const terms = input.replace(/ /g, '').match(/-?[^-\+]+/g);
    if (terms === null) throw new SyntaxError('Empty polynomial');
    const coeffs: Map<number, number> = new Map();
    for (const term of terms) {
        const [coeffstr, expstr] = term.split('x^') as [string, string?];
        const coeff = Number(coeffstr.endsWith('x') ? (coeffstr == 'x' ? 1 : (coeffstr == '-x' ? -1 : coeffstr.substring(0, coeffstr.length - 1))) : coeffstr == '-' ? -1 : (coeffstr == '' ? 1 : coeffstr));
        const exp = coeffstr.endsWith('x') ? 1 : Number(expstr ?? 0);
        // special cases for "x^", "ax^" which is parsed to nothing (also handily deals with negative exponents)
        if (isNaN(coeff + exp) || term.endsWith('^')) throw new SyntaxError('Could not parse term ' + term);
        if (coeffs.has(exp)) coeffs.set(exp, coeffs.get(exp)! + coeff);
        else coeffs.set(exp, coeff);
    }
    return Array.from(coeffs.entries()).filter(([_, coeff]) => coeff != 0).reduce((obj, [exp, coeff]) => (obj[exp] = coeff, obj), {} as any);
}

export function formatPolynomial(terms: { [key: number]: number }): string {
    const exponents = Object.keys(terms).map(Number).sort((a, b) => b - a);
    let out = '';
    for (let i = 0; i < exponents.length; i++) {
        const exp = exponents[i];
        const coeff = terms[exp];
        if (i == 0) {
            if (coeff < 0) out += '-';
        } else out += coeff < 0 ? ' - ' : ' + ';
        if (Math.abs(coeff) != 1 || exp == 0) out += Math.abs(coeff);
        if (exp > 0) out += 'x';
        if (exp > 0 && exp != 1) out += '^' + exp;
    }
    return out;
}

namespace Polynomial {
    export const parse = parsePolynomial;
    export const format = formatPolynomial;
}

export default Polynomial;

function testParse() {
    return;
    function test(poly: string) {
        try {
            console.log(poly, parsePolynomial(poly));
        } catch (err) {
            console.log(poly, (err as any).message);
        }
    }
    console.log('------------ VALID CASES ------------')
    test('1')
    test('x')
    test('-x')
    test('3x')
    test('0.5x')
    test('.5x')
    test('x^2')
    test('x^2.5')
    test('x^.5')
    test('3x^2')
    test('0.5x^2.5')
    test('.5x^.5')
    test('3x^2+1')
    test('3x^2+x+1')
    test('3x^2+2x+1')
    test('3x^2-2x-1')
    test('-3x^2-2x-1')
    test('x^2+x^2+3x^2-2x^2')
    test('x^2-x^2')
    test('x^1000000')
    test('')
    console.log('------------ INVALID CASES ------------')
    test('123.223.2')
    test('xx')
    test('x2')
    test('x^')
    test('6x^')
    test('x^^^')
    test('^^^')
    test('.x')
    test('x.')
    test('x.3')
    test('3/2')
    test('buh')
    test('x^buh')
    test('buhx^buh')
    test('x^-2')
    test('-')
}
if (import.meta.env.DEV) testParse();