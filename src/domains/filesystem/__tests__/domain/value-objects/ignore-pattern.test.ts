import { IgnorePattern } from '../../../domain/value-objects/ignore-pattern';
import { DomainException } from '../../../../shared-kernel/exceptions/domain-exception';

describe('IgnorePattern', () => {
  it('should create a valid pattern', () => {
    const pattern = new IgnorePattern('*.ts');
    expect(pattern.pattern).toBe('*.ts');
  });

  it('should throw for empty string', () => {
    expect(() => new IgnorePattern('')).toThrow(DomainException);
  });

  it('should throw for whitespace-only string', () => {
    expect(() => new IgnorePattern('   ')).toThrow(DomainException);
  });

  it('should match exact path', () => {
    const pattern = new IgnorePattern('debug.log');
    expect(pattern.matches('debug.log')).toBe(true);
    expect(pattern.matches('other.log')).toBe(false);
  });

  it('should match simple wildcard for files in root', () => {
    const pattern = new IgnorePattern('*.ts');
    expect(pattern.matches('index.ts')).toBe(true);
    expect(pattern.matches('app.ts')).toBe(true);
    expect(pattern.matches('src/index.ts')).toBe(false);
  });

  it('should match double-star wildcard at any depth', () => {
    const pattern = new IgnorePattern('**/*.log');
    expect(pattern.matches('debug.log')).toBe(true);
    expect(pattern.matches('src/debug.log')).toBe(true);
    expect(pattern.matches('deep/nested/error.log')).toBe(true);
  });

  it('should match single-character wildcard', () => {
    const pattern = new IgnorePattern('temp?');
    expect(pattern.matches('temp1')).toBe(true);
    expect(pattern.matches('tempA')).toBe(true);
    expect(pattern.matches('temp')).toBe(false);
  });

  it('should match directory prefix patterns', () => {
    const pattern = new IgnorePattern('node_modules/');
    expect(pattern.matches('node_modules')).toBe(true);
    expect(pattern.matches('node_modules/lodash/index.js')).toBe(true);
    expect(pattern.matches('node_modules/')).toBe(true);
    expect(pattern.matches('src/node_modules')).toBe(false);
  });

  it('should not match unrelated paths', () => {
    const pattern = new IgnorePattern('*.md');
    expect(pattern.matches('readme.txt')).toBe(false);
  });

  it('should equal another IgnorePattern with the same pattern', () => {
    const p1 = new IgnorePattern('*.ts');
    const p2 = new IgnorePattern('*.ts');
    expect(p1.equals(p2)).toBe(true);
  });
});