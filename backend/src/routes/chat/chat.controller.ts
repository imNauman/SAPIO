import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { chatService } from './chat.service';
import { sendSuccess } from '../../utils/response';
import { validateBody, validateQuery } from '../../utils/validate';
import {
  sendMessageSchema,
  editMessageSchema,
  typingSchema,
  markReadSchema,
  messageHistorySchema,
} from './chat.types';
import { uploadChatImageMiddleware } from './chat-image.upload';

/**
 * Chat controller.
 *
 * Why: Thin HTTP ↔ service mapping. Every handler reads the authenticated user
 * from `req.user` and delegates to `chatService`. Handlers are wrapped in
 * `asyncHandler` so domain `AppError`s (404 match, 403 not a participant, 400
 * invalid body) reach the central error handler. The service enforces the
 * match-gating rule; the controller never touches the database directly.
 */
export const chatController = {
  /** GET /chat/conversations — list the caller's conversations. */
  listConversations: asyncHandler(async (req: Request, res: Response) => {
    const conversations = await chatService.listConversations(req.user!.id);
    sendSuccess(res, { conversations });
  }),

  /** GET /chat/:conversationId — a single conversation + its messages. */
  getConversation: asyncHandler(async (req: Request, res: Response) => {
    const { conversation, messages } = await chatService.getConversation(
      req.user!.id,
      req.params.conversationId,
    );
    sendSuccess(res, { conversation, messages });
  }),

  /**
   * GET /chat/by-match/:matchId — get-or-create the conversation for a match,
   * then return it with messages. Lets the client open a chat from a match id.
   */
  getOrCreateByMatch: asyncHandler(async (req: Request, res: Response) => {
    const { conversation, messages } = await chatService.getOrCreateByMatch(
      req.user!.id,
      req.params.matchId,
    );
    sendSuccess(res, { conversation, messages });
  }),

  /** POST /chat/send — send a message (creates the conversation if needed). */
  sendMessage: [
    validateBody(sendMessageSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const message = await chatService.sendMessage(req.user!.id, req.body);
      sendSuccess(res, { message }, 201);
    }),
  ],

  /** PATCH /chat/message/:id — edit a message the caller sent. */
  editMessage: [
    validateBody(editMessageSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const message = await chatService.editMessage(
        req.user!.id,
        req.params.id,
        req.body,
      );
      sendSuccess(res, { message });
    }),
  ],

  /** DELETE /chat/message/:id — soft-delete a message the caller sent. */
  deleteMessage: asyncHandler(async (req: Request, res: Response) => {
    await chatService.deleteMessage(req.user!.id, req.params.id);
    sendSuccess(res, { deleted: true });
  }),

  /**
   * POST /chat/typing — record a typing signal (start/stop). Emits a realtime
   * event; does not persist. Validated by `typingSchema`.
   */
  setTyping: [
    validateBody(typingSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await chatService.setTyping(req.user!.id, req.body);
      sendSuccess(res, { ok: true });
    }),
  ],

  /**
   * PATCH /chat/messages/read — mark a conversation's messages read for the
   * caller and reset its unread counter. Called when the conversation opens.
   */
  markRead: [
    validateBody(markReadSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await chatService.markRead(
        req.user!.id,
        req.body.conversationId,
      );
      sendSuccess(res, result);
    }),
  ],

  /**
   * GET /chat/messages — paginated history for a conversation. `before` is an
   * optional message id cursor; `limit` defaults to 30. Returns oldest-first
   * with a `hasMore` flag for lazy loading.
   */
  getHistory: [
    validateQuery(messageHistorySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { conversationId, before, limit } = req.query as unknown as {
        conversationId: string;
        before?: string;
        limit: number;
      };
      const result = await chatService.getHistory(
        req.user!.id,
        conversationId,
        before,
        limit,
      );
      sendSuccess(res, result);
    }),
  ],

  /**
   * POST /chat/messages/image — multipart upload of a chat image. Returns the
   * public image + thumbnail URLs. The client then sends a message with the URL.
   */
  uploadImage: [
    uploadChatImageMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const file = req.file;
      if (!file) {
        return sendSuccess(res, { error: 'No image provided' }, 400);
      }
      const result = await chatService.uploadImage(req.user!.id, {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
      });
      sendSuccess(res, result, 201);
    }),
  ],
};
