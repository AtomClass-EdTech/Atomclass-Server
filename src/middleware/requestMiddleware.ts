import { Request, Response, NextFunction } from "express";
import { validate } from "../utils/validate.js";
import yup from "yup";

const validatePayload = (schema: yup.ObjectSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { body } = req;
    const data = { ...body };
    const validationErrors = await validate(data, schema);
    if (validationErrors) {
      res.status(422).json({ errors: validationErrors });
      return;
    }

    next();
  };
};

const validateQuery = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { query } = req;
    const data = { ...query };
    const validationErrors = await validate(data, schema);
    if (validationErrors) {
      res.status(422).json({ errors: validationErrors });
      return;
    }

    next();
  };
};

export { validatePayload, validateQuery };
