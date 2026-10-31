export function validate(schema, source = "body") {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        message: d.message,
        path: d.path.join("."),
      }));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: details,
      });
    }

    req[source] = value;
    next();
  };
}

export default validate;
