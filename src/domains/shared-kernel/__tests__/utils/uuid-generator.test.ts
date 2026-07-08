import { UuidGenerator } from '../../utils/uuid-generator';

describe('UuidGenerator', () => {
  it('should generate a valid UUID v4', () => {
    const uuid = UuidGenerator.generate();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should generate unique UUIDs', () => {
    const a = UuidGenerator.generate();
    const b = UuidGenerator.generate();
    expect(a).not.toBe(b);
  });
});