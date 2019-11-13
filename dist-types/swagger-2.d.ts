export interface Swagger2Definition {
    $ref?: string;
    allOf?: Swagger2Definition[];
    description?: string;
    enum?: string[];
    format?: string;
    items?: Swagger2Definition;
    oneOf?: Swagger2Definition[];
    properties?: {
        [index: string]: Swagger2Definition;
    };
    additionalProperties?: boolean | Swagger2Definition;
    required?: string[];
    type?: 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string';
}
export interface Swagger2 {
    definitions: {
        [index: string]: Swagger2Definition;
    };
}
export interface Swagger2Options {
    camelcase?: boolean;
    wrapper?: string | false;
    injectWarning?: boolean;
}
export declare const warningMessage = "\n/**\n * This file was auto-generated by swagger-to-ts.\n * Do not make direct changes to the file.\n */\n";
declare function parse(spec: Swagger2, options?: Swagger2Options): string;
export default parse;
