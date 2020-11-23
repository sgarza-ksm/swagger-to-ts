import propertyMapper from "./property-mapper";
import { comment, nodeType, transformRef, tsArrayOf, tsIntersectionOf, tsPartial, tsUnionOf, tsTupleOf, unrefComponent, } from "./utils";
export const PRIMITIVES = {
    boolean: "boolean",
    string: "string",
    integer: "number",
    number: "number",
};
export default function generateTypesV3(input, options) {
    const { rawSchema = false } = options || {};
    let { paths = {}, components = { schemas: {} } } = input;
    if (rawSchema) {
        components = { schemas: input };
    }
    else {
        if (!input.components && !input.paths) {
            throw new Error(`No components or paths found. Specify --raw-schema to load a raw schema.`);
        }
    }
    const operations = {};
    const propertyMapped = options
        ? propertyMapper(components.schemas, options.propertyMapper)
        : components.schemas;
    function transform(node) {
        switch (nodeType(node)) {
            case "ref": {
                return transformRef(node.$ref, rawSchema ? "schemas/" : "");
            }
            case "string":
            case "number":
            case "boolean": {
                return nodeType(node) || "any";
            }
            case "enum": {
                return tsUnionOf(node.enum.map((item) => typeof item === "number" || typeof item === "boolean"
                    ? item
                    : `'${item.replace(/'/g, "\\'")}'`));
            }
            case "oneOf": {
                return tsUnionOf(node.oneOf.map(transform));
            }
            case "anyOf": {
                return tsIntersectionOf(node.anyOf.map((anyOf) => tsPartial(transform(anyOf))));
            }
            case "object": {
                if ((!node.properties || !Object.keys(node.properties).length) &&
                    !node.allOf &&
                    !node.additionalProperties) {
                    return `{ [key: string]: any }`;
                }
                let properties = createKeys(node.properties || {}, node.required);
                const additionalProperties = node.additionalProperties
                    ? [
                        `{ [key: string]: ${node.additionalProperties === true
                            ? "any"
                            : transform(node.additionalProperties) || "any"};}\n`,
                    ]
                    : [];
                return tsIntersectionOf([
                    ...(node.allOf ? node.allOf.map(transform) : []),
                    ...(properties ? [`{ ${properties} }`] : []),
                    ...additionalProperties,
                ]);
            }
            case "array": {
                if (Array.isArray(node.items)) {
                    return tsTupleOf(node.items.map(transform));
                }
                else {
                    return tsArrayOf(node.items ? transform(node.items) : "any");
                }
            }
        }
        return "";
    }
    function createKeys(obj, required) {
        let output = "";
        Object.entries(obj).forEach(([key, value]) => {
            if (value.description) {
                output += comment(value.description);
            }
            output += `"${key}"${!required || !required.includes(key) ? "?" : ""}: `;
            if (value.nullable) {
                output += "(";
            }
            output += transform(value.schema ? value.schema : value);
            if (value.nullable) {
                output += ") | null";
            }
            output += ";\n";
        });
        return output;
    }
    function transformParameters(parameters) {
        const allParameters = {};
        let output = `parameters: {\n`;
        parameters.forEach((p) => {
            if ("$ref" in p) {
                const referencedValue = p.$ref
                    .substr(2)
                    .split("/")
                    .reduce((value, property) => value[property], input);
                if (!allParameters[referencedValue.in])
                    allParameters[referencedValue.in] = {};
                allParameters[referencedValue.in][referencedValue.name] = transformRef(p.$ref);
                return;
            }
            if (!allParameters[p.in])
                allParameters[p.in] = {};
            allParameters[p.in][p.name] = p;
        });
        Object.entries(allParameters).forEach(([loc, locParams]) => {
            output += `"${loc}": {\n`;
            Object.entries(locParams).forEach(([paramName, paramProps]) => {
                if (typeof paramProps === "string") {
                    const { required } = unrefComponent(components, paramProps);
                    const key = required ? `"${paramName}"` : `"${paramName}"?`;
                    output += `${key}: ${paramProps}\n`;
                    return;
                }
                if (paramProps.description)
                    output += comment(paramProps.description);
                output += `"${paramName}"${paramProps.required === true ? "" : "?"}: ${transform(paramProps.schema)};\n`;
            });
            output += `}\n`;
        });
        output += `}\n`;
        return output;
    }
    function transformOperation(operation) {
        let output = "";
        output += `{\n`;
        if (operation.parameters) {
            output += transformParameters(operation.parameters);
        }
        if (operation.requestBody) {
            output += `requestBody: {\n`;
            Object.entries(operation.requestBody.content || {}).forEach(([contentType, { schema }]) => {
                output += `"${contentType}": ${transform(schema)};\n`;
            });
            output += `}\n`;
        }
        output += `responses: {\n`;
        Object.entries(operation.responses).forEach(([statusCode, response]) => {
            if (response.description)
                output += comment(response.description);
            if (!response.content || !Object.keys(response.content).length) {
                const type = statusCode === "204" || Math.floor(+statusCode / 100) === 3
                    ? "never"
                    : "unknown";
                output += `"${statusCode}": ${type};\n`;
                return;
            }
            output += `"${statusCode}": {\n`;
            Object.entries(response.content).forEach(([contentType, encodedResponse]) => {
                output += `"${contentType}": ${transform(encodedResponse.schema)};\n`;
            });
            output += `}\n`;
        });
        output += `}\n`;
        output += `}\n`;
        return output;
    }
    function transformPaths(paths) {
        let output = "";
        Object.entries(paths).forEach(([path, pathItem]) => {
            output += `"${path}": {\n`;
            Object.entries(pathItem).forEach(([field, operation]) => {
                const isMethod = [
                    "get",
                    "put",
                    "post",
                    "delete",
                    "options",
                    "head",
                    "patch",
                    "trace",
                ].includes(field);
                if (isMethod) {
                    operation = operation;
                    if (operation.operationId) {
                        output += `"${field}": operations["${operation.operationId}"];\n`;
                        operations[operation.operationId] = operation;
                    }
                    else {
                        if (operation.description)
                            output += comment(operation.description);
                        output += `"${field}": ${transformOperation(operation)}`;
                    }
                }
            });
            if (pathItem.parameters) {
                output += transformParameters(pathItem.parameters);
            }
            output += `}\n`;
        });
        return output;
    }
    if (rawSchema) {
        return `export interface schemas {
  ${createKeys(propertyMapped, Object.keys(propertyMapped))}
}`;
    }
    let finalOutput = "";
    if (Object.keys(paths).length) {
        finalOutput += `export interface paths {
  ${transformPaths(paths)}
}

`;
    }
    finalOutput += "export interface operations {\n";
    for (const [operationId, operation] of Object.entries(operations)) {
        if (operation.description)
            finalOutput += comment(operation.description);
        finalOutput += `"${operationId}": ${transformOperation(operation)}`;
    }
    finalOutput += "\n}\n\n";
    finalOutput += "export interface components {\n";
    if (components.parameters && Object.keys(components.parameters).length) {
        finalOutput += `
parameters: {
  ${createKeys(components.parameters, Object.keys(components.parameters))}
}\n`;
    }
    if (Object.keys(propertyMapped).length) {
        finalOutput += `schemas: {
  ${createKeys(propertyMapped, Object.keys(propertyMapped))}
}`;
    }
    if (components.responses && Object.keys(components.responses).length) {
        finalOutput += `
responses: {
  ${createKeys(components.responses, Object.keys(components.responses))}
}`;
    }
    finalOutput += "\n}";
    return finalOutput;
}
