import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./Course.js";

export type VideoStatus = "UPLOADING" | "READY" | "FAILED";

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

@Entity({ name: "lessons" })
export class Lesson {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Course, (course) => course.lessons, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "int", default: 0 })
  index!: number;

  @Column({ type: "varchar", length: 160, name: "section_title", nullable: true })
  sectionTitle!: string | null;

  @Column({ type: "int", name: "section_index", nullable: true })
  sectionIndex!: number | null;

  @Column({ type: "int", name: "duration_sec", default: 0 })
  durationSec!: number;

  @Column({ type: "varchar", length: 80, name: "video_cf_uid", nullable: true })
  videoCfUid!: string | null;

  @Column({ type: "varchar", length: 80, name: "video_cf_playback_id", nullable: true })
  videoCfPlaybackId!: string | null;

  @Column({ type: "varchar", length: 512, name: "video_hls_url", nullable: true })
  videoHlsUrl!: string | null;

  @Column({ type: "varchar", length: 20, name: "video_status", default: "UPLOADING" })
  videoStatus!: VideoStatus;

  @Column({ type: "jsonb", name: "video_meta", nullable: true })
  videoMeta!: JsonValue | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
