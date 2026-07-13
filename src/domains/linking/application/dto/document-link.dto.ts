export interface DocumentLinkDto {
  id: string;
  parentDocumentId: string;
  childDocumentId: string;
  type: 'DIRECT' | 'INHERITED';
  createdAt: string;
}