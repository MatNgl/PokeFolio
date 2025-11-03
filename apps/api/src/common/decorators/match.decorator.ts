import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

type PlainObject = Record<string, unknown>;

function getRelatedPropertyName(args: ValidationArguments, fallback: string): string {
  const constraintsUnknown = args.constraints as unknown;
  const constraints = Array.isArray(constraintsUnknown) ? (constraintsUnknown as unknown[]) : [];
  const first = constraints.length > 0 ? constraints[0] : undefined;
  return typeof first === 'string' && first.length > 0 ? first : fallback;
}

export function Match<T extends PlainObject>(
  property: keyof T & string,
  options?: ValidationOptions
) {
  return function (object: object, propertyName: string): void {
    // Pas de type Function ici
    const target = (object as { constructor: unknown }).constructor;

    const opts: Omit<Parameters<typeof registerDecorator>[0], 'target'> & { target: unknown } = {
      name: 'Match',
      target,
      propertyName,
      options,
      constraints: [property],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const relatedPropertyName = getRelatedPropertyName(args, property);
          const other = (args.object as PlainObject)[relatedPropertyName];
          return value === other;
        },
        defaultMessage(args: ValidationArguments): string {
          const relatedPropertyName = getRelatedPropertyName(args, property);
          return `${String(propertyName)} must match ${relatedPropertyName}`;
        },
      },
    };

    registerDecorator(opts as Parameters<typeof registerDecorator>[0]);
  };
}
