import { z } from "zod";
export const passwordSchema=z.string().min(12,"Use at least 12 characters.").regex(/[A-Z]/,"Include an uppercase letter.").regex(/[a-z]/,"Include a lowercase letter.").regex(/[0-9]/,"Include a number.");
export const loginSchema=z.object({email:z.string().email(),password:z.string().min(1)});
export const answerSchema=z.object({attemptId:z.string().uuid(),questionId:z.string().uuid(),answerText:z.string().max(10000).optional(),selectedOptionId:z.string().uuid().optional()});
