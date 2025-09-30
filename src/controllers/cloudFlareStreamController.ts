import { Response } from 'express';
import { AppDataSource } from '../config/databaseConfig.js';
import { Course, ICourseData } from '../entities/Course.js';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment.js';
import CloudflareStreamTokenService from '../services/cloudFlareStreamTokenService.js';
import { AuthRequest } from '../types/auth.req.types.js';
import { loadEnv } from '../config/loadEnv.js';

const courseRepository = AppDataSource.getRepository(Course);
const enrollmentRepository = AppDataSource.getRepository(Enrollment);

loadEnv()

export const videoStreamController = {
  /**
   * Get signed token for a specific video lesson
   * Route: GET /api/courses/:courseId/videos/:lessonId/token
   */
getVideoToken: async (req: AuthRequest, res: Response) => {
  try {
    console.log('[getVideoToken] Incoming request', {
      params: req.params,
      user: req.user
    });

    const { courseId, lessonId } = req.params;
    const userId = req.user?.id;

    console.log("userId----->", userId)

    if (!userId) {
      console.warn('[getVideoToken] No user ID found in request.');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('[getVideoToken] Fetching course with ID:', courseId);
    const course = await courseRepository.findOne({ 
      where: { id: courseId } 
    });

    if (!course) {
      console.warn('[getVideoToken] Course not found:', courseId);
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    console.log('[getVideoToken] Course found. Looking for lesson ID:', lessonId);
    const lesson = course.courseData.find(l => l.id === lessonId);

    if (!lesson) {
      console.warn('[getVideoToken] Lesson not found in course:', lessonId);
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    console.log('[getVideoToken] Lesson found:', {
      lessonId: lesson.id,
      videoCfUid: lesson.videoCfUid,
      videoStatus: lesson.videoStatus
    });

    if (!lesson.videoCfUid) {
      console.warn('[getVideoToken] No video UID for lesson:', lessonId);
      return res.status(404).json({
        success: false,
        message: 'Video not available for this lesson'
      });
    }

    if (lesson.videoStatus !== 'READY') {
      console.warn('[getVideoToken] Video is not ready. Status:', lesson.videoStatus);
      return res.status(400).json({
        success: false,
        message: `Video is ${lesson.videoStatus.toLowerCase()}. Please try again later.`
      });
    }

    console.log('[getVideoToken] Initializing CloudflareStreamTokenService');
    const streamService = new CloudflareStreamTokenService();
    
    console.log('[getVideoToken] Generating signed token for video UID:', lesson.videoCfUid);
    const token = await streamService.generateSignedToken({
      videoUid: lesson.videoCfUid,
      userId,
      courseId,
      expiresInHours: 2
    });

    console.log('[getVideoToken] Token generated:', token);

    console.log('[getVideoToken] Updating last accessed timestamp');
    await streamService.updateLastAccessed(userId, courseId);

    const customerCode = process.env.CF_CUSTOMER_CODE;
    console.log('[getVideoToken] Using customer code:', customerCode);

    const streamUrlBase = `https://customer-${customerCode}.cloudflarestream.com/${token}`;
    console.log('[getVideoToken] Responding with stream URLs');

    res.json({
      success: true,
      data: {
        token,
        expiresIn: 7200, // 2 hours in seconds
        videoUid: lesson.videoCfUid,
        streamUrl: `${streamUrlBase}/iframe`,
        hlsUrl: `${streamUrlBase}/manifest/video.m3u8`,
        dashUrl: `${streamUrlBase}/manifest/video.mpd`,
        thumbnailUrl: lesson.videoThumbnail
      }
    });

  } catch (error: any) {
    console.error('[getVideoToken] Error generating video token:', error);

    if (error.message === 'User does not have access to this course') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course. Please purchase it first.',
        needsPurchase: true
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate video token',
      error: error.message
    });
  }
},


  /**
   * Get tokens for all videos in a course
   * Route: GET /api/courses/:courseId/video-tokens
   */
  getAllVideoTokens: async (req: AuthRequest, res: Response) => {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const streamService = new CloudflareStreamTokenService();
      const tokenMap = await streamService.generateCourseVideoTokens(userId, courseId);

      const customerCode = process.env.CF_CUSTOMER_CODE;
      
      // Convert map to object with full URLs
      const tokens: Record<string, any> = {};
      
      tokenMap.forEach((token, lessonId) => {
        tokens[lessonId] = {
          token,
          streamUrl: `https://customer-${customerCode}.cloudflarestream.com/${token}/iframe`,
          hlsUrl: `https://customer-${customerCode}.cloudflarestream.com/${token}/manifest/video.m3u8`
        };
      });

      res.json({
        success: true,
        data: {
          tokens,
          expiresIn: 7200,
          totalVideos: tokenMap.size
        }
      });

    } catch (error: any) {
      console.error('Error generating video tokens:', error);
      
      if (error.message === 'User does not have access to this course') {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this course. Please purchase it first.',
          needsPurchase: true
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate video tokens',
        error: error.message
      });
    }
  },

  /**
   * Check if user has access to course videos
   * Route: GET /api/courses/:courseId/access
   */
  checkVideoAccess: async (req: AuthRequest, res: Response) => {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const streamService = new CloudflareStreamTokenService();
      const hasAccess = await streamService.verifyAccess(userId, courseId);

      if (!hasAccess) {
        return res.json({
          success: true,
          data: {
            hasAccess: false,
            message: 'You need to purchase this course to access videos',
            needsPurchase: true
          }
        });
      }

      // Get enrollment details
      const enrollment = await enrollmentRepository.findOne({
        where: {
          user: { id: userId },
          course: { id: courseId }
        },
        relations: ['course']
      });

      res.json({
        success: true,
        data: {
          hasAccess: true,
          enrollment: {
            enrolledAt: enrollment?.enrolledAt,
            expiresAt: enrollment?.expiresAt,
            progress: enrollment?.progress,
            completedLessons: enrollment?.completedLessons,
            totalLessons: enrollment?.totalLessons
          }
        }
      });

    } catch (error: any) {
      console.error('Error checking video access:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check video access',
        error: error.message
      });
    }
  },

  /**
   * Track video watch progress
   * Route: POST /api/courses/:courseId/videos/:lessonId/progress
   */
  trackVideoProgress: async (req: AuthRequest, res: Response) => {
    try {
      const { courseId, lessonId } = req.params;
      const { watchTimeSec, lastPositionSec, progress } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const enrollment = await enrollmentRepository.findOne({
        where: {
          user: { id: userId },
          course: { id: courseId }
        }
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this course'
        });
      }

      // Find or create lesson progress
      let lessonProgress = enrollment.lessonProgress.find(
        lp => lp.courseDataId === lessonId
      );

      if (!lessonProgress) {
        lessonProgress = {
          courseDataId: lessonId,
          status: 'IN_PROGRESS',
          progress: 0,
          watchTimeSec: 0,
          lastPositionSec: 0,
          isCompleted: false,
          startedAt: new Date(),
          viewCount: 0,
          lastWatchedAt: new Date()
        };
        enrollment.lessonProgress.push(lessonProgress);
      }

      // Update progress
      lessonProgress.watchTimeSec += watchTimeSec || 0;
      lessonProgress.lastPositionSec = lastPositionSec || 0;
      lessonProgress.progress = progress || lessonProgress.progress;
      lessonProgress.lastWatchedAt = new Date();
      lessonProgress.viewCount += 1;

      // Mark as completed if progress >= 90%
      if (progress >= 90 && !lessonProgress.isCompleted) {
        lessonProgress.isCompleted = true;
        lessonProgress.completedAt = new Date();
        lessonProgress.status = 'COMPLETED';
        enrollment.completedLessons += 1;
      }

      // Update overall course progress
      const totalLessons = enrollment.totalLessons || 1;
      enrollment.progress = Number(
        ((enrollment.completedLessons / totalLessons) * 100).toFixed(2)
      );
      enrollment.totalWatchTimeSec += watchTimeSec || 0;

      // Check if course is completed
      if (enrollment.completedLessons >= totalLessons && !enrollment.completedAt) {
        enrollment.completedAt = new Date();
        enrollment.status = EnrollmentStatus.COMPLETED;
      }

      await enrollmentRepository.save(enrollment);

      res.json({
        success: true,
        message: 'Progress updated successfully',
        data: {
          lessonProgress: lessonProgress,
          overallProgress: enrollment.progress,
          completedLessons: enrollment.completedLessons,
          totalLessons: enrollment.totalLessons
        }
      });

    } catch (error: any) {
      console.error('Error tracking video progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track video progress',
        error: error.message
      });
    }
  },

  /**
   * Upload a large video to CloudFlare Stream
   * Route: POST /api/cloudflare/upload-large-video
   */
  uploadLargeVideo: async (req: AuthRequest, res: Response) => {
    try {
      console.log('[uploadLargeVideo] Starting large video upload');

      const {
        courseId,
        courseTitle,
        chapterId,
        chapterTitle,
        chapterIndex,
        lessonId,
        lessonTitle,
        lessonIndex,
        videoFilePath,
        videoLength,
        description,
        links
      } = req.body;

      // Validate required fields
      if (!courseId || !courseTitle || !chapterId || !chapterTitle ||
          !lessonId || !lessonTitle || !videoFilePath) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: courseId, courseTitle, chapterId, chapterTitle, lessonId, lessonTitle, videoFilePath'
        });
      }

      console.log('[uploadLargeVideo] Fetching course:', courseId);
      const course = await courseRepository.findOne({
        where: { id: courseId }
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Initialize CloudFlare uploader
      const accountId = process.env.CF_ACCOUNT_ID!;
      const apiToken = process.env.CF_API_TOKEN!;

      if (!accountId || !apiToken) {
        return res.status(500).json({
          success: false,
          message: 'CloudFlare credentials not configured'
        });
      }

      const { default: CloudflareStreamUploader } = await import('../utils/cloudflare-stream-uploader.js');
      const uploader = new CloudflareStreamUploader(accountId, apiToken);

      console.log('[uploadLargeVideo] Starting upload to CloudFlare Stream');

      // Upload video with requireSignedURLs set to true
      const uploadResult = await uploader.uploadVideoWithFolders({
        courseId,
        courseTitle,
        chapterId,
        chapterTitle,
        chapterIndex: chapterIndex || 0,
        lessonId,
        lessonTitle,
        lessonIndex: lessonIndex || 0,
        videoFilePath,
        requireSignedURLs: true // Always true for security
      });

      console.log('[uploadLargeVideo] Upload successful. Video UID:', uploadResult.uid);

      // Update course data with new video
      const newCourseData: ICourseData = {
        id: lessonId,
        title: lessonTitle,
        index: course.courseData.length,
        videoSection: chapterTitle,
        sectionIndex: chapterIndex || 0,
        description: description || '',
        videoLength: videoLength || 0,
        videoCfUid: uploadResult.uid,
        videoCfPlaybackId: undefined,
        videoHlsUrl: uploadResult.playback?.hls || undefined,
        videoStatus: uploadResult.status?.state === 'ready' ? 'READY' :
                     uploadResult.status?.state === 'error' ? 'FAILED' : 'UPLOADING',
        videoMeta: uploadResult.meta || null,
        videoThumbnail: uploadResult.thumbnail
          ? { url: `https://customer-${process.env.CF_CUSTOMER_CODE}.cloudflarestream.com/${uploadResult.uid}/thumbnails/thumbnail.jpg` }
          : null,
        links: links || [],
        questions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to course
      course.courseData.push(newCourseData);
      await courseRepository.save(course);

      console.log('[uploadLargeVideo] Course data updated successfully');

      res.json({
        success: true,
        message: 'Large video uploaded successfully',
        data: {
          videoUid: uploadResult.uid,
          lessonId: lessonId,
          status: uploadResult.status?.state,
          requireSignedURLs: uploadResult.requireSignedURLs,
          thumbnail: uploadResult.thumbnail,
          duration: uploadResult.duration,
          playback: {
            hls: uploadResult.playback?.hls,
            dash: uploadResult.playback?.dash
          },
          meta: uploadResult.meta
        }
      });

    } catch (error: any) {
      console.error('[uploadLargeVideo] Error uploading video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload large video',
        error: error.message
      });
    }
  },

  /**
   * Upload large video using TUS API directly to CloudFlare Stream
   * Route: POST /api/cloudflare/upload-tus
   */
  uploadViaTus: async (req: AuthRequest, res: Response) => {
    try {
      console.log('[uploadViaTus] Starting TUS upload to CloudFlare');

      const {
        videoFilePath,
        videoName,
        metadata
      } = req.body;

      // Validate required fields
      if (!videoFilePath) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: videoFilePath',
          errors: ['videoFilePath is required'],
          messages: []
        });
      }

      // Initialize CloudFlare uploader
      const accountId = process.env.CF_ACCOUNT_ID!;
      const apiToken = process.env.CF_API_TOKEN!;

      if (!accountId || !apiToken) {
        return res.status(500).json({
          success: false,
          message: 'CloudFlare credentials not configured',
          errors: ['CF_ACCOUNT_ID and CF_API_TOKEN must be set'],
          messages: []
        });
      }

      const { default: CloudflareStreamUploader } = await import('../utils/cloudflare-stream-uploader.js');
      const uploader = new CloudflareStreamUploader(accountId, apiToken);

      console.log('[uploadViaTus] Uploading video:', videoFilePath);

      // Check file size to determine upload method
      const fs = await import('fs');
      const stats = fs.statSync(videoFilePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      console.log(`[uploadViaTus] File size: ${fileSizeMB.toFixed(2)} MB`);

      let uploadResult;

      // Always use TUS for large files (>200MB) or if explicitly requested
      if (stats.size > 200 * 1024 * 1024) {
        console.log('[uploadViaTus] Using TUS protocol for large file');

        // Use the private uploadLargeVideo method through uploadVideoWithFolders
        uploadResult = await uploader.uploadVideoWithFolders({
          courseId: metadata?.courseId || 'direct-upload',
          courseTitle: metadata?.courseTitle || 'Direct Upload',
          chapterId: metadata?.chapterId || 'chapter-1',
          chapterTitle: metadata?.chapterTitle || 'Chapter 1',
          chapterIndex: metadata?.chapterIndex || 0,
          lessonId: metadata?.lessonId || `lesson-${Date.now()}`,
          lessonTitle: videoName || 'Uploaded Video',
          lessonIndex: metadata?.lessonIndex || 0,
          videoFilePath,
          requireSignedURLs: true
        });
      } else {
        console.log('[uploadViaTus] Using standard upload for smaller file');

        // Use standard upload for smaller files
        uploadResult = await uploader.uploadVideoWithFolders({
          courseId: metadata?.courseId || 'direct-upload',
          courseTitle: metadata?.courseTitle || 'Direct Upload',
          chapterId: metadata?.chapterId || 'chapter-1',
          chapterTitle: metadata?.chapterTitle || 'Chapter 1',
          chapterIndex: metadata?.chapterIndex || 0,
          lessonId: metadata?.lessonId || `lesson-${Date.now()}`,
          lessonTitle: videoName || 'Uploaded Video',
          lessonIndex: metadata?.lessonIndex || 0,
          videoFilePath,
          requireSignedURLs: true
        });
      }

      console.log('[uploadViaTus] Upload successful. Video UID:', uploadResult.uid);

      // Return response in CloudFlare format
      res.json({
        result: {
          uid: uploadResult.uid,
          creator: uploadResult.creator || null,
          thumbnail: uploadResult.thumbnail || `https://customer-${process.env.CF_CUSTOMER_CODE}.cloudflarestream.com/${uploadResult.uid}/thumbnails/thumbnail.jpg`,
          thumbnailTimestampPct: uploadResult.thumbnailTimestampPct || 0,
          readyToStream: uploadResult.readyToStream,
          readyToStreamAt: uploadResult.status?.state === 'ready' ? uploadResult.modified : null,
          status: {
            state: uploadResult.status?.state || 'ready',
            pctComplete: uploadResult.status?.pctComplete || '100.000000',
            errorReasonCode: uploadResult.status?.errorReasonCode || '',
            errorReasonText: uploadResult.status?.errorReasonText || ''
          },
          meta: uploadResult.meta || { name: videoName || 'Uploaded Video' },
          created: uploadResult.created,
          modified: uploadResult.modified,
          scheduledDeletion: uploadResult.scheduledDeletion || null,
          size: uploadResult.size || stats.size,
          preview: uploadResult.preview || `https://customer-${process.env.CF_CUSTOMER_CODE}.cloudflarestream.com/${uploadResult.uid}/watch`,
          allowedOrigins: uploadResult.allowedOrigins || [],
          requireSignedURLs: uploadResult.requireSignedURLs,
          uploaded: uploadResult.uploaded,
          uploadExpiry: uploadResult.uploadExpiry || null,
          maxSizeBytes: uploadResult.maxSizeBytes || null,
          maxDurationSeconds: uploadResult.maxDurationSeconds || null,
          duration: uploadResult.duration || 0,
          input: uploadResult.input || {
            width: 0,
            height: 0
          },
          playback: {
            hls: uploadResult.playback?.hls || `https://customer-${process.env.CF_CUSTOMER_CODE}.cloudflarestream.com/${uploadResult.uid}/manifest/video.m3u8`,
            dash: uploadResult.playback?.dash || `https://customer-${process.env.CF_CUSTOMER_CODE}.cloudflarestream.com/${uploadResult.uid}/manifest/video.mpd`
          },
          watermark: uploadResult.watermark || null,
          clippedFrom: null,
          publicDetails: null
        },
        success: true,
        errors: [],
        messages: []
      });

    } catch (error: any) {
      console.error('[uploadViaTus] Error uploading video:', error);
      res.status(500).json({
        result: null,
        success: false,
        errors: [error.message || 'Failed to upload video via TUS'],
        messages: []
      });
    }
  }
};