export type Role="ADMIN"|"STUDENT";
export type TestStatus="DRAFT"|"READY"|"PUBLISHED"|"CLOSED";
export type QuestionType="MCQ"|"THEORY";
export type ResultVisibility="IMMEDIATE"|"AFTER_REVIEW"|"NEVER";
export type Database={public:{Tables:{profiles:{Row:{id:string;full_name:string|null;role:Role;is_active:boolean}};tests:{Row:{id:string;title:string;description:string|null;instructions:string|null;duration_minutes:number;passing_score:number;status:TestStatus;starts_at:string|null;ends_at:string|null;result_visibility:ResultVisibility}}}}};
