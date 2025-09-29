import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { Course } from "./Course.js";

@Entity({ name: "layouts" })
export class Layout {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 50 })
  type!: string;

  @Column({ type: "jsonb", default: [] })
  faq!: Array<{ question: string; answer: string }>;

  @Column({ type: "jsonb", default: [] })
  categories!: Array<{ title: string }>;

  @Column({ type: "jsonb", nullable: true })
  banner!: {
    image: { public_id: string; url: string };
    title: string;
    subTitle: string;
  } | null;

  // @OneToOne(() => Course, { onDelete: "SET NULL", nullable: true })
  // @JoinColumn({ name: "teacher_id" })
  // course!: Course | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}