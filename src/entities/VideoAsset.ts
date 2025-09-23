import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import type { Lesson } from "./Lesson.js";

@Entity({ name: "video_assets" })
export class VideoAsset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne("Lesson", (lesson: Lesson) => lesson.video, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lesson_id" })
  lesson!: Lesson;

  @Column({ type: "varchar", length: 80, name: "cf_uid" })
  cfUid!: string;

  @Column({ type: "varchar", length: 80, name: "cf_playback_id" })
  cfPlaybackId!: string;

  @Column({ type: "varchar", length: 512, name: "hls_url" })
  hlsUrl!: string;

  @Column({ type: "varchar", length: 20, default: "UPLOADING" })
  status!: "UPLOADING" | "READY" | "FAILED";
}
