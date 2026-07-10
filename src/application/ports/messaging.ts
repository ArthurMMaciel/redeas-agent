export interface IncomingWhatsAppMessage {
  providerMessageId: string;
  phone: string;
  chatId: string;
  senderId: string;
  senderPhone: string;
  isGroup: boolean;
  fromMe: boolean;
  text: string;
  receivedAt: Date;
}

export interface WhatsAppGateway {
  sendText(input: { phone: string; text: string }): Promise<WhatsAppSendResult>;
}

export interface WhatsAppSendResult {
  status: number;
  requestedChatId: string;
  resolvedChatId: string;
  body: string | null;
}

export interface ProcessedMessageRepository {
  wasProcessed(messageId: string, channel: string): Promise<boolean>;
  markProcessed(messageId: string, channel: string): Promise<void>;
}
