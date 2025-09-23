import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, Index
} from "typeorm";
import { Organization } from "./Organization.js";
import { Role } from "./Role.js";


@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 190 })
  email!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 190, name: "identity_sub", nullable: true })
  identitySub!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  name!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true, name: "first_name" })
  firstName!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true, name: "last_name" })
  lastName!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true, name: "phone_number" })
  phoneNumber!: string | null;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status!: "ACTIVE" | "SUSPENDED";

  @ManyToOne(() => Organization, (o) => o.users, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization!: Organization | null;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles!: Role[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })

  updatedAt!: Date;
}
