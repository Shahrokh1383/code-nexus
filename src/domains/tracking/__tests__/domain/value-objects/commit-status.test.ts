import { CommitStatus, CommitStatusEnum } from '../../../domain/value-objects/commit-status';

describe('CommitStatus', () => {
  it('should create pending status', () => {
    const status = CommitStatus.pending();
    expect(status.isPending).toBe(true);
    expect(status.isApproved).toBe(false);
    expect(status.status).toBe(CommitStatusEnum.PENDING);
  });

  it('should create approved status', () => {
    const status = CommitStatus.approved();
    expect(status.isApproved).toBe(true);
    expect(status.isPending).toBe(false);
    expect(status.status).toBe(CommitStatusEnum.APPROVED);
  });

  it('should equal same status', () => {
    const a = CommitStatus.pending();
    const b = CommitStatus.pending();
    expect(a.equals(b)).toBe(true);
  });

  it('should not equal different status', () => {
    const a = CommitStatus.pending();
    const b = CommitStatus.approved();
    expect(a.equals(b)).toBe(false);
  });

  it('should not equal non-CommitStatus', () => {
    const status = CommitStatus.pending();
    expect(status.equals({} as any)).toBe(false);
  });

  it('should convert pending to string', () => {
    const status = CommitStatus.pending();
    expect(status.toString()).toBe('PENDING');
  });

  it('should convert approved to string', () => {
    const status = CommitStatus.approved();
    expect(status.toString()).toBe('APPROVED');
  });
});