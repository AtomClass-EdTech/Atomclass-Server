import { ICourseData, Course } from './../entities/Course.js';
import { Repository } from 'typeorm';
import CloudflareStreamUploader from './cloudflare-stream-uploader.js';
import { AppDataSource } from '../config/databaseConfig.js';

interface ChapterVideoData {
  sectionTitle: string;
  sectionIndex: number;
  lessons: Array<{
    title: string;
    description: string;
    videoFilePath: string;
    videoLength: number; 
    links?: Array<{ title: string; url: string }>;
  }>;
}

const courseRepository =  AppDataSource.getRepository(Course);
export class CourseVideoSyncService {
  constructor(
    private courseRepo: Repository<Course>,
    private cfUploader: CloudflareStreamUploader
  ) {}

  async uploadAndSyncCourseVideos(
    courseId: string,
    chaptersData: ChapterVideoData[]
  ): Promise<void> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    console.log(`\n🎓 Processing course: ${course.name}`);
    console.log(`📚 Chapters: ${chaptersData.length}\n`);

    const updatedCourseData: ICourseData[] = [];
    let globalLessonIndex = 0;

    for (let sectionIdx = 0; sectionIdx < chaptersData.length; sectionIdx++) {
      const chapter = chaptersData[sectionIdx];
      
      console.log(`\n📂 Chapter ${sectionIdx + 1}: ${chapter.sectionTitle}`);
      console.log(`   Lessons: ${chapter.lessons.length}`);

      for (let lessonIdx = 0; lessonIdx < chapter.lessons.length; lessonIdx++) {
        const lesson = chapter.lessons[lessonIdx];
        const lessonId = `lesson-${sectionIdx + 1}-${lessonIdx + 1}`;

        console.log(`   ⏳ Uploading: ${lesson.title}...`);

        try {
          // Upload video to Cloudflare Stream
          const uploadResult = await this.cfUploader.uploadVideoWithFolders({
            courseId: course.id,
            courseTitle: course.name,
            chapterId: `chapter-${sectionIdx + 1}`,
            chapterTitle: chapter.sectionTitle,
            chapterIndex: sectionIdx + 1,
            lessonId,
            lessonTitle: lesson.title,
            lessonIndex: lessonIdx + 1,
            videoFilePath: lesson.videoFilePath,
            requireSignedURLs: true
          });

          // Create course data entry
          const courseDataEntry: ICourseData = {
            id: lessonId,
            title: lesson.title,
            index: globalLessonIndex,
            videoSection: chapter.sectionTitle,
            sectionIndex: sectionIdx,
            description: lesson.description,
            videoLength: lesson.videoLength,
            
            // Cloudflare Stream data
            videoCfUid: uploadResult.uid,
            videoCfPlaybackId: uploadResult.playback?.id || null,
            videoHlsUrl: uploadResult.playback?.hls || null,
            videoStatus: this.mapVideoStatus(uploadResult.status?.state),
            videoMeta: uploadResult.meta || null,
            videoThumbnail: uploadResult.thumbnail 
              ? { url: `https://customer-${process.env.CF_CUSTOMER_CODE}.cloudflarestream.com/${uploadResult.uid}/thumbnails/thumbnail.jpg` }
              : null,
            
            // Additional data
            links: lesson.links || [],
            questions: [],
            
            createdAt: new Date(),
            updatedAt: new Date()
          };

          updatedCourseData.push(courseDataEntry);
          globalLessonIndex++;

          console.log(`   ✓ Uploaded: ${lesson.title}`);
          console.log(`     Video UID: ${uploadResult.uid}`);

          // Delay to avoid rate limiting
          await this.sleep(1000);

        } catch (error) {
          console.error(`   ✗ Failed: ${lesson.title}`, error);
          throw error;
        }
      }
    }

    // Update course in database
    course.courseData = updatedCourseData;
    await this.courseRepo.save(course);

