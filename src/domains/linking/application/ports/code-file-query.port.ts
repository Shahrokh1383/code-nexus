import { CodeFileSummaryDto } from '../dto/link.dto';

/**
 * Anti-Corruption Layer port to query Code Files from the FileSystem bounded context.
 */
export interface ICodeFileQueryPort {
  getAllCodeFiles(): Promise<CodeFileSummaryDto[]>;
}