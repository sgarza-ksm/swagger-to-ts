import { Swagger2, Swagger2Options } from './swagger-2';
import { Swagger3, Swagger3Options } from './swagger-3';
export interface Options extends Swagger2Options, Swagger3Options {
    swagger?: number;
}
export default function (spec: Swagger2 | Swagger3, options?: Options): string;
