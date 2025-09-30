import { Enrollment, EnrollmentStatus } from '../entities/Enrollment.js';
import { Course } from '../entities/Course.js';
import { AppDataSource } from '../config/databaseConfig.js';
import * as crypto from 'crypto';
import { loadEnv } from '../config/loadEnv.js';

interface SignedUrlOptions {
  videoUid: string;
  userId: string;
  courseId: string;
  expiresInHours?: number;
}

loadEnv()

const enrollmentRepository = AppDataSource.getRepository(Enrollment);
const courseRepository = AppDataSource.getRepository(Course);

export class CloudflareStreamTokenService {
  private keyId: string;
  private jwkKey: string;

  constructor() {
    // Load from environment variables
    this.keyId = process.env.CF_STREAM_KEY_ID!;
    this.jwkKey = process.env.CF_STREAM_JWK_KEY!; // base64 encoded JWK

    if (!this.keyId || !this.jwkKey) {
      throw new Error('Cloudflare Stream credentials not configured. Set CF_STREAM_KEY_ID and CF_STREAM_JWK_KEY');
    }
  }

  /**
   * Check if user has access to specific course video
   */
  async verifyAccess(userId: string, courseId: string): Promise<boolean> {
    try {
      const enrollment = await enrollmentRepository.findOne({
        where: {
          user: { id: userId },
          course: { id: courseId },
          status: EnrollmentStatus.ACTIVE 
        },
        relations: ['user', 'course']
      });

      console.log("enrollment------->", enrollment)

      if (!enrollment) {
        console.log(`Access denied: No enrollment found for user ${userId} in course ${courseId}`);
        return false;
      }
      
      if (enrollment.expiresAt && new Date() > enrollment.expiresAt) {
        console.log(`Access denied: Enrollment expired for user ${userId} in course ${courseId}`);
        return false;
      }

      console.log(`Access granted: User ${userId} has active enrollment in course ${courseId}`);
      return true;

    } catch (error) {
      console.error('Error verifying access:', error);
      return false;
    }
  }

  /**
   * Generate signed token for video access
   */
async generateSignedToken(options: SignedUrlOptions): Promise<string> {
  const { videoUid, userId, courseId, expiresInHours = 2 } = options;

  console.log('[generateSignedToken] Called with options:', {
    videoUid,
    userId,
    courseId,
    expiresInHours
  });

  // Verify user has purchased this course
  console.log('[generateSignedToken] Verifying course access...');
  const hasAccess = await this.verifyAccess(userId, courseId);
  console.log('[generateSignedToken] Access verification result:', hasAccess);

  if (!hasAccess) {
    console.warn('[generateSignedToken] User does not have access to course:', courseId);
    throw new Error('User does not have access to this course');
  }

  // Generate token that expires in specified hours
  const expiresIn = Math.floor(Date.now() / 1000) + (expiresInHours * 60 * 60);
  console.log('[generateSignedToken] Token expiration timestamp (exp):', expiresIn);

  const headers = {
    alg: 'RS256',
    kid: this.keyId
  };

  const payload = {
    sub: videoUid,
    kid: this.keyId,
    exp: expiresIn,
    // uid: userId // Optional: Add if needed for tracking
  };

  const unsignedToken = `${this.objectToBase64url(headers)}.${this.objectToBase64url(payload)}`;
  console.log('[generateSignedToken] Unsigned token (header.payload):', unsignedToken);

  // Decode base64 JWK
  console.log('[generateSignedToken] Decoding JWK key...');
  const jwk = JSON.parse(Buffer.from(this.jwkKey, 'base64').toString('utf-8'));
  console.log('[generateSignedToken] JWK decoded');

  // Create signature
  console.log('[generateSignedToken] Creating signature...');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);

  // Convert JWK to PEM format for signing
  console.log('[generateSignedToken] Converting JWK to PEM format');
  const privateKey = this.jwkToPrivateKey(jwk);

  console.log("privateKey----->", privateKey)

  const signature = sign.sign(privateKey);
  console.log('[generateSignedToken] Signature created');

  const signedToken = `${unsignedToken}.${this.arrayBufferToBase64Url(signature)}`;
  console.log(`[generateSignedToken] Signed token generated for video ${videoUid}, valid for ${expiresInHours} hours`);

  return signedToken;
}


  /**
   * Generate tokens for all videos in a course chapter
   */
  async generateCourseVideoTokens(
    userId: string, 
    courseId: string
  ): Promise<Map<string, string>> {
    const hasAccess = await this.verifyAccess(userId, courseId);
    if (!hasAccess) {
      throw new Error('User does not have access to this course');
    }

    const course = await courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    const tokenMap = new Map<string, string>();

    // Generate tokens for all course videos
    for (const lesson of course.courseData) {
      if (lesson.videoCfUid && lesson.videoStatus === 'READY') {
        try {
          const token = await this.generateSignedToken({
            videoUid: lesson.videoCfUid,
            userId,
            courseId,
            expiresInHours: 2 // Token expires in 2 hours
          });
          
          tokenMap.set(lesson.id, token);
        } catch (error) {
          console.error(`Failed to generate token for lesson ${lesson.id}:`, error);
        }
      }
    }

    return tokenMap;
  }

  /**
   * Update enrollment last accessed time
   */
  async updateLastAccessed(userId: string, courseId: string): Promise<void> {
    try {
      await enrollmentRepository.update(
        {
          user: { id: userId },
          course: { id: courseId }
        },
        {
          lastAccessedAt: new Date()
        }
      );
    } catch (error) {
      console.error('Error updating last accessed:', error);
    }
  }

  // Utility functions
  private arrayBufferToBase64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private objectToBase64url(payload: any): string {
    const json = JSON.stringify(payload);
    const buffer = Buffer.from(json, 'utf-8');
    return this.arrayBufferToBase64Url(buffer);
  }

  private jwkToPrivateKey(jwk: any): string {
    // Convert JWK to PEM format
    // This is a simplified version - in production, use a library like 'node-jose'
    
    
    // Create key object from JWK
    const keyObject = crypto.createPrivateKey({
      key: jwk,
      format: 'jwk'
    });
    
    // Export as PEM
    return keyObject.export({
      type: 'pkcs8',
      format: 'pem'
    }) as string;
  }
}

export default CloudflareStreamTokenService;