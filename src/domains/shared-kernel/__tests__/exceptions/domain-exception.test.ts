import { DomainException } from '../../exceptions/domain-exception';

describe('DomainException', () => {
  it('should store code, message, and context', () => {
    const ex = new DomainException('ERR_01', 'Something failed', { key: 'val' });
    expect(ex.code).toBe('ERR_01');
    expect(ex.message).toBe('Something failed');
    expect(ex.context).toEqual({ key: 'val' });
    expect(ex.name).toBe('DomainException');
  });

  it('should have empty context by default', () => {
    const ex = new DomainException('ERR_02', 'Default context');
    expect(ex.context).toEqual({});
  });
});