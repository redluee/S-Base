export interface TradeNameInput {
  displayName?: string;
  address?: string | null;
  iban?: string | null;
  kvkNumber?: string | null;
  vatNumber?: string | null;
}

export interface ClientInput {
  name?: string;
  address?: string | null;
  email?: string | null;
  kvkNumber?: string | null;
  standardRate?: number | null;
  contractPdfPath?: string | null;
  contractPdfName?: string | null;
}

export interface ProjectInput {
  clientId?: number;
  tradeNameId?: number | null;
  name?: string;
  description?: string | null;
  location?: string | null;
}

export interface InvoiceLineInput {
  taskDescription: string;
  date?: number | null;
  quantity?: number;
  unitPrice?: number;
  totalCost: number;
  type?: string;
  discountType?: string | null;
  discountValue?: number | null;
}

export interface InvoiceInput {
  clientId?: number;
  projectId?: number | null;
  tradeNameId?: number | null;
  invoiceNumber?: string;
  name?: string | null;
  dateCreated?: number | null;
  dateService?: number | null;
  paymentDueDate?: number | null;
  datePaid?: number | null;
  status?: string;
  isKor?: boolean;
  lines?: InvoiceLineInput[];
}

export interface InvoiceEmailInput {
  to: string;
  subject: string;
  message: string;
  pdfBase64: string;
}

export interface ExpenseInput {
  description?: string;
  category?: string | null;
  amount?: number;
  date?: number | null;
  tradeNameId?: number | null;
  receiptPdfPath?: string | null;
  receiptPdfName?: string | null;
  notes?: string | null;
}

export interface ExpenseListQuery {
  year?: number;
  category?: string;
  tradeNameId?: number;
}
