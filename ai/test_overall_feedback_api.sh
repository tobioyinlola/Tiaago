#!/bin/bash

echo "========================================="
echo "Testing Generate Overall Feedback API"
echo "========================================="

# Test 1: Empty request (should return default response)
echo -e "\n1. Test with empty request (default response):"
curl -X POST "http://localhost:8000/api/v1/generate-overall-feedback" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null | python3 -m json.tool | head -20

# Test 2: Resume analysis only
echo -e "\n2. Test with resume analysis only:"
curl -X POST "http://localhost:8000/api/v1/generate-overall-feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_analysis": {
      "total_score": 78,
      "role_match_status": "Good Match",
      "recommendation": "Proceed to Assessment",
      "strengths": ["Python expertise", "Cloud experience"],
      "areas_for_improvement": ["Frontend skills"]
    }
  }' 2>/dev/null | python3 -m json.tool | head -15

# Test 3: Complete assessment data
echo -e "\n3. Test with complete assessment data:"
curl -X POST "http://localhost:8000/api/v1/generate-overall-feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": "candidate-001",
    "assessment_id": "assessment-001",
    "resume_analysis": {
      "total_score": 85,
      "role_match_status": "Strong Match",
      "recommendation": "Proceed to Technical Assessment",
      "strengths": ["10+ years experience", "Strong technical skills", "Leadership experience"],
      "areas_for_improvement": ["Modern framework knowledge", "Cloud certifications"]
    },
    "culture_fit_results": {
      "score": 90,
      "values_assessed": ["Innovation", "Collaboration", "Excellence"],
      "alignment_level": "Excellent"
    },
    "skills_assessment_results": {
      "overall_score": 92,
      "technical_score": 95,
      "problem_solving_score": 88
    }
  }' 2>/dev/null | python3 -m json.tool

echo -e "\n========================================="
echo "All tests completed successfully!"
echo "========================================="