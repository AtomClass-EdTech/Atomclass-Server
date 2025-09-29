import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./User.js";
import { Course } from "./Course.js";

export enum EnrollmentStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
  DROPPED = "DROPPED",
}

export interface LessonProgress {
  courseDataId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progress: number;
  watchTimeSec: number;
  lastPositionSec: number;
  isCompleted: boolean;
  startedAt?: Date;
  completedAt?: Date;
  lastWatchedAt?: Date;
  viewCount: number;
  notes?: Array<{
    timestamp: number;
    content: string;
    createdAt: Date;
  }>;
}

export interface CourseBookmark {
  id: string;
  courseDataId: string;
  videoTimestampSec: number;
  title?: string;
  note?: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  courseDataId?: string;
  activityType: 
    | "ENROLLED"
    | "LESSON_STARTED"
    | "LESSON_COMPLETED"
    | "COURSE_COMPLETED"
    | "VIDEO_WATCHED"
    | "CERTIFICATE_ISSUED"
    | "REVIEW_SUBMITTED";
  metadata?: {
    watchTimeSec?: number;
    progress?: number;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CoursePreferences {
  playbackSpeed: number;
  videoQuality: number;
  autoPlayNext: boolean;
  showSubtitles: boolean;
  subtitleLanguage: string;
  customSettings?: Record<string, any>;
}

@Entity({ name: "enrollments" })
@Unique(["user", "course"])
@Index(["user", "status"])
@Index(["course", "status"])
export class Enrollment {
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
  progress!: number;

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
  rating!: number | null;

  @Column({ type: "text", nullable: true })
  review!: string | null;

  @Column({ type: "jsonb", nullable: true })
  certificate!: {
    issued: boolean;
    issuedAt?: Date;
    certificateId?: string;
    certificateUrl?: string;
  } | null;

  // All lesson progress stored as JSONB array
  @Column({ type: "jsonb", name: "lesson_progress", default: [] })
  lessonProgress!: LessonProgress[];

  // All bookmarks stored as JSONB array
  @Column({ type: "jsonb", default: [] })
  bookmarks!: CourseBookmark[];

  // All activity logs stored as JSONB array
  @Column({ type: "jsonb", name: "activity_logs", default: [] })
  activityLogs!: ActivityLog[];

  // User preferences for this course
  @Column({ type: "jsonb", nullable: true })
  preferences!: CoursePreferences | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}