import { AssessmentQuestionSection } from "@/app/common/types";

/** Sample assessment questions used purely to preview the Step 3 review/edit
 * UI before the AI service is configured -- shape and category names match
 * exactly what `GenerateAssessmentQuestionsView` returns for real, non-
 * technical roles (see backend/jobs/views.py NON_TECHNICAL_ASSESSMENT_CATEGORIES). */
export const getSampleAssessmentQuestions = (): AssessmentQuestionSection[] => [
  {
    category: "Role Knowledge",
    questions: [
      {
        question: "Which HTTP method is idempotent and safe to retry without side effects?",
        options: [
          { index: 0, value: "GET" },
          { index: 1, value: "POST" },
          { index: 2, value: "PATCH" },
          { index: 3, value: "DELETE" },
        ],
        correct_option_index: 0,
        is_ai_generated: true,
      },
      {
        question: "In a REST API, what status code indicates a successful resource creation?",
        options: [
          { index: 0, value: "200 OK" },
          { index: 1, value: "201 Created" },
          { index: 2, value: "204 No Content" },
          { index: 3, value: "301 Moved" },
        ],
        correct_option_index: 1,
        is_ai_generated: true,
      },
      {
        question: "What is the primary purpose of a version control system like Git?",
        options: [
          { index: 0, value: "To compile source code" },
          { index: 1, value: "To track changes and enable collaboration on code" },
          { index: 2, value: "To host a live website" },
          { index: 3, value: "To manage server infrastructure" },
        ],
        correct_option_index: 1,
        is_ai_generated: true,
      },
    ],
  },
  {
    category: "Practical Scenarios",
    questions: [
      {
        question:
          "A production database is showing high latency. What is the FIRST thing you should check?",
        options: [
          { index: 0, value: "Rewrite the whole schema" },
          { index: 1, value: "Check slow query logs and active connections" },
          { index: 2, value: "Restart the frontend" },
          { index: 3, value: "Add more RAM blindly" },
        ],
        correct_option_index: 1,
        is_ai_generated: true,
      },
      {
        question: "Your team needs to roll back a bad deploy quickly. What is the safest approach?",
        options: [
          { index: 0, value: "Manually edit files on the server" },
          { index: 1, value: "Revert to the previous known-good release/tag" },
          { index: 2, value: "Wait until morning" },
          { index: 3, value: "Delete the database" },
        ],
        correct_option_index: 1,
        is_ai_generated: true,
      },
      {
        question: "A teammate pushes a breaking change to main. What should you do first?",
        options: [
          { index: 0, value: "Ignore it" },
          { index: 1, value: "Communicate and coordinate a fix or revert" },
          { index: 2, value: "Force push over it" },
          { index: 3, value: "Quit the project" },
        ],
        correct_option_index: 1,
        is_ai_generated: true,
      },
    ],
  },
  {
    category: "Problem Solving",
    questions: [
      {
        question: "You need to find duplicate entries in a large list efficiently. Which approach is best?",
        options: [
          { index: 0, value: "Nested loops, O(n^2)" },
          { index: 1, value: "Use a hash set for O(n) lookups" },
          { index: 2, value: "Sort manually by hand" },
          { index: 3, value: "Ignore duplicates" },
        ],
        correct_option_index: 1,
        is_ai_generated: true,
      },
      {
        question: "What is the time complexity of binary search on a sorted array?",
        options: [
          { index: 0, value: "O(n)" },
          { index: 1, value: "O(n^2)" },
          { index: 2, value: "O(log n)" },
          { index: 3, value: "O(1)" },
        ],
        correct_option_index: 2,
        is_ai_generated: true,
      },
      {
        question: "When designing a system that must scale, what is a key early decision?",
        options: [
          { index: 0, value: "Ignore load until it breaks" },
          { index: 1, value: "Consider statelessness and horizontal scaling" },
          { index: 2, value: "Only use one server forever" },
          { index: 3, value: "Avoid caching entirely" },
        ],
        correct_option_index: 1,
        is_ai_generated: true,
      },
    ],
  },
];
