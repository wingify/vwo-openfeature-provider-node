
/**
 * This utility function check if the provided value is a valid object.
 * @example
 * isValidOject(null)                   // false
 * isValidObject(undefined)             // false
 * isValidObject({})                    // true
 * isValidObject(Object.create(null))   // true
 * isValidObject([])                    // false
 * isValidObject('object')              // false
 * isValidObject(1)                     // false
 * isValidObject(true)                  // false
 * @param value 
 * @returns `true` if the provided value is a valid object, otherwise `false`
 */
export function isValidObject<T = Record<string, unknown>>(value: unknown): value is T {
    if (value === undefined || value === null) return false;
    if (typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}