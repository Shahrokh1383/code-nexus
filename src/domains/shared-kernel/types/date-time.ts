export class DateTime {
  private readonly _date: Date;

  constructor(date?: Date) {
    this._date = date ? new Date(date.getTime()) : new Date();
  }

  static now(): DateTime {
    return new DateTime();
  }

  static fromISO(isoString: string): DateTime {
    return new DateTime(new Date(isoString));
  }

  toISO(): string {
    return this._date.toISOString();
  }

  toDate(): Date {
    return new Date(this._date.getTime());
  }

  addDays(days: number): DateTime {
    const copy = new Date(this._date.getTime());
    copy.setDate(copy.getDate() + days);
    return new DateTime(copy);
  }

  diffInDays(other: DateTime): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = this._date.getTime() - other._date.getTime();
    return Math.floor(diff / msPerDay);
  }

  equals(other: DateTime): boolean {
    return this._date.getTime() === other._date.getTime();
  }
}