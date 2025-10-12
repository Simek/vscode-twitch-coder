export function isEnum(value: any, Enum: {}): boolean {
  if (value === undefined || (!(typeof value === 'string') && !(typeof value === 'number'))) {
    return false;
  }
  return Object.values(Enum).includes(value);
}
