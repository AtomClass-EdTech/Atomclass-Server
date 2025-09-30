import { Router } from 'express';
import { videoStreamController } from '../controllers/cloudFlareStreamController.js';
import { loginRequired } from '../middleware/authMiddleware.js';

const router = Router();

// Check if user has access to course videos
router.get(
  '/:courseId/access',
  [loginRequired],
  videoStreamController.checkVideoAccess
);

// Get signed token for a specific video lesson
router.get(
  '/:courseId/videos/:lessonId/token',
  [loginRequired],
  videoStreamController.getVideoToken
);

// Get tokens for all videos in a course (useful for prefetching)
router.get(
  '/:courseId/video-tokens',
  [loginRequired],
  videoStreamController.getAllVideoTokens
);

// Track video watch progress
router.post(
  '/:courseId/videos/:lessonId/progress',
  [loginRequired],
  videoStreamController.trackVideoProgress
);

// Upload large video to CloudFlare Stream with signed URLs
router.post(
  '/upload-large-video',
  [loginRequired],
  videoStreamController.uploadLargeVideo
);

// Upload large video using TUS protocol with CloudFlare API format response
router.post(
  '/upload-tus',
  [loginRequired],
  videoStreamController.uploadViaTus
);

export {router as cloudFlareRouter}

/**
 * Usage in main app:
 *
 * import { cloudFlareRouter } from './routes/cloudFlareRoutes.js';
 * app.use('/api/cloudflare', cloudFlareRouter);
 *
 * This will create the following endpoints:
 * - GET  /api/cloudflare/:courseId/access
 * - GET  /api/cloudflare/:courseId/videos/:lessonId/token
 * - GET  /api/cloudflare/:courseId/video-tokens
 * - POST /api/cloudflare/:courseId/videos/:lessonId/progress
 * - POST /api/cloudflare/upload-large-video
 * - POST /api/cloudflare/upload-tus
 *
 * Upload Large Video Request Body:
 * {
 *   "courseId": "string (required)",
 *   "courseTitle": "string (required)",
 *   "chapterId": "string (required)",
 *   "chapterTitle": "string (required)",
 *   "chapterIndex": "number (optional)",
 *   "lessonId": "string (required)",
 *   "lessonTitle": "string (required)",
 *   "lessonIndex": "number (optional)",
 *   "videoFilePath": "string (required) - absolute path to video file",
 *   "videoLength": "number (optional) - duration in seconds",
 *   "description": "string (optional)",
 *   "links": "array (optional) - [{title: string, url: string}]"
 * }
 *
 * Upload TUS Request Body:
 * {
 *   "videoFilePath": "string (required) - absolute path to video file",
 *   "videoName": "string (optional) - display name for video",
 *   "metadata": {
 *     "courseId": "string (optional)",
 *     "courseTitle": "string (optional)",
 *     "chapterId": "string (optional)",
 *     "chapterTitle": "string (optional)",
 *     "chapterIndex": "number (optional)",
 *     "lessonId": "string (optional)",
 *     "lessonIndex": "number (optional)"
 *   }
 * }
 */