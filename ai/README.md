# Resume Analysis and Assessment API

A FastAPI-based API for analyzing resumes, generating technical assessments, and evaluating cultural fit.

## Features

- Resume Analysis
  - Extract text from PDF, DOCX, and TXT files
  - Compare resumes against job descriptions
  - Generate comprehensive scoring and recommendations

- Technical Assessments
  - Generate coding and MCQ questions
  - Customizable difficulty levels
  - Automated grading for coding assessments

- Culture Fit Evaluation
  - Generate culture-based interview questions
  - Company values assessment
  - Customizable number of questions

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

2. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # For Unix/macOS
venv\Scripts\activate     # For Windows
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL_NAME=gpt-4
```

## Running the Application

Start the development server with auto-reload:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

After starting the server, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

1. **Resume Analysis**
   - `POST /api/v1/analyze-resume/`
   - `POST /api/v1/analyze_resume_text/`

2. **Technical Assessments**
   - `POST /api/v1/assess`
   - `POST /api/v1/grade-coding-assessment`

3. **Culture Fit Assessment**
   - `POST /api/v1/culture-fit-assessment`

## New Endpoint: Generate Language-Specific Coding Assessment

### Endpoint: `POST /generate-coding-assessment`

This endpoint generates coding assessments tailored to specific programming languages for talent evaluation.

#### Parameters:
- `programming_languages` (required): List of programming languages to test
- `num_questions` (required): Number of coding questions to generate (1-20)
- `difficulty` (optional): Difficulty level - "beginner", "intermediate", or "advanced" (default: "intermediate")
- `focus_areas` (optional): Specific areas to focus on (e.g., ["algorithms", "data-structures"])

#### Supported Languages:
Python, JavaScript, Java, C++, C#, Go, Rust, TypeScript, PHP, Ruby, Swift, Kotlin, Scala, R, C, Perl, HTML/CSS

#### Example Request:
```bash
curl -X POST "http://localhost:8000/generate-coding-assessment" \
  -H "Content-Type: application/json" \
  -d '{
    "programming_languages": ["Python", "JavaScript"],
    "num_questions": 3,
    "difficulty": "intermediate",
    "focus_areas": ["algorithms", "data-structures"]
  }'
```

#### Example Response:
```json
{
  "assessment_type": "coding",
  "ai_determined_difficulty": "intermediate",
  "role_type": "technical",
  "skills_assessed": ["language proficiency", "problem-solving", "algorithms", "data-structures", "Python", "JavaScript"],
  "questions": [
    {
      "question": "Implement a function to find the two numbers in an array that add up to a target sum...",
      "function_signature": "def two_sum(nums: List[int], target: int) -> List[int]:",
      "explanation": "Tests array manipulation, hash table usage, and problem-solving skills",
      "correct_answer": "Use a hash map to store seen numbers and their indices...",
      "test_cases": [
        {
          "input": "nums = [2, 7, 11, 15], target = 9",
          "expected_output": "[0, 1]"
        },
        {
          "input": "nums = [3, 2, 4], target = 6",
          "expected_output": "[1, 2]"
        }
      ]
    }
  ]
}
```

#### Key Features:
- **Comprehensive Test Cases**: Each question includes 4-6 test cases covering normal cases, edge cases, and boundary conditions
- **Language-Specific Questions**: Questions leverage unique features and best practices of each specified language
- **Practical Relevance**: Questions reflect real-world programming scenarios and industry requirements
- **Scalable Difficulty**: Questions adapt to beginner, intermediate, or advanced levels
- **Focus Areas**: Optional targeting of specific skill areas like algorithms, data structures, or system design

## Project Structure

```
app/
├── api/
│   ├── routes.py        # API endpoints
│   └── endpoints.py     # Additional endpoints
├── models/
│   ├── assessment.py    # Data models for assessments
│   └── resume.py        # Data models for resume analysis
├── services/
│   ├── assessment_service.py    # Assessment generation logic
│   ├── resume_analyzer.py       # Resume analysis logic
│   ├── text_extractor.py       # File text extraction
│   └── text_processor.py       # Text preprocessing
└── main.py             # Application entry point
```

## Testing

Run the test suite:

```bash
pytest
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
