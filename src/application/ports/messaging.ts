export interface IncomingWhatsAppMessage {
  providerMessageId: string;
  phone: string;
  text: string;
  receivedAt: Date;
}

export interface WhatsAppGateway {
  sendText(input: { phone: string; text: string }): Promise<void>;
  wasMessageProcessed(providerMessageId: string): Promise<boolean>;
  markMessageProcessed(providerMessageId: string): Promise<void>;
}

