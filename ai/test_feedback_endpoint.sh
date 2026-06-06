#!/bin/bash

# Sample curl request for testing the generate overall feedback endpoint

# Test with full data (all assessment components)
echo "Testing generate-overall-feedback endpoint with complete assessment data..."
curl -X POST "http://localhost:8000/generate-overall-feedback" \
  -H "Content-Type: application/json" \
  -d @sample_feedback_request.json | python -m json.tool

# Alternative: Test with inline minimal data
echo -e "\n\nTesting with minimal inline data..."
curl -X POST "http://localhost:8000/generate-overall-feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": "test-candidate-123",
    "resume_analysis": {
      "total_score": 75,
      "role_match_status": "Good Match",
      "recommendation": "Proceed to Assessment",
      "strengths": ["Python experience", "API development"],
      "areas_for_improvement": ["Limited cloud experience"]
    }
  }' | python -m json.tool

# Test with empty request (should return default/sample response)
echo -e "\n\nTesting with empty request (default response)..."
curl -X POST "http://localhost:8000/generate-overall-feedback" \
  -H "Content-Type: application/json" \
  -d '{}' | python -m json.tool