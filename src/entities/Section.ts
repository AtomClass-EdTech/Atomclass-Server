import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import type { Course } from "./Course.js";
import type { Lesson } from "./Lesson.js";


@Entity({ name: "sections" })
export class Section {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne("Course", (course: Course) => course.sections, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "int", default: 0 })
  index!: number;

  @OneToMany("Lesson", (lesson: Lesson) => lesson.section, { cascade: true })
  lessons!: Lesson[];
}
