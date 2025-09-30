import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

interface VideoUploadOptions {
  courseId: string;
  courseTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterIndex: number;
  lessonId: string;
  lessonTitle: string;
  lessonIndex: number;
  videoFilePath: string;
  requireSignedURLs?: boolean;
}

interface CloudflareStreamVideo {
  uid: string;
  creator?: string | null;
  thumbnail?: string;
  thumbnailTimestampPct?: number;
  readyToStream: boolean;
  readyToStreamAt?: string;
  status: {
    state: string;
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta: Record<string, any>;
  created: string;
  modified: string;
  scheduledDeletion?: string | null;
  size?: number;
  preview?: string;
  allowedOrigins?: string[];
  requireSignedURLs: boolean;
  uploaded: string;
  uploadExpiry?: string;
  maxSizeBytes?: number;
  maxDurationSeconds?: number;
  duration?: number;
  input?: {
    width?: number;
    height?: number;
  };
  playback?: {
    hls?: string;
    dash?: string;
  };
  watermark?: {
    uid: string;
  };
}

interface CloudflareApiResponse {
  result: CloudflareStreamVideo;
  success: boolean;
  errors: any[];
  messages: any[];
}

export class CloudflareStreamUploader {
  private accountId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(accountId: string, apiToken: string) {
    this.accountId = accountId;
    this.apiToken = apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
  }

  /**
   * Upload video with virtual folder structure using metadata
   */
  async uploadVideoWithFolders(options: VideoUploadOptions): Promise<CloudflareStreamVideo> {
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
      requireSignedURLs = true
    } = options;

    // Validate file exists
    if (!fs.existsSync(videoFilePath)) {
      throw new Error(`Video file not found: ${videoFilePath}`);
    }

