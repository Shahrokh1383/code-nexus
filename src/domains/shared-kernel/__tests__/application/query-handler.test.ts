import { IQuery } from '../../application/query.interface';
import { IQueryHandler } from '../../application/query-handler.interface';
import { Result } from '../../types/result';

class TestQuery implements IQuery {
  constructor(readonly id: string) {}
}

class TestQueryHandler implements IQueryHandler<TestQuery, string> {
  async execute(query: TestQuery): Promise<Result<string, string>> {
    return Result.ok(`found: ${query.id}`);
  }
}

describe('IQueryHandler', () => {
  it('should execute a query and return success', async () => {
    const handler = new TestQueryHandler();
    const result = await handler.execute(new TestQuery('42'));
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe('found: 42');
  });
});