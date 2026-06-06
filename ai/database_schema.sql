-- Database Schema for Assessment ID Storage
-- Use this for production PostgreSQL implementation

-- Main assessments table
CREATE TABLE assessments (
    id UUID PRIMARY KEY,
    job_description TEXT NOT NULL,
    role_type VARCHAR(20) NOT NULL,
    ai_determined_difficulty VARCHAR(20) NOT NULL,
    skills_assessed JSONB,
    current_stage VARCHAR(10) NOT NULL DEFAULT 'mcq',
    total_stages INTEGER NOT NULL DEFAULT 2,
    stage_completed JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment questions storage
CREATE TABLE assessment_questions (
    id SERIAL PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    stage VARCHAR(10) NOT NULL, -- 'mcq' or 'coding'
    question_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(10) NOT NULL, -- 'mcq' or 'coding'
    
    -- For MCQ questions
    mcq_options JSONB, -- ["Option A", "Option B", "Option C", "Option D"]
    correct_answer TEXT,
    explanation TEXT,
    
    -- For coding questions  
    function_signature TEXT,
    test_cases JSONB, -- [{"input": "...", "expected_output": "..."}]
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stage results storage
CREATE TABLE stage_results (
    id SERIAL PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    candidate_id UUID, -- Optional candidate identifier
    stage VARCHAR(10) NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    feedback TEXT,
    grading_details JSONB, -- Individual question results
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidate assessment linking
CREATE TABLE candidate_assessments (
    id SERIAL PRIMARY KEY,
    candidate_id UUID NOT NULL,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_assessments_created_at ON assessments(created_at);
CREATE INDEX idx_assessment_questions_assessment_id ON assessment_questions(assessment_id);
CREATE INDEX idx_assessment_questions_stage ON assessment_questions(assessment_id, stage);
CREATE INDEX idx_stage_results_assessment_id ON stage_results(assessment_id);
CREATE INDEX idx_candidate_assessments_candidate_id ON candidate_assessments(candidate_id);
CREATE INDEX idx_candidate_assessments_assessment_id ON candidate_assessments(assessment_id);

-- Example data insertion queries

-- Insert a new assessment
INSERT INTO assessments (
    id, 
    job_description, 
    role_type, 
    ai_determined_difficulty, 
    skills_assessed
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    'Senior Python Developer with expertise in Django...',
    'technical',
    'advanced',
    '["python", "django", "postgresql", "aws"]'::jsonb
);

-- Insert MCQ questions
INSERT INTO assessment_questions (
    assessment_id,
    stage,
    question_index,
    question_text,
    question_type,
    mcq_options,
    correct_answer,
    explanation
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    'mcq',
    1,
    'What is the time complexity of searching in a balanced binary tree?',
    'mcq',
    '["O(1)", "O(log n)", "O(n)", "O(n log n)"]'::jsonb,
    'O(log n)',
    'Balanced binary trees maintain O(log n) search time complexity.'
);

-- Insert coding questions
INSERT INTO assessment_questions (
    assessment_id,
    stage,
    question_index,
    question_text,
    question_type,
    function_signature,
    test_cases
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    'coding',
    1,
    'Implement a function to reverse a linked list',
    'coding',
    'def reverse_linked_list(head: ListNode) -> ListNode:',
    '[{"input": "[1,2,3,4,5]", "expected_output": "[5,4,3,2,1]"}]'::jsonb
);

-- Insert stage results
INSERT INTO stage_results (
    assessment_id,
    candidate_id,
    stage,
    overall_score,
    feedback,
    grading_details
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    '456e7890-e89b-12d3-a456-426614174111',
    'mcq',
    85.0,
    'Strong performance on MCQ stage',
    '{"total_questions": 10, "correct_answers": 8, "individual_scores": [...]}'::jsonb
);

-- Link candidate to assessment
INSERT INTO candidate_assessments (
    candidate_id,
    assessment_id,
    status
) VALUES (
    '456e7890-e89b-12d3-a456-426614174111',
    '123e4567-e89b-12d3-a456-426614174000',
    'in_progress'
);

-- Example query functions

-- Get assessment with questions
SELECT 
    a.*,
    json_agg(
        json_build_object(
            'stage', aq.stage,
            'question_index', aq.question_index,
            'question_text', aq.question_text,
            'question_type', aq.question_type,
            'mcq_options', aq.mcq_options,
            'correct_answer', aq.correct_answer,
            'explanation', aq.explanation,
            'function_signature', aq.function_signature,
            'test_cases', aq.test_cases
        ) ORDER BY aq.stage, aq.question_index
    ) as questions
FROM assessments a
LEFT JOIN assessment_questions aq ON a.id = aq.assessment_id
WHERE a.id = '123e4567-e89b-12d3-a456-426614174000'
GROUP BY a.id;

-- Get current stage questions for an assessment
SELECT aq.*
FROM assessments a
JOIN assessment_questions aq ON a.id = aq.assessment_id
WHERE a.id = '123e4567-e89b-12d3-a456-426614174000'
  AND aq.stage = a.current_stage
ORDER BY aq.question_index;

-- Get all results for an assessment
SELECT sr.*, ca.candidate_id
FROM stage_results sr
JOIN candidate_assessments ca ON sr.assessment_id = ca.assessment_id
WHERE sr.assessment_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY sr.submitted_at;

-- Update assessment stage completion
UPDATE assessments 
SET 
    stage_completed = stage_completed || '"mcq"'::jsonb,
    current_stage = 'coding',
    updated_at = NOW()
WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- Clean up old assessments (automated job)
DELETE FROM assessments 
WHERE created_at < NOW() - INTERVAL '30 days'; 