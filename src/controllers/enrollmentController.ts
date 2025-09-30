// controllers/enrollment.controller.ts
import { Request, Response } from "express";
import { EnrollmentService } from "../services/enrollmentService.js";

const service = new EnrollmentService();

export class EnrollmentController {
  static async getAll(_req: Request, res: Response) {
    const enrollments = await service.getAll();
    return res.json(enrollments);
  }

  static async getById(req: Request, res: Response) {
    try {
      const enrollment = await service.getById(req.params.id);
      if (!enrollment) return res.status(404).json({ message: "Not found" });
      return res.json(enrollment);
    } catch (err) {
      return res.status(500).json({ message: err });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const enrollment = await service.create(req.body);
      return res.status(201).json(enrollment);
    } catch (err) {
      return res.status(400).json({ message: err });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const updated = await service.update(req.params.id, req.body);
      return res.json(updated);
    } catch (err) {
      return res.status(400).json({ message: err });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await service.delete(req.params.id);
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: err });
    }
  }
}
