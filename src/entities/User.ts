import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum OtpType {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
}

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export interface OTPMetadata {
  code: string | null;
  type?: OtpType;
  expiresAt: Date | string | null;
  attempts?: number;
  lastSentAt?: Date | string | null;
  verified?: boolean;
}

export interface UserDevice {
  deviceId: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  lastSeen: Date;
}

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 190 })
  email!: string;

  @Index({ unique: true })
  @Column({
    type: "varchar",
    length: 190,
    name: "identity_sub",
    nullable: true,
  })
  identitySub!: string | null;

  @Index({ unique: true })
  @Column({
    type: "varchar",
    length: 190,
    name: "cognito_id",
    nullable: true,
  })
  cognitoId!: string | null;

  @Column({ type: "varchar", length: 190, name: "full_name" })
  fullName!: string;

  @Column({ type: "varchar", length: 20, nullable: true, name: "phone_number" })
  phoneNumber!: string | null;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status!: "ACTIVE" | "SUSPENDED";

  @Column({
    type: "varchar",
    length: 40,
    default: UserRole.USER,
    name: "role",
  })
  role!: UserRole;

  @Column({ type: "boolean", default: false, name: "is_verified" })
  isVerified!: boolean;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  @Column({ type: "int", default: 0, name: "login_count" })
  loginCount!: number;

  @Column({ type: "timestamp", name: "last_login", nullable: true })
  lastLogin!: Date | null;

  @Column({ type: "varchar", length: 45, name: "last_login_ip", nullable: true })
  lastLoginIp!: string | null;

  @Column({
    type: "varchar",
    length: 512,
    name: "last_login_user_agent",
    nullable: true,
  })
  lastLoginUserAgent!: string | null;

  @Column({ type: "jsonb", nullable: true })
  otp!: OTPMetadata | null;

  @Column({ type: "jsonb", default: [] })
  devices!: UserDevice[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}