    console.log(`\n✅ Course sync complete!`);
    console.log(`   Total videos uploaded: ${updatedCourseData.length}`);
    console.log(`   Course ID: ${course.id}`);
  }

  /**
   * Upload single video and add to existing course
   */
  async addVideoToChapter(
    courseId: string,
    chapterIndex: number,
    videoData: {
      title: string;
      description: string;
      videoFilePath: string;
      videoLength: number;
      links?: Array<{ title: string; url: string }>;
    }
  ): Promise<void> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Find chapter info
    const chapterLessons = course.courseData.filter(
      lesson => lesson.sectionIndex === chapterIndex
    );

    if (chapterLessons.length === 0) {
      throw new Error('Chapter not found');
    }

    const chapterTitle = chapterLessons[0].videoSection!;
    const nextLessonIndex = chapterLessons.length;
    const lessonId = `lesson-${chapterIndex + 1}-${nextLessonIndex + 1}`;

    // Upload to Cloudflare
    const uploadResult = await this.cfUploader.uploadVideoWithFolders({
      courseId: course.id,
      courseTitle: course.name,
      chapterId: `chapter-${chapterIndex + 1}`,
      chapterTitle,
      chapterIndex: chapterIndex + 1,
      lessonId,
      lessonTitle: videoData.title,
      lessonIndex: nextLessonIndex + 1,
      videoFilePath: videoData.videoFilePath,
      requireSignedURLs: true
    });

    // Create new lesson entry
    const newLesson: ICourseData = {
      id: lessonId,
      title: videoData.title,
      index: course.courseData.length,
      videoSection: chapterTitle,
      sectionIndex: chapterIndex,
      description: videoData.description,
      videoLength: videoData.videoLength,
      videoCfUid: uploadResult.uid,
      videoCfPlaybackId: uploadResult.playback?.id || null,
      videoHlsUrl: uploadResult.playback?.hls || null,
      videoStatus: this.mapVideoStatus(uploadResult.status?.state),
      videoMeta: uploadResult.meta || null,
      videoThumbnail: uploadResult.thumbnail 
        ? { url: `https://customer-${process.env.CF_CUSTOMER_CODE}.cloudflarestream.com/${uploadResult.uid}/thumbnails/thumbnail.jpg` }
        : null,
      links: videoData.links || [],
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to course
    course.courseData.push(newLesson);
    await this.courseRepo.save(course);

    console.log(`✓ Video added: ${videoData.title}`);
  }

  /**
   * Get course videos organized by chapters (for display)
   */
  async getCourseStructure(courseId: string) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Group by chapters
    const chapters = new Map<number, any>();

    course.courseData.forEach(lesson => {
      const sectionIdx = lesson.sectionIndex || 0;
      
      if (!chapters.has(sectionIdx)) {
        chapters.set(sectionIdx, {
          title: lesson.videoSection,
          index: sectionIdx,
          lessons: []
        });
      }

      chapters.get(sectionIdx)!.lessons.push({
        id: lesson.id,
        title: lesson.title,
        index: lesson.index,
        description: lesson.description,
        videoLength: lesson.videoLength,
        videoStatus: lesson.videoStatus,
        thumbnail: lesson.videoThumbnail,
        links: lesson.links
      });
    });

    return {
      courseId: course.id,
      courseName: course.name,
      totalChapters: chapters.size,
      totalLessons: course.courseData.length,
      chapters: Array.from(chapters.values()).sort((a, b) => a.index - b.index)
    };
  }

  // Helper methods
  private mapVideoStatus(cfStatus?: string): "UPLOADING" | "READY" | "FAILED" {
    switch (cfStatus) {
      case 'ready':
        return 'READY';
      case 'queued':
      case 'inprogress':
        return 'UPLOADING';
      case 'error':
        return 'FAILED';
      default:
        return 'UPLOADING';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// USAGE EXAMPLE
// ============================================

async function uploadNewCourse() {
  const courseId = 'existing-course-id'; // Get from your database

  const courseVideoService = new CourseVideoSyncService(
    courseRepository,
    new CloudflareStreamUploader(
      process.env.CF_ACCOUNT_ID!,
      process.env.CF_API_TOKEN!
    )
  );

  // Define your course structure with local video files
  const chaptersData: ChapterVideoData[] = [
    {
      sectionTitle: 'Python Basics',
      sectionIndex: 0,
      lessons: [
        {
          title: 'Introduction to Python',
          description: 'Learn what Python is and why it\'s popular',
          videoFilePath: './videos/chapter1/01-intro.mp4',
          videoLength: 480, // 8 minutes in seconds
          links: [
            { title: 'Python Official Site', url: 'https://python.org' }
          ]
        },
        {
          title: 'Installing Python',
          description: 'How to install Python on your system',
          videoFilePath: './videos/chapter1/02-install.mp4',
          videoLength: 600
        }
      ]
    },
    {
      sectionTitle: 'Variables and Data Types',
      sectionIndex: 1,
      lessons: [
        {
          title: 'Understanding Variables',
          description: 'What are variables and how to use them',
          videoFilePath: './videos/chapter2/01-variables.mp4',
          videoLength: 720
        },
        {
          title: 'String Data Type',
          description: 'Working with strings in Python',
          videoFilePath: './videos/chapter2/02-strings.mp4',
          videoLength: 900
        },
        {
          title: 'Numeric Data Types',
          description: 'Integers, floats, and complex numbers',
          videoFilePath: './videos/chapter2/03-numbers.mp4',
          videoLength: 840
        },
        {
          title: 'Boolean Data Type',
          description: 'True, False, and logical operations',
          videoFilePath: './videos/chapter2/04-boolean.mp4',
          videoLength: 540
        }
      ]
    }
    // Add remaining 18 chapters...
  ];

  try {
    // Upload all videos and sync with database
    await courseVideoService.uploadAndSyncCourseVideos(courseId, chaptersData);

    // Get organized course structure
    const structure = await courseVideoService.getCourseStructure(courseId);
    console.log('\n📊 Course Structure:');
    console.log(JSON.stringify(structure, null, 2));

  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// Example: Add a single video to existing chapter
async function addExtraLesson() {
  const courseVideoService = new CourseVideoSyncService(
    courseRepository,
    new CloudflareStreamUploader(
      process.env.CF_ACCOUNT_ID!,
      process.env.CF_API_TOKEN!
    )
  );

  await courseVideoService.addVideoToChapter(
    'course-python-101',
    1, // Chapter index
    {
      title: 'Bonus: Type Conversion',
      description: 'Converting between different data types',
      videoFilePath: './videos/chapter2/bonus-conversion.mp4',
      videoLength: 420
    }
  );
}

export default CourseVideoSyncService;