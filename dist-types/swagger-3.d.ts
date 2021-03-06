export interface Swagger3Definition {
    $ref?: string;
    allOf?: Swagger3Definition[];
    nullable?: boolean;
    description?: string;
    enum?: string[];
    format?: string;
    items?: Swagger3Definition;
    oneOf?: Swagger3Definition[];
    properties?: {
        [index: string]: Swagger3Definition;
    };
    additionalProperties?: boolean | Swagger3Definition;
    required?: string[];
    type?: 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string';
}
export interface Swagger3 {
    components: {
        schemas: {
            [index: string]: Swagger3Definition;
        };
    };
}
export interface Swagger3Options {
    format?: 'camel' | 'pascal';
    formatProperties?: boolean;
    wrapper?: string | false;
    injectWarning?: boolean;
}
export declare const warningMessage = "\n/**\n * This file was auto-generated by swagger-to-ts.\n * Do not make direct changes to the file.\n */\n";
declare function parse(spec: Swagger3, options?: Swagger3Options): string;
export default parse;
