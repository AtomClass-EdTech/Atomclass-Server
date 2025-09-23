import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { User } from "./User.js";
import { Organization } from "./Organization.js";
import type { Section } from "./Section.js";


@Entity({ name: "courses" })
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  category!: string | null;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency!: string;

  @Column({ type: "integer", default: 0 }) 
  price!: number;

  @Column({ type: "varchar", length: 20, default: "DRAFT" })
  status!: "DRAFT" | "PUBLISHED" | "ARCHIVED";

  @Column({ type: "varchar", length: 512, name: "thumbnail_url", nullable: true })
  thumbnailUrl!: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "teacher_id" })
  teacher!: User | null;

  @ManyToOne(() => Organization, (o) => o.courses, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "organization_id" })
  organization!: Organization | null;

  @OneToMany("Section", (section: Section) => section.course, { cascade: true })
  sections!: Section[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamptz", name: "published_at", nullable: true })
  publishedAt!: Date | null;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
