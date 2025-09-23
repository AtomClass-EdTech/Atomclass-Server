import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm";
import { User } from "./User.js";
import { Course } from "./Course.js";


@Entity({ name: "orders" })
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user!: User | null;

  @ManyToOne(() => Course, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "course_id" })
  course!: Course | null;

  @Column({ type: "int" })
  amount!: number; // minor units

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 80, name: "razorpay_order_id" })
  razorpayOrderId!: string;

  @Column({ type: "varchar", length: 16, default: "CREATED" })
  status!: "CREATED" | "PAID" | "FAILED" | "REFUNDED";

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
