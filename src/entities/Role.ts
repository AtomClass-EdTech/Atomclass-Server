import { Entity, PrimaryGeneratedColumn, Column, Unique } from "typeorm";

export type RoleName = "SUPER_ADMIN" | "TEACHER" | "STUDENT";

@Entity({ name: "roles" })
@Unique(["name"])
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 40 })
  name!: RoleName;

  @Column({ type: "varchar", length: 160, nullable: true })
  description!: string | null;
}
