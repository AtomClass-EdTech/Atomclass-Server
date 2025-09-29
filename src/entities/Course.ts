import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./User.js";
import { Course } from "./Course.js";
import { CourseData } from "./Course.js";

export enum EnrollmentStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
  DROPPED = "DROPPED",
}

export enum LessonCompletionStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

// ============ COURSE ENROLLMENT ============

@Entity({ name: "course_enrollments" })
@Unique(["user", "course"])
@Index(["user", "status"])
@Index(["course", "status"])
export class CourseEnrollment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @Column({
    type: "varchar",
    length: 20,
    default: EnrollmentStatus.ACTIVE,
  })
  status!: EnrollmentStatus;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  progress!: number; // 0-100

  @Column({ type: "integer", name: "completed_lessons", default: 0 })
  completedLessons!: number;

  @Column({ type: "integer", name: "total_lessons", default: 0 })
  totalLessons!: number;

  @Column({ type: "integer", name: "total_watch_time_sec", default: 0 })
  totalWatchTimeSec!: number;

  @Column({ type: "timestamp", name: "last_accessed_at", nullable: true })
  lastAccessedAt!: Date | null;

  @Column({ type: "timestamp", name: "completed_at", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "timestamp", name: "enrolled_at" })
  enrolledAt!: Date;

  @Column({ type: "timestamp", name: "expires_at", nullable: true })
  expiresAt!: Date | null;

  @Column({ type: "decimal", precision: 3, scale: 2, nullable: true })
  rating!: number | null; // User's rating after completion

  @Column({ type: "text", nullable: true })
  review!: string | null; // User's review after completion

  @Column({ type: "jsonb", nullable: true })
  certificate!: {
    issued: boolean;
    issuedAt?: Date;
    certificateId?: string;
    certificateUrl?: string;
  } | null;

  @OneToMany(() => LessonProgress, (progress) => progress.enrollment, { cascade: true })
  lessonProgress!: LessonProgress[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

// ============ LESSON PROGRESS ============

@Entity({ name: "lesson_progress" })
@Unique(["enrollment", "courseData"])
@Index(["enrollment", "status"])
export class LessonProgress {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => CourseEnrollment, (enrollment) => enrollment.lessonProgress, { onDelete: "CASCADE" })
  @JoinColumn({ name: "enrollment_id" })
  enrollment!: CourseEnrollment;

  @ManyToOne(() => CourseData, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_data_id" })
  courseData!: CourseData;

  @Column({
    type: "varchar",
    length: 20,
    default: LessonCompletionStatus.NOT_STARTED,
  })
  status!: LessonCompletionStatus;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  progress!: number; // 0-100 percentage

  @Column({ type: "integer", name: "watch_time_sec", default: 0 })
  watchTimeSec!: number; // Total time watched in seconds

  @Column({ type: "integer", name: "last_position_sec", default: 0 })
  lastPositionSec!: number; // Last video position in seconds

  @Column({ type: "boolean", name: "is_completed", default: false })
  isCompleted!: boolean;

  @Column({ type: "timestamp", name: "started_at", nullable: true })
  startedAt!: Date | null;

  @Column({ type: "timestamp", name: "completed_at", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "timestamp", name: "last_watched_at", nullable: true })
  lastWatchedAt!: Date | null;

  @Column({ type: "integer", name: "view_count", default: 0 })
  viewCount!: number; // How many times user opened this lesson

  @Column({ type: "jsonb", nullable: true })
  notes!: Array<{
    timestamp: number; // Video timestamp
    content: string;
    createdAt: Date;
  }> | null; // User's personal notes

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

// ============ COURSE ACTIVITY LOG ============

@Entity({ name: "course_activity_logs" })
@Index(["user", "createdAt"])
@Index(["course", "activityType"])
export class CourseActivityLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @ManyToOne(() => CourseData, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "course_data_id" })
  courseData!: CourseData | null;

  @Column({ type: "varchar", length: 50, name: "activity_type" })
  activityType!: 
    | "ENROLLED"
    | "LESSON_STARTED"
    | "LESSON_COMPLETED"
    | "COURSE_COMPLETED"
    | "VIDEO_WATCHED"
    | "QUIZ_ATTEMPTED"
    | "CERTIFICATE_ISSUED"
    | "REVIEW_SUBMITTED";

  @Column({ type: "jsonb", nullable: true })
  metadata!: {
    watchTimeSec?: number;
    progress?: number;
    score?: number;
    [key: string]: any;
  } | null;

  @Column({ type: "varchar", length: 45, name: "ip_address", nullable: true })
  ipAddress!: string | null;

  @Column({ type: "varchar", length: 512, name: "user_agent", nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}

// ============ COURSE BOOKMARKS ============

@Entity({ name: "course_bookmarks" })
@Unique(["user", "courseData"])
@Index(["user", "createdAt"])
export class CourseBookmark {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => CourseData, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_data_id" })
  courseData!: CourseData;

  @Column({ type: "integer", name: "video_timestamp_sec", default: 0 })
  videoTimestampSec!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  title!: string | null;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

// ============ USER COURSE PREFERENCES ============

@Entity({ name: "user_course_preferences" })
@Unique(["user", "course"])
export class UserCoursePreference {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @Column({ type: "decimal", precision: 3, scale: 2, name: "playback_speed", default: 1.0 })
  playbackSpeed!: number; // 0.5, 1.0, 1.5, 2.0

  @Column({ type: "integer", name: "video_quality", default: 720 })
  videoQuality!: number; // 360, 480, 720, 1080

  @Column({ type: "boolean", name: "auto_play_next", default: true })
  autoPlayNext!: boolean;

  @Column({ type: "boolean", name: "show_subtitles", default: false })
  showSubtitles!: boolean;

  @Column({ type: "varchar", length: 10, name: "subtitle_language", default: "en" })
  subtitleLanguage!: string;

  @Column({ type: "jsonb", nullable: true })
  customSettings!: Record<string, any> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}