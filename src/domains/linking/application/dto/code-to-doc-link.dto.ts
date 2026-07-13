export interface CodeToDocLinkDto {
  id: string;
  codeFileId: string;
  documentId: string;
  type: 'DIRECT' | 'INHERITED';
  createdAt: string;
  migratedAt: string | null;
}