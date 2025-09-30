// services/enrollment.service.ts

import { AppDataSource } from "../config/databaseConfig.js";
import { Course } from "../entities/Course.js";
import { Enrollment } from "../entities/Enrollment.js";
import { User } from "../entities/User.js";


export class EnrollmentService {
  private enrollmentRepo = AppDataSource.getRepository(Enrollment);
  private userRepo = AppDataSource.getRepository(User);
  private courseRepo = AppDataSource.getRepository(Course);

  async getAll() {
    return this.enrollmentRepo.find({
      relations: ["user", "course"],
    });
  }

  async getById(id: string) {
    return this.enrollmentRepo.findOne({
      where: { id },
      relations: ["user", "course"],
    });
  }

  async create(data: Partial<Enrollment>) {
    const user = await this.userRepo.findOneByOrFail({ id: data.user?.id });
    const course = await this.courseRepo.findOneByOrFail({ id: data.course?.id });

    console.log("course----->", course);

    const enrollment = this.enrollmentRepo.create({
      ...data,
      user,
      course,
      enrolledAt: new Date(),
    });

    return this.enrollmentRepo.save(enrollment);
  }

  async update(id: string, data: Partial<Enrollment>) {
    const enrollment = await this.getById(id);
    if (!enrollment) throw new Error("Enrollment not found");

    const updated = this.enrollmentRepo.merge(enrollment, data);
    return this.enrollmentRepo.save(updated);
  }

  async delete(id: string) {
    return this.enrollmentRepo.delete(id);
  }
}
