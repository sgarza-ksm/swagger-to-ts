import * as prettier from 'prettier';
export const warningMessage = `
/**
 * This file was auto-generated by swagger-to-ts.
 * Do not make direct changes to the file.
 */
`;
const TYPES = {
    string: 'string',
    integer: 'number',
    number: 'number',
};
function camelCase(name) {
    return name.replace(/(-|_|\.|\s)+\w/g, (letter) => letter.toUpperCase().replace(/[^0-9a-z]/gi, ''));
}
function pascal(name) {
    return camelCase(name).replace(/[a-z]/, (letter) => letter.toUpperCase());
}
function noFormat(name) {
    return name;
}
function sanitize(name) {
    return name.includes('-') ? `'${name}'` : name;
}
function parse(spec, options = {}) {
    const shouldUseWrapper = options.wrapper !== false;
    const wrapper = typeof options.wrapper === 'string' && options.wrapper
        ? options.wrapper
        : 'declare namespace OpenAPI3';
    const formatKey = (() => {
        switch (options.format) {
            case 'camel': return camelCase;
            case 'pascal': return pascal;
            default: return noFormat;
        }
    })();
    const formatProperties = !!options.formatProperties;
    const shouldInsertWarning = options.injectWarning || false;
    const queue = [];
    const output = [];
    if (shouldInsertWarning) {
        output.push(warningMessage);
    }
    if (wrapper && shouldUseWrapper) {
        output.push(`${wrapper} {`);
    }
    const schemas = spec.components.schemas;
    function getRef(lookup) {
        const ID = lookup.replace('#/components/schemas/', '');
        const ref = schemas[ID];
        return [ID, ref];
    }
    function getType(schema, nestedName) {
        const { $ref, items, type, nullable, ...value } = schema;
        const nextInterface = camelCase(nestedName);
        const DEFAULT_TYPE = 'any';
        if ($ref) {
            const [refName, refProperties] = getRef($ref);
            if (refProperties.items && refProperties.items.$ref) {
                return getType(refProperties, refName);
            }
            if (refProperties.type && TYPES[refProperties.type]) {
                return TYPES[refProperties.type];
            }
            return refName ? `${wrapper.split(' ').pop()}.${refName}` : DEFAULT_TYPE;
        }
        if (items && items.$ref) {
            const [refName] = getRef(items.$ref);
            return `${getType(items, refName)}[]`;
        }
        if (items && items.type) {
            if (items.type === 'array') {
                return `${getType(items, nestedName)}[]`;
            }
            if (TYPES[items.type]) {
                return `${TYPES[items.type]}[]`;
            }
            queue.push([nextInterface, items]);
            return `${nextInterface}[]`;
        }
        if (Array.isArray(value.oneOf)) {
            return value.oneOf.map((def) => getType(def, '')).join(' | ');
        }
        if (value.properties) {
            queue.push([nextInterface, { $ref, items, type, ...value }]);
            return nextInterface;
        }
        if (type) {
            return TYPES[type] || type || DEFAULT_TYPE;
        }
        return DEFAULT_TYPE;
    }
    function buildNextInterface() {
        const nextObject = queue.pop();
        if (!nextObject)
            return;
        const [ID, { allOf, properties, required, additionalProperties, type }] = nextObject;
        let allProperties = properties || {};
        const includes = [];
        if (Array.isArray(allOf)) {
            allOf.forEach((item) => {
                if (item.$ref) {
                    const [refName] = getRef(item.$ref);
                    includes.push(refName);
                }
                else if (item.properties) {
                    allProperties = { ...allProperties, ...item.properties };
                }
            });
        }
        if (!Object.keys(allProperties).length &&
            additionalProperties !== true &&
            type &&
            TYPES[type]) {
            return;
        }
        const isExtending = includes.length ? ` extends ${includes.join(', ')}` : '';
        output.push(`export interface ${formatKey(ID)}${isExtending} {`);
        Object.entries(allProperties).forEach(([key, value]) => {
            const isOptional = !Array.isArray(required) || required.indexOf(key) === -1;
            const formattedKey = formatProperties ? formatKey(key) : key;
            const name = `${sanitize(formattedKey)}${isOptional ? '?' : ''}`;
            const newID = `${ID}${formattedKey}`;
            const interfaceType = getType(value, newID);
            if (typeof value.description === 'string') {
                output.push(`/**\n* ${value.description.replace(/\n$/, '').replace(/\n/g, '\n* ')}\n*/`);
            }
            if (Array.isArray(value.enum)) {
                output.push(`${name}: ${value.enum.map(option => JSON.stringify(option)).join(' | ')};`);
                return;
            }
            output.push(`${name}: ${interfaceType};`);
        });
        if (additionalProperties) {
            if (additionalProperties === true) {
                output.push('[name: string]: any');
            }
            if (additionalProperties.type) {
                const interfaceType = getType(additionalProperties, '');
                output.push(`[name: string]: ${interfaceType}`);
            }
        }
        output.push('}');
    }
    Object.entries(schemas).forEach((entry) => {
        if (entry[1].type === 'object') {
            queue.push(entry);
        }
    });
    queue.sort((a, b) => a[0].localeCompare(b[0]));
    while (queue.length > 0) {
        buildNextInterface();
    }
    if (wrapper && shouldUseWrapper) {
        output.push('}');
    }
    return prettier.format(output.join('\n'), { parser: 'typescript', singleQuote: true });
}
export default parse;
//# sourceMappingURL=swagger-3.js.map