'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var prettier = _interopDefault(require('prettier'));

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    });
    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function comment(text) {
  return `/**
  * ${text.trim().replace("\n+$", "").replace(/\n/g, "\n  * ")}
  */
`;
}
function fromEntries(entries) {
  return entries.reduce((obj, [key, val]) => _objectSpread2(_objectSpread2({}, obj), {}, {
    [key]: val
  }), {});
}
function nodeType(obj) {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }

  if (obj["$ref"]) {
    return "ref";
  }

  if (Array.isArray(obj.enum)) {
    return "enum";
  }

  if (obj.type === "boolean") {
    return "boolean";
  }

  if (["binary", "byte", "date", "dateTime", "password", "string"].includes(obj.type)) {
    return "string";
  }

  if (["double", "float", "integer", "number"].includes(obj.type)) {
    return "number";
  }

  if (Array.isArray(obj.anyOf)) {
    return "anyOf";
  }

  if (Array.isArray(obj.oneOf)) {
    return "oneOf";
  }

  if (obj.type === "array" || obj.items) {
    return "array";
  }

  return "object";
}
function swaggerVersion(definition) {
  const {
    openapi
  } = definition;

  if (openapi && parseInt(openapi, 10) === 3) {
    return 3;
  }

  const {
    swagger
  } = definition;

  if (swagger && parseInt(swagger, 10) === 2) {
    return 2;
  }

  throw new Error(`🚏 version missing from schema; specify whether this is OpenAPI v3 or v2 https://swagger.io/specification`);
}
function transformRef(ref, root = "") {
  const isExternalRef = !ref.startsWith("#");
  if (isExternalRef) return "any";
  const parts = ref.replace(/^#\//, root).split("/");
  return `${parts[0]}["${parts.slice(1).join('"]["')}"]`;
}
function tsArrayOf(type) {
  return `(${type})[]`;
}
function tsTupleOf(types) {
  return `[${types.join(", ")}]`;
}
function tsIntersectionOf(types) {
  return `(${types.join(") & (")})`;
}
function tsPartial(type) {
  return `Partial<${type}>`;
}
function tsUnionOf(types) {
  return `(${types.join(") | (")})`;
}
function unrefComponent(components, ref) {
  const [type, object] = ref.match(/(?<=\[")([^"]+)/g);
  return components[type][object];
}

function propertyMapper(schema, transform) {
  if (!transform) {
    return schema;
  }

  return JSON.parse(JSON.stringify(schema), (_, node) => {
    if (!node.properties) {
      return node;
    }

    node.properties = fromEntries(Object.entries(node.properties).map(([key, val]) => {
      if (val.$ref) {
        val.$ref = String(val.$ref);
        return [key, val];
      }

      const schemaObject = val;
      const property = transform(schemaObject, {
        interfaceType: schemaObject.type,
        optional: !Array.isArray(node.required) || node.required.includes(key),
        description: schemaObject.description
      });

      if (property.optional) {
        if (Array.isArray(node.required)) {
          node.required = node.required.filter(r => r !== key);
        }
      } else {
        node.required = [...(node.required || []), key];
      }

      return [key, _objectSpread2(_objectSpread2({}, val), {}, {
        type: property.interfaceType,
        description: property.description
      })];
    }));
    return node;
  });
}

function generateTypesV2(input, options) {
  const rawSchema = options && options.rawSchema;
  let definitions;

  if (rawSchema) {
    definitions = input;
  } else {
    const document = input;

    if (!document.definitions) {
      throw new Error(`⛔️ 'definitions' missing from schema https://swagger.io/specification/v2/#definitions-object`);
    }

    definitions = document.definitions;
  }

  const propertyMapped = options ? propertyMapper(definitions, options.propertyMapper) : definitions;

  function transform(node) {
    switch (nodeType(node)) {
      case "ref":
        {
          return transformRef(node.$ref, rawSchema ? "definitions/" : "");
        }

      case "string":
      case "number":
      case "boolean":
        {
          return nodeType(node) || "any";
        }

      case "enum":
        {
          return tsUnionOf(node.enum.map(item => typeof item === "number" || typeof item === "boolean" ? item : `'${item}'`));
        }

      case "object":
        {
          if ((!node.properties || !Object.keys(node.properties).length) && !node.allOf && !node.additionalProperties) {
            return `{ [key: string]: any }`;
          }

          let properties = createKeys(node.properties || {}, node.required);

          if (node.additionalProperties) {
            properties += `[key: string]: ${nodeType(node.additionalProperties) || "any"};\n`;
          }

          return tsIntersectionOf([...(node.allOf ? node.allOf.map(transform) : []), ...(properties ? [`{ ${properties} }`] : [])]);
        }

      case "array":
        {
          return tsArrayOf(transform(node.items));
        }
    }

    return "";
  }

  function createKeys(obj, required = []) {
    let output = "";
    Object.entries(obj).forEach(([key, value]) => {
      if (value.description) {
        output += comment(value.description);
      }

      output += `"${key}"${!required || !required.includes(key) ? "?" : ""}: `;
      output += transform(value);
      output += ";\n";
    });
    return output;
  }

  return `export interface definitions {
    ${createKeys(propertyMapped, Object.keys(propertyMapped))}
  }`;
}

function generateTypesV3(input, options) {
  const {
    rawSchema = false
  } = options || {};
  let {
    paths = {},
    components = {
      schemas: {}
    }
  } = input;

  if (rawSchema) {
    components = {
      schemas: input
    };
  } else {
    if (!input.components && !input.paths) {
      throw new Error(`No components or paths found. Specify --raw-schema to load a raw schema.`);
    }
  }

  const operations = {};
  const propertyMapped = options ? propertyMapper(components.schemas, options.propertyMapper) : components.schemas;

  function transform(node) {
    switch (nodeType(node)) {
      case "ref":
        {
          return transformRef(node.$ref, rawSchema ? "schemas/" : "");
        }

      case "string":
      case "number":
      case "boolean":
        {
          return nodeType(node) || "any";
        }

      case "enum":
        {
          return tsUnionOf(node.enum.map(item => typeof item === "number" || typeof item === "boolean" ? item : `'${item.replace(/'/g, "\\'")}'`));
        }

      case "oneOf":
        {
          return tsUnionOf(node.oneOf.map(transform));
        }

      case "anyOf":
        {
          return tsIntersectionOf(node.anyOf.map(anyOf => tsPartial(transform(anyOf))));
        }

      case "object":
        {
          if ((!node.properties || !Object.keys(node.properties).length) && !node.allOf && !node.additionalProperties) {
            return `{ [key: string]: any }`;
          }

          let properties = createKeys(node.properties || {}, node.required);
          const additionalProperties = node.additionalProperties ? [`{ [key: string]: ${node.additionalProperties === true ? "any" : transform(node.additionalProperties) || "any"};}\n`] : [];
          return tsIntersectionOf([...(node.allOf ? node.allOf.map(transform) : []), ...(properties ? [`{ ${properties} }`] : []), ...additionalProperties]);
        }

      case "array":
        {
          if (Array.isArray(node.items)) {
            return tsTupleOf(node.items.map(transform));
          } else {
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
    parameters.forEach(p => {
      if ("$ref" in p) {
        const referencedValue = p.$ref.substr(2).split("/").reduce((value, property) => value[property], input);
        if (!allParameters[referencedValue.in]) allParameters[referencedValue.in] = {};
        allParameters[referencedValue.in][referencedValue.name] = transformRef(p.$ref);
        return;
      }

      if (!allParameters[p.in]) allParameters[p.in] = {};
      allParameters[p.in][p.name] = p;
    });
    Object.entries(allParameters).forEach(([loc, locParams]) => {
      output += `"${loc}": {\n`;
      Object.entries(locParams).forEach(([paramName, paramProps]) => {
        if (typeof paramProps === "string") {
          const {
            required
          } = unrefComponent(components, paramProps);
          const key = required ? `"${paramName}"` : `"${paramName}"?`;
          output += `${key}: ${paramProps}\n`;
          return;
        }

        if (paramProps.description) output += comment(paramProps.description);
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
      Object.entries(operation.requestBody.content || {}).forEach(([contentType, {
        schema
      }]) => {
        output += `"${contentType}": ${transform(schema)};\n`;
      });
      output += `}\n`;
    }

    output += `responses: {\n`;
    Object.entries(operation.responses).forEach(([statusCode, response]) => {
      if (response.description) output += comment(response.description);

      if (!response.content || !Object.keys(response.content).length) {
        const type = statusCode === "204" || Math.floor(+statusCode / 100) === 3 ? "never" : "unknown";
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
        const isMethod = ["get", "put", "post", "delete", "options", "head", "patch", "trace"].includes(field);

        if (isMethod) {
          operation = operation;

          if (operation.operationId) {
            output += `"${field}": operations["${operation.operationId}"];\n`;
            operations[operation.operationId] = operation;
          } else {
            if (operation.description) output += comment(operation.description);
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
    if (operation.description) finalOutput += comment(operation.description);
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

const WARNING_MESSAGE = `/**
* This file was auto-generated by openapi-typescript.
* Do not make direct changes to the file.
*/


`;
function swaggerToTS(schema, options) {
  const version = options && options.version || swaggerVersion(schema);
  let output = `${WARNING_MESSAGE}`;

  switch (version) {
    case 2:
      {
        output = output.concat(generateTypesV2(schema, options));
        break;
      }

    case 3:
      {
        output = output.concat(generateTypesV3(schema, options));
        break;
      }
  }

  let prettierOptions = {
    parser: "typescript"
  };

  if (options && options.prettierConfig) {
    try {
      const userOptions = prettier.resolveConfig.sync(path.resolve(process.cwd(), options.prettierConfig));
      prettierOptions = _objectSpread2(_objectSpread2({}, prettierOptions), userOptions);
    } catch (err) {
      console.error(`❌ ${err}`);
    }
  }

  return prettier.format(output, prettierOptions);
}

exports.WARNING_MESSAGE = WARNING_MESSAGE;
exports.default = swaggerToTS;
//# sourceMappingURL=index.js.map
