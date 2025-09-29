import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

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

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}