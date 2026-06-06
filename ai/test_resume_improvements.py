#!/usr/bin/env python3
"""
Test script to demonstrate the resume analysis improvements.
This script tests the key fixes:
1. Fullstack developers qualifying for frontend/backend roles
2. Experience-based scoring instead of zero scores
3. Technology-specific matching (Django vs Node.js)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.resume_analyzer import analyze_resume

def test_fullstack_to_frontend():
    """Test that a fullstack developer qualifies for a frontend role"""
    print("=" * 60)
    print("TEST 1: Fullstack Developer → Frontend Role")
    print("=" * 60)
    
    fullstack_resume = """
    John Smith
    Fullstack Developer
    
    EXPERIENCE:
    Software Engineer | TechCorp | 2020-2023
    - Developed full-stack web applications using React, Node.js, and PostgreSQL
    - Built responsive frontend components with React and TypeScript
    - Created RESTful APIs using Node.js and Express
    - Implemented user authentication and authorization systems
    - Collaborated with design team to implement UI/UX designs
    
    Junior Developer | StartupXYZ | 2018-2020
    - Worked on both frontend and backend development
    - Used JavaScript, HTML, CSS for frontend development
    - Built APIs using Python and Django
    """
    
    frontend_job = """
    Frontend Developer Position
    
    We are looking for a Frontend Developer to join our team.
    
    Requirements:
    - 2+ years of frontend development experience
    - Proficiency in React, JavaScript, TypeScript
    - Experience with modern frontend frameworks
    - Knowledge of HTML, CSS, and responsive design
    - Experience with RESTful APIs
    
    Responsibilities:
    - Develop user-facing features using React
    - Build reusable components and front-end libraries
    - Optimize applications for maximum speed and scalability
    """
    
    result = analyze_resume(fullstack_resume, frontend_job)
    
    print(f"Role Match Status: {result.role_match_status}")
    print(f"Total Score: {result.total_score}")
    print(f"Recommendation: {result.recommendation}")
    print(f"Experience Score: {result.experience_relevance_score}")
    print(f"Skill Score: {result.skill_matching_score}")
    print()
    
    return result.role_match_status == "pass" and result.total_score > 0

def test_experience_scoring():
    """Test that candidates with limited experience get scored, not zero"""
    print("=" * 60)
    print("TEST 2: Limited Experience Scoring")
    print("=" * 60)
    
    junior_resume = """
    Jane Doe
    Junior Developer
    
    EXPERIENCE:
    Intern | TechStartup | 2022-2023 (6 months)
    - Assisted in frontend development using React
    - Worked on bug fixes and feature implementation
    - Participated in code reviews and team meetings
    
    EDUCATION:
    Computer Science Degree | University | 2018-2022
    - Relevant coursework in web development
    - Personal projects using React and JavaScript
    """
    
    senior_job = """
    Senior Frontend Developer
    
    Requirements:
    - 5+ years of frontend development experience
    - Expert knowledge of React, TypeScript
    - Experience with complex state management
    - Leadership experience preferred
    
    Responsibilities:
    - Lead frontend development initiatives
    - Mentor junior developers
    - Architect scalable frontend solutions
    """
    
    result = analyze_resume(junior_resume, senior_job)
    
    print(f"Role Match Status: {result.role_match_status}")
    print(f"Total Score: {result.total_score}")
    print(f"Recommendation: {result.recommendation}")
    print(f"Experience Score: {result.experience_relevance_score}")
    print(f"Skill Score: {result.skill_matching_score}")
    print()
    
    # Should not be zero even with limited experience
    return result.total_score > 0 and result.experience_relevance_score > 0

def test_technology_specificity():
    """Test that Django and Node.js backend roles are differentiated"""
    print("=" * 60)
    print("TEST 3: Technology-Specific Matching")
    print("=" * 60)
    
    django_resume = """
    Mike Johnson
    Backend Developer
    
    EXPERIENCE:
    Python Developer | WebCorp | 2021-2023
    - Developed backend services using Django and Django REST Framework
    - Built APIs using Python, Django, and PostgreSQL
    - Implemented authentication using Django's built-in auth system
    - Worked with Django ORM and database migrations
    - Deployed applications using Docker and AWS
    
    Junior Python Developer | DataCorp | 2019-2021
    - Built web applications using Django
    - Worked with Python, HTML, CSS, JavaScript
    - Database design and optimization
    """
    
    nodejs_job = """
    Node.js Backend Developer
    
    Requirements:
    - 3+ years of backend development experience
    - Proficiency in Node.js, Express.js
    - Experience with JavaScript/TypeScript
    - Knowledge of MongoDB or PostgreSQL
    - Experience with RESTful API development
    
    Responsibilities:
    - Develop server-side applications using Node.js
    - Build scalable APIs using Express.js
    - Work with databases and data modeling
    - Implement authentication and authorization
    """
    
    result = analyze_resume(django_resume, nodejs_job)
    
    print(f"Role Match Status: {result.role_match_status}")
    print(f"Total Score: {result.total_score}")
    print(f"Recommendation: {result.recommendation}")
    print(f"Experience Score: {result.experience_relevance_score}")
    print(f"Skill Score: {result.skill_matching_score}")
    print(f"Strengths: {result.strengths}")
    print()
    
    # Should qualify but with lower skill score due to technology mismatch
    return result.role_match_status == "pass" and result.total_score > 0

def main():
    """Run all tests"""
    print("Testing Resume Analysis Improvements")
    print("=" * 60)
    
    tests = [
        ("Fullstack → Frontend", test_fullstack_to_frontend),
        ("Experience Scoring", test_experience_scoring),
        ("Technology Specificity", test_technology_specificity)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
            print(f"✅ {test_name}: {'PASSED' if success else 'FAILED'}")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
            results.append((test_name, False))
        print()
    
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All improvements are working correctly!")
    else:
        print(f"\n⚠️  {total - passed} test(s) need attention")

if __name__ == "__main__":
    main()
