import { GuidelineService } from './GuidelineService';
import { PromptService } from './PromptService';
import { ConversationService } from './ConversationService';
import { ChatRequest, ChatMessage } from '../types';

export class AgentService {
  private guidelineService: GuidelineService;
  private promptService: PromptService;
  private conversationService: ConversationService;

  constructor() {
    this.guidelineService = new GuidelineService();
    this.promptService = new PromptService();
    this.conversationService = new ConversationService();
  }

  async processMessage(request: ChatRequest): Promise<{
    response: string;
    conversationId: string;
    appliedGuidelines: string[];
    context: any;
  }> {
    try {
      // Extract context from the user message
      const messageContext = this.promptService.extractContextFromMessage(request.message);
      
      // Merge with provided context
      const fullContext = {
        ...messageContext,
        ...request.context
      };

      // Get or create conversation
      let conversation;
      let messages: ChatMessage[] = [];

      if (request.conversation_id) {
        conversation = await this.conversationService.getConversation(request.conversation_id);
        if (conversation) {
          messages = conversation.messages;
        }
      }

      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: request.message,
        timestamp: new Date().toISOString()
      };
      messages.push(userMessage);

      // Determine conversation stage
      const conversationStage = this.conversationService.determineConversationStage(messages);
      fullContext.conversation_stage = conversationStage;

      // Get applicable guidelines based on context
      const applicableGuidelines = await this.guidelineService.getApplicableGuidelines(fullContext);
      
      // Generate AI response
      const aiResponse = await this.promptService.generateResponse(
        messages,
        applicableGuidelines,
        fullContext
      );

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      messages.push(assistantMessage);

      // Save or update conversation
      const appliedGuidelineIds = applicableGuidelines.map(g => g.id!);
      
      if (conversation) {
        conversation = await this.conversationService.addMessageToConversation(
          conversation.id!,
          assistantMessage,
          appliedGuidelineIds
        );
      } else {
        conversation = await this.conversationService.createConversation(
          messages,
          {
            ...fullContext,
            applied_guidelines: appliedGuidelineIds
          }
        );
      }

      return {
        response: aiResponse,
        conversationId: conversation.id!,
        appliedGuidelines: applicableGuidelines.map(g => g.name),
        context: fullContext
      };

    } catch (error) {
      console.error('Error processing message:', error);
      throw new Error('Failed to process message');
    }
  }

  async getConversationHistory(conversationId: string) {
    return this.conversationService.getConversation(conversationId);
  }
}
