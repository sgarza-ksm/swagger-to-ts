import swagger2 from './swagger-2';
import swagger3 from './swagger-3';
export default function (spec, options) {
    const swagger = (options && options.swagger) || 2;
    if (swagger === 2) {
        return swagger2(spec, options);
    }
    if (swagger === 3) {
        return swagger3(spec, options);
    }
    throw new Error(`Swagger version ${swagger} is not supported`);
}
//# sourceMappingURL=index.js.map