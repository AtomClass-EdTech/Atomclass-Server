import get from "lodash/get.js";
import set from "lodash/set.js";

// Validate data against a yup schema and map the errors to an object like
// { email: ['Invalid email'], password: ['Password must be at least 6 characters'] }
export const validate = async function (
  values: any,
  schema: any,
  context?: any,
) {
  try {
    await schema.validate(values, { context });
    return null;
  } catch (error: any) {
    const errors: any = {};

    if (error.inner) {
      if (error.inner.length === 0) {
        set(errors, error.path, [error.message]);
      } else {
        for (const err of error.inner) {
          const messages = get(errors, err.path, []);
          set(errors, err.path, [...messages, err.message]);
        }
      }
    } else {
      throw error;
    }

    return errors;
  }
};
