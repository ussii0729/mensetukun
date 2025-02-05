// types/pdf.d.ts
declare module "pdfjs-dist/legacy" {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  export interface TextContent {
    items: Array<TextItem | TextMarkedContent>;
  }

  export interface TextItem {
    str: string;
  }

  export interface TextMarkedContent {
    type: string;
  }

  export function getDocument(data: Uint8Array): PDFDocumentLoadingTask;

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }
}
