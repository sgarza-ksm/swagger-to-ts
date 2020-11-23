import { OpenAPI2, OpenAPI2Schemas, SwaggerToTSOptions } from "./types";
export declare const PRIMITIVES: {
    [key: string]: "boolean" | "string" | "number";
};
export default function generateTypesV2(input: OpenAPI2 | OpenAPI2Schemas, options?: SwaggerToTSOptions): string;
