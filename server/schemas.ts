const string = (maxlength: number, minlength = 0) => ({
  type: "string",
  minLength: minlength,
  maxLength: maxlength,
});
const dateSchema = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const versionSchema = { type: "integer", minimum: 1 };
const nullableId = { anyOf: [string(100, 1), { type: "null" }] };
const object = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) => ({ type: "object", properties, required, additionalProperties: false });

const entryFields = {
  date: dateSchema,
  authorId: { enum: ["him", "her"] },
  body: string(20000),
  mediaIds: {
    type: "array",
    items: string(100, 1),
    maxItems: 100,
    uniqueItems: true,
  },
};
const albumFields = {
  name: string(100, 1),
  description: string(2000),
};
const eventFields = {
  title: string(120, 1),
  date: dateSchema,
  repeat: { enum: ["yearly", "once"] },
  note: string(2000),
};

const deleteQuery = { querystring: object({ version: versionSchema }) };

export {
  string,
  dateSchema,
  versionSchema,
  nullableId,
  object,
  entryFields,
  albumFields,
  eventFields,
  deleteQuery,
};
