import * as yup from "yup";

export const assessmentQuestionFormValidationSchema = yup.object().shape({
  label: yup.string().required().label("Question"),
  option_1: yup.string().required().label("Option 1"),
  option_2: yup.string().required().label("Option 2"),
  option_3: yup.string().required().label("Option 3"),
  option_4: yup.string().required().label("Option 4"),
  is_correct: yup
    .string()
    .required()
    .label("Correct Option")
    .oneOf(["option_1", "option_2", "option_3", "option_4"]),
});

export type AssessmentFormValues = yup.InferType<
  typeof assessmentQuestionFormValidationSchema
>;

export const initialValues: AssessmentFormValues = {
  label: "",
  option_1: "",
  option_2: "",
  option_3: "",
  option_4: "",
  is_correct: "",
};
