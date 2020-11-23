export interface OpenAPI3Schemas {
    [key: string]: OpenAPI3SchemaObject | OpenAPI3Reference;
}
export interface OpenAPI3Paths {
    [path: string]: OpenAPI3PathItemObject;
}
export declare type OpenAPI3PathItemObject = {
    $ref?: string;
    summary?: string;
    description?: string;
    get?: OpenAPI3Operation;
    put?: OpenAPI3Operation;
    post?: OpenAPI3Operation;
    delete?: OpenAPI3Operation;
    options?: OpenAPI3Operation;
    head?: OpenAPI3Operation;
    patch?: OpenAPI3Operation;
    trace?: OpenAPI3Operation;
    parameters?: Parameter[];
};
export interface OpenAPI3Operation {
    operationId?: string;
    summary?: string;
    description?: string;
    parameters?: Parameter[];
    requestBody?: OpenAPI3RequestBody;
    responses: {
        [statusCode: string]: OpenAPI3ResponseObject;
    };
}
export declare type Parameter = {
    $ref: string;
} | OpenAPI3Parameter;
export interface OpenAPI3Parameter {
    name: string;
    description?: string;
    required?: boolean;
    in: "query" | "header" | "path" | "cookie";
    schema: OpenAPI3SchemaObject | OpenAPI3Reference;
}
export interface OpenAPI3ResponseObject {
    description?: string;
    content?: {
        [contentType: string]: {
            schema: OpenAPI3SchemaObject | OpenAPI3Reference;
        };
    };
}
export interface OpenAPI3RequestBody {
    description?: string;
    content?: {
        [contentType: string]: {
            schema: OpenAPI3SchemaObject | {
                $ref: string;
            };
        };
    };
}
export interface OpenAPI3Components {
    schemas: OpenAPI3Schemas;
    responses?: {
        [key: string]: OpenAPI3ResponseObject;
    };
    parameters?: {
        [key: string]: OpenAPI3Parameter;
    };
}
export interface OpenAPI3 {
    openapi: string;
    paths?: OpenAPI3Paths;
    components?: OpenAPI3Components;
    operations?: {
        [key: string]: OpenAPI3Operation;
    };
    [key: string]: any;
}
export declare type OpenAPI3Type = "array" | "boolean" | "integer" | "number" | "object" | "string";
export declare type OpenAPI3Reference = {
    $ref: string;
} | {
    anyOf: (OpenAPI3SchemaObject | OpenAPI3Reference)[];
} | {
    oneOf: (OpenAPI3SchemaObject | OpenAPI3Reference)[];
};
export interface OpenAPI3SchemaObject {
    additionalProperties?: OpenAPI3SchemaObject | OpenAPI3Reference | boolean;
    allOf?: (OpenAPI3SchemaObject | OpenAPI3Reference)[];
    description?: string;
    enum?: string[];
    items?: OpenAPI3SchemaObject | OpenAPI3Reference;
    nullable?: boolean;
    oneOf?: (OpenAPI3SchemaObject | OpenAPI3Reference)[];
    properties?: {
        [key: string]: OpenAPI3SchemaObject | OpenAPI3Reference;
    };
    required?: string[];
    title?: string;
    type?: OpenAPI3Type;
    [key: string]: any;
}