    // Get file stats
    const stats = fs.statSync(videoFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📤 Uploading: ${lessonTitle}`);
    console.log(`   File: ${path.basename(videoFilePath)}`);
    console.log(`   Size: ${fileSizeMB} MB`);

    // Create virtual folder path
    const folderPath = `${courseTitle}/Chapter-${chapterIndex}-${chapterTitle}`;
    
    // Prepare metadata for organizing videos
    const metadata = {
      // Main name field (searchable in dashboard)
      name: `${folderPath}/${lessonTitle}`,
      
      // Course metadata
      courseId,
      courseTitle,
      courseTitleSlug: this.slugify(courseTitle),
      
      // Chapter metadata
      chapterId,
      chapterTitle,
      chapterIndex: chapterIndex.toString(),
      chapterSlug: this.slugify(chapterTitle),
      
      // Lesson metadata
      lessonId,
      lessonTitle,
      lessonIndex: lessonIndex.toString(),
      lessonSlug: this.slugify(lessonTitle),
      
      // Virtual folder path for filtering
      folderPath,
      
      // Additional metadata
      uploadedAt: new Date().toISOString(),
      category: 'course-content',
      fileName: path.basename(videoFilePath),
      fileSize: stats.size.toString()
    };

    try {
      // Check file size and use appropriate upload method
      if (stats.size > 200 * 1024 * 1024) { // > 200MB
        return await this.uploadLargeVideo(videoFilePath, metadata, requireSignedURLs);
      } else {
        return await this.uploadSmallVideo(videoFilePath, metadata, requireSignedURLs);
      }

    } catch (error: any) {
      console.error(`❌ Upload failed: ${lessonTitle}`);
      console.error(`   Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload video smaller than 200MB using basic upload
   */
  private async uploadSmallVideo(
    videoFilePath: string,
    metadata: Record<string, any>,
    requireSignedURLs: boolean
  ): Promise<CloudflareStreamVideo> {
    const formData = new FormData();
    
    // Add video file
    formData.append('file', fs.createReadStream(videoFilePath));
    
    // Add metadata as JSON string
    formData.append('meta', JSON.stringify(metadata));
    
    // Add security settings
    formData.append('requireSignedURLs', requireSignedURLs.toString());

    const response = await axios.post<CloudflareApiResponse>(
      this.baseUrl,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    if (!response.data.success) {
      throw new Error(`Upload failed: ${JSON.stringify(response.data.errors)}`);
    }

    console.log(`   ✅ Upload complete!`);
    console.log(`   Video UID: ${response.data.result.uid}`);
    console.log(`   Status: ${response.data.result.status.state}`);

    return response.data.result;
  }

  /**
   * Upload video larger than 200MB using tus resumable upload
   */
  private async uploadLargeVideo(
    videoFilePath: string,
    metadata: Record<string, any>,
    requireSignedURLs: boolean
  ): Promise<CloudflareStreamVideo> {
    console.log(`   📦 Large file detected, using TUS upload...`);

    const stats = fs.statSync(videoFilePath);
    
    // Step 1: Create upload session
    const createResponse = await axios.post<CloudflareApiResponse>(
      this.baseUrl,
      {
        maxDurationSeconds: 21600, // 6 hours max
        meta: metadata,
        requireSignedURLs
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!createResponse.data.success) {
      throw new Error(`Failed to create upload session: ${JSON.stringify(createResponse.data.errors)}`);
    }

    const videoUid = createResponse.data.result.uid;
    const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${videoUid}`;

    console.log(`   Video UID: ${videoUid}`);
    console.log(`   Uploading via TUS protocol...`);

    // Step 2: Upload file using TUS
    const fileStream = fs.createReadStream(videoFilePath);
    
    await axios.put(
      uploadUrl,
      fileStream,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/offset+octet-stream',
          'Content-Length': stats.size.toString(),
          'Tus-Resumable': '1.0.0',
          'Upload-Length': stats.size.toString(),
          'Upload-Offset': '0'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    console.log(`   ✅ Upload complete!`);
    console.log(`   Processing video...`);

    // Step 3: Wait for video to be ready (poll status)
    return await this.waitForVideoReady(videoUid);
  }

  /**
   * Wait for video processing to complete
   */
  private async waitForVideoReady(
    videoUid: string,
    maxAttempts: number = 60,
    delayMs: number = 5000
  ): Promise<CloudflareStreamVideo> {
    for (let i = 0; i < maxAttempts; i++) {
      const video = await this.getVideoDetails(videoUid);
      
      if (video.status.state === 'ready') {
        console.log(`   ✅ Video ready!`);
        return video;
      } else if (video.status.state === 'error') {
        throw new Error(`Video processing failed: ${video.status.errorReasonText || 'Unknown error'}`);
      }
      
      if (i % 6 === 0) { // Log every 30 seconds
        console.log(`   ⏳ Processing... ${video.status.pctComplete || 0}% complete`);
      }
      
      await this.sleep(delayMs);
    }

    throw new Error('Video processing timeout');
  }

  /**
   * Get video details
   */
  async getVideoDetails(videoUid: string): Promise<CloudflareStreamVideo> {
    const response = await axios.get<CloudflareApiResponse>(
      `${this.baseUrl}/${videoUid}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      }
    );

    if (!response.data.success) {
      throw new Error(`Failed to get video details: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data.result;
  }

  /**
   * Upload multiple videos for a course
   */
  async uploadCourseVideos(
    courseId: string,
    courseTitle: string,
    chapters: Array<{
      chapterId: string;
      chapterTitle: string;
      chapterIndex: number;
      lessons: Array<{
        lessonId: string;
        lessonTitle: string;
        lessonIndex: number;
        videoFilePath: string;
      }>;
    }>
  ): Promise<Map<string, CloudflareStreamVideo>> {
    const uploadResults = new Map<string, CloudflareStreamVideo>();

    console.log(`\n📚 Starting upload for course: ${courseTitle}`);
    console.log(`📁 Total chapters: ${chapters.length}`);
    console.log(`🎥 Total videos: ${chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)}\n`);

    let completedCount = 0;
    const totalVideos = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

    for (const chapter of chapters) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📂 Chapter ${chapter.chapterIndex}: ${chapter.chapterTitle}`);
      console.log(`   Videos in chapter: ${chapter.lessons.length}`);
      console.log(`${'='.repeat(60)}\n`);

      for (const lesson of chapter.lessons) {
        try {
          const result = await this.uploadVideoWithFolders({
            courseId,
            courseTitle,
            chapterId: chapter.chapterId,
            chapterTitle: chapter.chapterTitle,
            chapterIndex: chapter.chapterIndex,
            lessonId: lesson.lessonId,
            lessonTitle: lesson.lessonTitle,
            lessonIndex: lesson.lessonIndex,
            videoFilePath: lesson.videoFilePath,
            requireSignedURLs: true
          });

          uploadResults.set(lesson.lessonId, result);
          completedCount++;

          console.log(`   Progress: ${completedCount}/${totalVideos} videos uploaded\n`);

          // Add delay to avoid rate limiting
          await this.sleep(2000);

        } catch (error: any) {
          console.error(`   ❌ Failed to upload: ${lesson.lessonTitle}`);
          console.error(`   Error: ${error.message}\n`);
          // Continue with next video instead of throwing
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Upload Complete!`);
    console.log(`   Successfully uploaded: ${uploadResults.size}/${totalVideos} videos`);
    console.log(`   Failed: ${totalVideos - uploadResults.size} videos`);
    console.log(`${'='.repeat(60)}\n`);

    return uploadResults;
  }

  /**
   * Search/List videos by virtual folder path
   */
  async listVideosByFolder(folderPath: string): Promise<CloudflareStreamVideo[]> {
    try {
      const response = await axios.get<{ result: CloudflareStreamVideo[] }>(
        `${this.baseUrl}?search=${encodeURIComponent(folderPath)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      return response.data.result || [];

    } catch (error: any) {
      console.error('Error listing videos by folder:', error.message);
      return [];
    }
  }

  /**
   * List all videos for a specific course
   */
  async listCourseVideos(courseId: string): Promise<CloudflareStreamVideo[]> {
    try {
      // Fetch all videos (with pagination if needed)
      const allVideos = await this.getAllVideos();

      // Filter by courseId in metadata
      return allVideos.filter((video: CloudflareStreamVideo) => 
        video.meta?.courseId === courseId
      );

    } catch (error: any) {
      console.error('Error listing course videos:', error.message);
      return [];
    }
  }

  /**
   * Get all videos with pagination
   */
  async getAllVideos(limit: number = 1000): Promise<CloudflareStreamVideo[]> {
    const allVideos: CloudflareStreamVideo[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      try {
        const url = after 
          ? `${this.baseUrl}?limit=${limit}&after=${after}`
          : `${this.baseUrl}?limit=${limit}`;

        const response = await axios.get<{ result: CloudflareStreamVideo[] }>(url, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        });

        const videos = response.data.result || [];
        allVideos.push(...videos);

        // Check if there are more results
        hasMore = videos.length === limit;
        if (hasMore && videos.length > 0) {
          after = videos[videos.length - 1].uid;
        }

      } catch (error: any) {
        console.error('Error fetching videos:', error.message);
        hasMore = false;
      }
    }

    return allVideos;
  }

  /**
   * Update video metadata
   */
  async updateVideoMetadata(
    videoUid: string, 
    metadata: Record<string, any>
  ): Promise<CloudflareStreamVideo> {
    try {
      const response = await axios.post<CloudflareApiResponse>(
        `${this.baseUrl}/${videoUid}`,
        { meta: metadata },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.success) {
        throw new Error(`Failed to update metadata: ${JSON.stringify(response.data.errors)}`);
      }

      console.log(`✅ Updated metadata for video: ${videoUid}`);
      return response.data.result;

    } catch (error: any) {
      console.error('Error updating metadata:', error.message);
      throw error;
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoUid: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/${videoUid}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      console.log(`✅ Deleted video: ${videoUid}`);

    } catch (error: any) {
      console.error('Error deleting video:', error.message);
      throw error;
    }
  }

  /**
   * Enable/disable signed URLs for a video
   */
  async updateSignedUrlsRequirement(
    videoUid: string, 
    requireSignedURLs: boolean
  ): Promise<CloudflareStreamVideo> {
    try {
      const response = await axios.post<CloudflareApiResponse>(
        `${this.baseUrl}/${videoUid}`,
        { requireSignedURLs },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.success) {
        throw new Error(`Failed to update signed URLs requirement: ${JSON.stringify(response.data.errors)}`);
      }

      console.log(`✅ Updated signed URLs requirement for video: ${videoUid}`);
      return response.data.result;

    } catch (error: any) {
      console.error('Error updating signed URLs requirement:', error.message);
      throw error;
    }
  }

  /**
   * Get video statistics
   */
  async getCourseStatistics(courseId: string): Promise<{
    totalVideos: number;
    totalDuration: number;
    readyVideos: number;
    processingVideos: number;
    failedVideos: number;
    totalSize: number;
  }> {
    const videos = await this.listCourseVideos(courseId);

    const stats = {
      totalVideos: videos.length,
      totalDuration: 0,
      readyVideos: 0,
      processingVideos: 0,
      failedVideos: 0,
      totalSize: 0
    };

    videos.forEach(video => {
      if (video.duration) stats.totalDuration += video.duration;
      if (video.size) stats.totalSize += video.size;
      
      switch (video.status.state) {
        case 'ready':
          stats.readyVideos++;
          break;
        case 'queued':
        case 'inprogress':
          stats.processingVideos++;
          break;
        case 'error':
          stats.failedVideos++;
          break;
      }
    });

    return stats;
  }

  // Utility functions
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format bytes to human readable size
   */
  // private formatBytes(bytes: number): string {
  //   if (bytes === 0) return '0 Bytes';
  //   const k = 1024;
  //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  // }

  /**
   * Format seconds to human readable duration
   */
  // private formatDuration(seconds: number): string {
  //   const hours = Math.floor(seconds / 3600);
  //   const minutes = Math.floor((seconds % 3600) / 60);
  //   const secs = Math.floor(seconds % 60);

  //   if (hours > 0) {
  //     return `${hours}h ${minutes}m ${secs}s`;
  //   } else if (minutes > 0) {
  //     return `${minutes}m ${secs}s`;
  //   } else {
  //     return `${secs}s`;
  //   }
  // }
}

export default CloudflareStreamUploader;