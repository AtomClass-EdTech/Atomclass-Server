import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Unique, Column } from "typeorm";
import { User } from "./User.js";
import { Course } from "./Course.js";


@Entity({ name: "enrollments" })
@Unique(["user", "course"])
export class Enrollment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @CreateDateColumn({ name: "purchased_at" })
  purchasedAt!: Date;

  @Column({ type: "timestamptz", name: "expires_at", nullable: true })
  expiresAt!: Date | null;
}
