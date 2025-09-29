import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "./User.js";
import { Course } from "./Course.js";

export type PurchaseStatus =
  | "CREATED"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "EXPIRED";

export type PaymentProvider = "RAZORPAY" | "MANUAL" | "UNKNOWN";

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

@Entity({ name: "purchases" })
@Index(["user", "status"])
@Index(["course", "status"])
export class Purchase {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @Column({ type: "int" })
  amount!: number;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency!: string;

  @Column({ type: "varchar", length: 32, name: "payment_provider", default: "UNKNOWN" })
  paymentProvider!: PaymentProvider;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 80, name: "provider_order_id", nullable: true })
  providerOrderId!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 80, name: "provider_payment_id", nullable: true })
  providerPaymentId!: string | null;

  @Column({ type: "varchar", length: 16, default: "CREATED" })
  status!: PurchaseStatus;

  @Column({ type: "jsonb", nullable: true })
  meta!: JsonValue | null;

  @Column({ type: "timestamptz", name: "purchased_at", default: () => "now()" })
  purchasedAt!: Date;

  @Column({ type: "timestamptz", name: "expires_at", nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}