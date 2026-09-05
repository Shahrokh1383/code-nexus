import { ContentDiffDto } from '../../application/dto/content-diff.dto';

export interface IBaselineDiffCacheRepository {
  saveBaseline(filePath: string, content: string): Promise<void>;
  loadBaseline(filePath: string): Promise<string | null>;
  saveDiff(filePath: string, diff: ContentDiffDto): Promise<void>;
  loadDiff(filePath: string): Promise<ContentDiffDto | null>;
  clearCacheForFile(filePath: string): Promise<void>;
}