import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User.js";
import { Course } from "./Course.js";

@Entity({ name: "organizations" })
export class Organization {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 160, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  slug!: string | null;

  @OneToMany(() => User, (u) => u.organization)
  users!: User[];

  @OneToMany(() => Course, (c) => c.organization)
  courses!: Course[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
