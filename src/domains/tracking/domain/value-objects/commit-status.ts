import { ValueObject } from '../../../shared-kernel/types/value-object';

export enum CommitStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

export class CommitStatus extends ValueObject {
  private readonly _status: CommitStatusEnum;

  private constructor(status: CommitStatusEnum) {
    super();
    this._status = status;
  }

  static pending(): CommitStatus {
    return new CommitStatus(CommitStatusEnum.PENDING);
  }

  static approved(): CommitStatus {
    return new CommitStatus(CommitStatusEnum.APPROVED);
  }

  get isPending(): boolean {
    return this._status === CommitStatusEnum.PENDING;
  }

  get isApproved(): boolean {
    return this._status === CommitStatusEnum.APPROVED;
  }

  get status(): CommitStatusEnum {
    return this._status;
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof CommitStatus)) {
      return false;
    }
    return this._status === other._status;
  }

  toString(): string {
    return this._status;
  }
}