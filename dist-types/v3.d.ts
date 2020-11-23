import { OpenAPI3, OpenAPI3Schemas, SwaggerToTSOptions } from "./types";
export declare const PRIMITIVES: {
    [key: string]: "boolean" | "string" | "number";
};
export default function generateTypesV3(input: OpenAPI3 | OpenAPI3Schemas, options?: SwaggerToTSOptions): string;
