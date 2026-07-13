export interface CodeToDocLinkDto {
  id: string;
  codeFileId: string;
  documentId: string;
  type: 'DIRECT' | 'INHERITED';
  createdAt: string;
  migratedAt: string | null;
  codeFileName: string;
  codeFilePath: string;
}

export interface CodeFileSummaryDto {
  id: string;
  name: string;
  path: string;
}