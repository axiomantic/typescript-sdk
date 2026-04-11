import { DefaultJsonSchemaValidator } from './shimsNode.js';
import type { JsonSchemaType, jsonSchemaValidator, StandardSchemaWithJSON } from '../../core/src/index.js';
import { fromJsonSchema as coreFromJsonSchema } from '../../core/src/index.js';

let _defaultValidator: jsonSchemaValidator | undefined;

export function fromJsonSchema<T = unknown>(schema: JsonSchemaType, validator?: jsonSchemaValidator): StandardSchemaWithJSON<T, T> {
    return coreFromJsonSchema<T>(schema, validator ?? (_defaultValidator ??= new DefaultJsonSchemaValidator()));
}
