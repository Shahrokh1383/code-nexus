import { InvalidStateException } from '../../exceptions/invalid-state-exception';

describe('InvalidStateException', () => {
  it('should store message and context', () => {
    const ex = new InvalidStateException('State is broken', { reason: 'x' });
    expect(ex.code).toBe('INVALID_STATE');
    expect(ex.message).toBe('State is broken');
    expect(ex.context).toEqual({ reason: 'x' });
    expect(ex.name).toBe('InvalidStateException');
  });

  it('should have empty context by default', () => {
    const ex = new InvalidStateException('No context');
    expect(ex.context).toEqual({});
  });
});