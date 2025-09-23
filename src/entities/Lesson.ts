import { Entity, PrimaryGeneratedColumn, Column, OneToOne, ManyToOne, JoinColumn } from "typeorm";
import type { Section } from "./Section.js";
import type { VideoAsset } from "./VideoAsset.js";


@Entity({ name: "lessons" })
export class Lesson {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne("Section", (section: Section) => section.lessons, { onDelete: "CASCADE" })
  @JoinColumn({ name: "section_id" })
  section!: Section;

  @Column({ type: "varchar", length: 160 })
  title!: string;
  
  @Column({ type: "int", default: 0 })
  index!: number;
  
  @Column({ type: "int", name: "duration_sec", default: 0 })
  durationSec!: number;
  
  @OneToOne("VideoAsset", (video: VideoAsset) => video.lesson, { cascade: true, nullable: true })
  video!: VideoAsset | null;
}
