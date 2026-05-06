export type SupportTicketSubject =
  | "general"
  | "technical"
  | "billing"
  | "partnership"
  | "other";

export type SupportTicketPriority = "low" | "normal" | "high" | "critical";

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export interface SupportTicket {
  id: string;
  submittedByUserId: string | null;
  submittedByEmail: string | null;
  subject: SupportTicketSubject;
  priority: SupportTicketPriority;
  title: string;
  message: string;
  status: SupportTicketStatus;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportTicketPayload {
  subject?: SupportTicketSubject;
  priority?: SupportTicketPriority;
  title: string;
  message: string;
}

export interface UpdateSupportTicketStatusPayload {
  status: SupportTicketStatus;
  resolutionNote?: string;
}

export interface ListSupportTicketsParams {
  status?: SupportTicketStatus;
  page?: number;
  limit?: number;
}
