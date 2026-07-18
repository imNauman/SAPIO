import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate } from '../../middleware/authenticate';
import { chatLimiter, uploadLimiter } from '../../middleware/rateLimit';

/**
 * Chat routes — mounted at `/api/chat`.
 *
 * Why: Every endpoint requires a valid JWT (`authenticate`). Messaging is gated
 * on an active match inside the service; the routes only expose the surface:
 * list conversations, open one, send a message, and edit/delete a message.
 * The chat-experience upgrade adds typing signals, read receipts, paginated
 * history, and image uploads — all still polling-friendly (realtime is a future
 * milestone). Reactions and E2E encryption remain out of scope.
 */
export const chatRoutes: Router = Router();

chatRoutes.use(authenticate);

chatRoutes.get('/conversations', chatController.listConversations);
chatRoutes.get('/by-match/:matchId', chatController.getOrCreateByMatch);
// Chat-experience upgrade endpoints (declared BEFORE /:conversationId so the
// literal paths are not swallowed by the param route).
chatRoutes.post('/typing', chatLimiter, chatController.setTyping);
chatRoutes.patch('/messages/read', chatLimiter, chatController.markRead);
chatRoutes.get('/messages', chatLimiter, chatController.getHistory);
chatRoutes.post(
  '/messages/image',
  uploadLimiter,
  chatController.uploadImage,
);
chatRoutes.get('/:conversationId', chatLimiter, chatController.getConversation);
chatRoutes.post('/send', chatLimiter, chatController.sendMessage);
chatRoutes.patch('/message/:id', chatController.editMessage);
chatRoutes.delete('/message/:id', chatController.deleteMessage);
