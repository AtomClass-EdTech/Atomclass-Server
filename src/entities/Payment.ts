import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm";
import { Order } from "./Order.js";

@Entity({ name: "payments" })
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 80, name: "razorpay_payment_id" })
  razorpayPaymentId!: string;

  @Column({ type: "varchar", length: 20, default: "CAPTURED" })
  status!: "CREATED" | "CAPTURED" | "FAILED" | "REFUNDED";

  @Column({ type: "int" })
  amount!: number;

  @Column({ type: "jsonb", nullable: true })
  meta!: any | null;

  @CreateDateColumn({ name: "captured_at" })
  capturedAt!: Date;
}
