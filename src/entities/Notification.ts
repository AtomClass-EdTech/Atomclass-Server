import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "./User.js";

@Entity({ name: "notifications" })
@Index(["user", "status"])
@Index(["createdAt"])
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "varchar", length: 50, default: "UNREAD" })
  status!: "READ" | "UNREAD";

  @Column({ type: "varchar", length: 50, nullable: true })
  type!: 
    | "COURSE_ENROLLMENT"
    | "COURSE_COMPLETION"
    | "NEW_REVIEW"
    | "QUESTION_REPLY"
    | "COURSE_UPDATE"
    | "SYSTEM"
    | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: {
    courseId?: string;
    courseName?: string;
    reviewId?: string;
    questionId?: string;
    url?: string;
    [key: string]: any;
  } | null;

  @Column({ type: "timestamp", name: "read_at", nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}