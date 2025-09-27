import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { User } from "./User.js";

@Entity({ name: "user_devices" })
@Index(["user", "deviceId"], { unique: true })
export class UserDevice {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "varchar", length: 190, name: "device_id" })
  deviceId!: string;

  @Column({ type: "varchar", length: 255, name: "device_name", nullable: true })
  deviceName!: string | null;

  @Column({ type: "varchar", length: 512, name: "user_agent", nullable: true })
  userAgent!: string | null;

  @Column({ type: "varchar", length: 45, name: "ip_address", nullable: true })
  ipAddress!: string | null;

  @Column({ type: "boolean", name: "is_active", default: true })
  isActive!: boolean;

  @Column({ type: "timestamp", name: "last_seen" })
  lastSeen!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
