export interface IncomingWhatsAppMessage {
  providerMessageId: string;
  phone: string;
  chatId: string;
  senderPhone: string;
  isGroup: boolean;
  fromMe: boolean;
  text: string;
  receivedAt: Date;
}

export interface WhatsAppGateway {
  sendText(input: { phone: string; text: string }): Promise<void>;
}

export interface ProcessedMessageRepository {
  wasProcessed(messageId: string, channel: string): Promise<boolean>;
  markProcessed(messageId: string, channel: string): Promise<void>;
}
