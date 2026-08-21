import type { Farm, Plan, User } from "../../domain/entities.js";
import type { MessageType } from "../dtos/message-dtos.js";

export interface AgentAiContext {
  user: User;
  farm: Farm;
  plan: Plan | null;
}

export interface AgentAiReplyInput {
  message: {
    type: MessageType;
    content: string;
    timestamp: string;
  };
  context: AgentAiContext;
}

export interface AgentAiClient {
  reply(input: AgentAiReplyInput): Promise<string>;
}
