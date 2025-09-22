import {
  Entity,
  Column,
  BaseEntity,
  PrimaryColumn,
} from "typeorm";
import { generatePrefixedUUID } from "../utils/index.js";

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  id: string = generatePrefixedUUID("US");

  @Column({ nullable: false })
  firstName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column({ nullable: false })
  lastName: string;

  @Column({ unique: true, update: false })
  email: string;

  @Column({ nullable: false })
  phoneNumber: string;
}
