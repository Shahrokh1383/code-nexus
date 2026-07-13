import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { CodeToDocLink } from '../../../domain/entities/code-to-doc-link';
import { GetUnlinkedCodefilesQuery } from '../../../application/queries/get-unlinked-codefiles.query';
import { GetUnlinkedCodefilesHandler } from '../../../application/handlers/get-unlinked-codefiles.handler';
import { ILinkRepository } from '../../../domain/repository/link-repository.interface';
import { ICodeFileQueryPort } from '../../../application/ports/code-file-query.port';
import { CodeFileSummaryDto } from '../../../application/dto/link.dto';

describe('GetUnlinkedCodefilesHandler', () => {
  let handler: GetUnlinkedCodefilesHandler;
  let mockLinkRepo: jest.Mocked<ILinkRepository>;
  let mockCodeFilePort: jest.Mocked<ICodeFileQueryPort>;

  beforeEach(() => {
    mockLinkRepo = { findAll: jest.fn() } as any;
    mockCodeFilePort = { getAllCodeFiles: jest.fn() } as any;
    handler = new GetUnlinkedCodefilesHandler(mockLinkRepo, mockCodeFilePort);
  });

  it('should return code files that have no links', async () => {
    const file1: CodeFileSummaryDto = { id: 'f1', name: 'file1.ts', path: 'src/file1.ts' };
    const file2: CodeFileSummaryDto = { id: 'f2', name: 'file2.ts', path: 'src/file2.ts' };
    
    mockCodeFilePort.getAllCodeFiles.mockResolvedValue([file1, file2]);
    const link = CodeToDocLink.create(new FileNodeId('f1'), DocumentId.generate());
    mockLinkRepo.findAll.mockResolvedValue([link]);

    const query = new GetUnlinkedCodefilesQuery();
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const unlinked = result.getValue();
    expect(unlinked).toHaveLength(1);
    expect(unlinked![0].id).toBe('f2');
  });

  it('should return all code files if there are no links', async () => {
    const file1: CodeFileSummaryDto = { id: 'f1', name: 'file1.ts', path: 'src/file1.ts' };
    mockCodeFilePort.getAllCodeFiles.mockResolvedValue([file1]);
    mockLinkRepo.findAll.mockResolvedValue([]);

    const result = await handler.execute(new GetUnlinkedCodefilesQuery());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toHaveLength(1);
  });

  it('should return empty array if all code files are linked', async () => {
    const file1: CodeFileSummaryDto = { id: 'f1', name: 'file1.ts', path: 'src/file1.ts' };
    mockCodeFilePort.getAllCodeFiles.mockResolvedValue([file1]);
    
    const link = CodeToDocLink.create(new FileNodeId('f1'), DocumentId.generate());
    mockLinkRepo.findAll.mockResolvedValue([link]);

    const result = await handler.execute(new GetUnlinkedCodefilesQuery());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toHaveLength(0);
  });
});