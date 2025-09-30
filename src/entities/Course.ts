import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne,
  Index, 
  CreateDateColumn, 
  UpdateDateColumn,
  JoinColumn,
  // OneToOne,
} from "typeorm";
import { User } from "./User.js";
// import { Layout } from "./Layout.js";

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export interface ICourseData {
  id: string;
  title: string;
  index: number;
  videoSection?: string;
  sectionIndex?: number;
  description?: string;
  videoUrl?: string;
  videoThumbnail?: JsonValue;
  videoLength: number;
  videoPlayer?: string;
  videoCfUid?: string;
  videoCfPlaybackId?: string;
  videoHlsUrl?: string;
  videoStatus: "UPLOADING" | "READY" | "FAILED";
  videoMeta?: JsonValue;
  suggestion?: string;
  links: Array<{ title: string; url: string }>;
  questions: Array<{
    id: string;
    userId: string;
    user: JsonValue;
    question: string;
    questionReplies: Array<{
      user: JsonValue;
      question: string;
      createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReview {
  id: string;
  userId: string;
  user: JsonValue;
  rating: number;
  comment: string;
  commentReplies: Array<{
    user: JsonValue;
    comment: string;
    rating?: number;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

@Entity({ name: "courses" })
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "varchar", length: 100 })
  categories!: string;

  @Column({ type: "integer" })
  price!: number;

  @Column({ type: "integer", name: "estimated_price", nullable: true })
  estimatedPrice!: number | null;

  @Column({ type: "jsonb", nullable: true })
  thumbnail!: { public_id?: string; url?: string } | null;

  @Column({ type: "varchar", length: 255 })
  tags!: string;

  @Column({ type: "varchar", length: 50 })
  level!: string;

  @Column({ type: "varchar", length: 512, name: "demo_url" })
  demoUrl!: string;

  @Column({ type: "jsonb", default: [] })
  benefits!: Array<{ title: string }>;

  @Column({ type: "jsonb", default: [] })
  prerequisites!: Array<{ title: string }>;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  ratings!: number;

  @Column({ type: "integer", default: 0 })
  purchased!: number;

  @Column({ type: "varchar", length: 20, default: "DRAFT" })
  status!: "DRAFT" | "PUBLISHED" | "ARCHIVED";

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "teacher_id" })
  teacher!: User | null;

  // @OneToOne(() => Layout, { onDelete: "SET NULL", nullable: true })
  // @JoinColumn({ name: "layout_id" })
  // layout!: Layout | null;

  @Column({ type: "timestamp", name: "published_at", nullable: true })
  publishedAt!: Date | null;

  // Optimized with GIN index for JSONB queries
  @Index("idx_course_data_gin", { synchronize: false })
  @Column({ 
    type: "jsonb", 
    name: "course_data", 
    default: [],
    transformer: {
      to: (value: ICourseData[]) => value,
      from: (value: ICourseData[]) => {
        return value.map(item => ({
          ...item,
          id: item.id || crypto.randomUUID()
        }));
      }
    }
  })
  courseData!: ICourseData[];

  // Optimized with GIN index for JSONB queries
  @Index("idx_reviews_gin", { synchronize: false })
  @Column({ 
    type: "jsonb", 
    default: [],
    transformer: {
      to: (value: IReview[]) => value,
      from: (value: IReview[]) => {
        // Ensure each review has an id
        return value.map(item => ({
          ...item,
          id: item.id || crypto.randomUUID()
        }));
      }
    }
  })
  reviews!: IReview[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

// Migration SQL for creating GIN indexes (run separately):
// CREATE INDEX idx_course_data_gin ON courses USING GIN (course_data);
// CREATE INDEX idx_reviews_gin ON reviews USING GIN (reviews);
// 
// Optional: Create specific indexes for common queries
// CREATE INDEX idx_course_data_id ON courses USING GIN ((course_data->'id'));
// CREATE INDEX idx_course_data_video_status ON courses USING GIN ((course_data->'videoStatus'));