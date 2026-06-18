export const MESSAGE_TYPES = ["text", "audio", "image", "document"] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export interface InboundMessageDTO {
  channel: string;
  userId: string;
  conversationId: string;
  message: {
    id: string;
    timestamp: string;
    type: MessageType;
    content: string;
  };
}

export interface AgentResponseDTO {
  success: boolean;
  conversationId: string;
  response: {
    message: string;
    actions: unknown[];
    metadata: Record<string, unknown>;
  };
}

export interface MessageProcessingInput extends Omit<InboundMessageDTO, "userId"> {
  userId?: string;
  identity?: {
    phone?: string;
  };
}
