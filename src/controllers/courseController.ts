import { Request, Response } from "express";
import { Course, ICourseData, IReview } from "../entities/Course.js";
import { User } from "../entities/User.js";
// import { Layout } from "../entities/Layout.js";
import { AppDataSource } from "../config/databaseConfig.js";

const courseRepository = AppDataSource.getRepository(Course);
const userRepository = AppDataSource.getRepository(User);
// const layoutRepository = AppDataSource.getRepository(Layout);

export const courseController = {
  createCourse: async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        categories,
        price,
        estimatedPrice,
        thumbnail,
        tags,
        level,
        demoUrl,
        benefits,
        prerequisites,
        teacherId,
        // layoutId,
        courseData,
        status = "DRAFT",
      } = req.body;

      if (!name || !description || !categories || !tags || !level || !demoUrl) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      let teacher = null;
      if (teacherId) {
        teacher = await userRepository.findOne({ where: { id: teacherId } });
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Teacher not found",
          });
        }
      }

    //   let layout = null;
    //   if (layoutId) {
    //     layout = await layoutRepository.findOne({ where: { id: layoutId } });
    //     if (!layout) {
    //       return res.status(404).json({
    //         success: false,
    //         message: "Layout not found",
    //       });
    //     }
    //   }

      const course = courseRepository.create({
        name,
        description,
        categories,
        price: price || 0,
        estimatedPrice: estimatedPrice || null,
        thumbnail: thumbnail || null,
        tags,
        level,
        demoUrl,
        benefits: benefits || [],
        prerequisites: prerequisites || [],
        teacher,
        // layout,
        courseData: courseData || [],
        reviews: [],
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      });

      const savedCourse = await courseRepository.save(course);

      res.status(201).json({
        success: true,
        message: "Course created successfully",
        data: savedCourse,
      });
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create course",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  getAllCourses: async (req: Request, res: Response) => {
    try {
        console.log("req.query");
      const {
        page = 1,
        limit = 10,
        status,
        category,
        level,
        minPrice,
        maxPrice,
        search,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const queryBuilder = courseRepository
        .createQueryBuilder("course")
        .leftJoinAndSelect("course.teacher", "teacher")
        // .leftJoinAndSelect("course.layout", "layout");

      if (status) {
        queryBuilder.andWhere("course.status = :status", { status });
      }

      if (category) {
        queryBuilder.andWhere("course.categories ILIKE :category", {
          category: `%${category}%`,
        });
      }

      if (level) {
        queryBuilder.andWhere("course.level = :level", { level });
      }

      if (minPrice) {
        queryBuilder.andWhere("course.price >= :minPrice", { minPrice: Number(minPrice) });
      }

      if (maxPrice) {
        queryBuilder.andWhere("course.price <= :maxPrice", { maxPrice: Number(maxPrice) });
      }

      if (search) {
        queryBuilder.andWhere(
          "(course.name ILIKE :search OR course.description ILIKE :search OR course.tags ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      const allowedSortFields = ["createdAt", "updatedAt", "name", "price", "ratings", "purchased"];
      const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : "createdAt";
      queryBuilder.orderBy(`course.${sortField}`, sortOrder === "ASC" ? "ASC" : "DESC");

      const [courses, total] = await queryBuilder.skip(skip).take(take).getManyAndCount();

      res.json({
        success: true,
        data: courses,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch courses",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  getCourseById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const course = await courseRepository.findOne({
        where: { id },
        relations: ["teacher", 
            // "layout"
        ],
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      res.json({
        success: true,
        data: course,
      });
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch course",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  updateCourse: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const course = await courseRepository.findOne({ where: { id } });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      if (updateData.teacherId) {
        const teacher = await userRepository.findOne({ where: { id: updateData.teacherId } });
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Teacher not found",
          });
        }
        course.teacher = teacher;
        delete updateData.teacherId;
      }

      // Handle layout update
    //   if (updateData.layoutId) {
    //     const layout = await layoutRepository.findOne({ where: { id: updateData.layoutId } });
    //     if (!layout) {
    //       return res.status(404).json({
    //         success: false,
    //         message: "Layout not found",
    //       });
    //     }
    //     course.layout = layout;
    //     delete updateData.layoutId;
    //   }

      if (updateData.status === "PUBLISHED" && course.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }

      Object.assign(course, updateData);
      const updatedCourse = await courseRepository.save(course);

      res.json({
        success: true,
        message: "Course updated successfully",
        data: updatedCourse,
      });
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update course",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  deleteCourse: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const course = await courseRepository.findOne({ where: { id } });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      course.status = "ARCHIVED";
      await courseRepository.save(course);

      res.json({
        success: true,
        message: "Course archived successfully",
      });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete course",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  hardDeleteCourse: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await courseRepository.delete(id);

      if (result.affected === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      res.json({
        success: true,
        message: "Course permanently deleted",
      });
    } catch (error) {
      console.error("Error permanently deleting course:", error);
      res.status(500).json({
        success: false,
        message: "Failed to permanently delete course",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },


  addCourseContent: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const contentData: ICourseData = req.body;

      const course = await courseRepository.findOne({ where: { id } });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      const newContent: ICourseData = {
        ...contentData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: contentData.questions || [],
        links: contentData.links || [],
      };


      if (!Array.isArray(course.courseData)) {
        course.courseData = [];
      }
      course.courseData.push(newContent);
      const updatedCourse = await courseRepository.save(course);

      res.json({
        success: true,
        message: "Course content added successfully",
        data: updatedCourse,
      });
    } catch (error) {
      console.error("Error adding course content:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add course content",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  updateCourseContent: async (req: Request, res: Response) => {
    try {
      const { id, contentId } = req.params;
      const updateData = req.body;

      const course = await courseRepository.findOne({ where: { id } });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      const contentIndex = course.courseData.findIndex((c) => c.id === contentId);

      if (contentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Course content not found",
        });
      }

      course.courseData[contentIndex] = {
        ...course.courseData[contentIndex],
        ...updateData,
        updatedAt: new Date(),
      };

      const updatedCourse = await courseRepository.save(course);

      res.json({
        success: true,
        message: "Course content updated successfully",
        data: updatedCourse,
      });
    } catch (error) {
      console.error("Error updating course content:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update course content",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },


  deleteCourseContent : async (req: Request, res: Response) => {
  try {
    const { id, contentId } = req.params;

    const course = await courseRepository.findOne({ where: { id } });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

   await courseRepository.query(
      `
      UPDATE courses
      SET course_data = (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(course_data) AS elem
        WHERE elem->>'id' != $1
      )
      WHERE id = $2
      `,
      [contentId, id]
    );

    const updatedCourse = await courseRepository.findOne({ where: { id } });

    return res.json({
      success: true,
      message: "Course content deleted successfully",
      data: updatedCourse,
    });

  } catch (error) {
    console.error("Error deleting course content:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete course content",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
},


  addReview: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, rating, comment, user } = req.body;

      if (!rating || !comment) {
        return res.status(400).json({
          success: false,
          message: "Rating and comment are required",
        });
      }

      const course = await courseRepository.findOne({ where: { id } });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      const newReview: IReview = {
        id: crypto.randomUUID(),
        userId,
        user,
        rating,
        comment,
        commentReplies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      course.reviews.push(newReview);

      const totalRating = course.reviews.reduce((sum, review) => sum + review.rating, 0);
      course.ratings = Number((totalRating / course.reviews.length).toFixed(2));

      const updatedCourse = await courseRepository.save(course);

      res.json({
        success: true,
        message: "Review added successfully",
        data: updatedCourse,
      });
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add review",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  addReviewReply: async (req: Request, res: Response) => {
    try {
      const { id, reviewId } = req.params;
      const { user, comment, rating } = req.body;

      const course = await courseRepository.findOne({ where: { id } });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      const reviewIndex = course.reviews.findIndex((r) => r.id === reviewId);

      if (reviewIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      course.reviews[reviewIndex].commentReplies.push({
        user,
        comment,
        rating,
        createdAt: new Date(),
      });

      course.reviews[reviewIndex].updatedAt = new Date();

      const updatedCourse = await courseRepository.save(course);

      res.json({
        success: true,
        message: "Reply added successfully",
        data: updatedCourse,
      });
    } catch (error) {
      console.error("Error adding review reply:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add review reply",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  getCourseStats: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const course = await courseRepository.findOne({ where: { id } });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      const stats = {
        totalLessons: course.courseData.length,
        totalReviews: course.reviews.length,
        averageRating: course.ratings,
        totalPurchased: course.purchased,
        totalQuestions: course.courseData.reduce((sum, content) => sum + content.questions.length, 0),
        totalVideoLength: course.courseData.reduce((sum, content) => sum + (content.videoLength || 0), 0),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching course stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch course statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};