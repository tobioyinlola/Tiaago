#!/usr/bin/env python3
"""
Test script to demonstrate the assessment generation improvements.
This script tests the key fixes:
1. Question uniqueness prevention
2. Improved difficulty levels (no cheap/easy questions)
3. Better anti-duplication measures
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.assessment_service import assess_candidate, create_non_technical_assessment

def test_question_uniqueness():
    """Test that questions are unique and don't repeat"""
    print("=" * 60)
    print("TEST 1: Question Uniqueness Prevention")
    print("=" * 60)
    
    job_description = """
    Senior Product Manager Position
    
    We are looking for a Senior Product Manager to lead our product strategy.
    
    Requirements:
    - 5+ years of product management experience
    - Experience with agile methodologies
    - Strong analytical and strategic thinking skills
    - Experience with user research and data analysis
    - Leadership experience with cross-functional teams
    
    Responsibilities:
    - Define product strategy and roadmap
    - Lead cross-functional product teams
    - Conduct user research and market analysis
    - Manage stakeholder relationships
    - Drive product metrics and KPIs
    """
    
    try:
        result = assess_candidate(job_description, "mcq", 10, "non-technical")
        
        print(f"Assessment Type: {result.assessment_type}")
        print(f"Difficulty: {result.ai_determined_difficulty}")
        print(f"Role Type: {result.role_type}")
        print(f"Skills Assessed: {result.skills_assessed}")
        print(f"Number of Questions: {len(result.questions)}")
        
        # Check for uniqueness
        questions = [q.question for q in result.questions]
        unique_questions = set(questions)
        
        print(f"\nUniqueness Check:")
        print(f"Total questions: {len(questions)}")
        print(f"Unique questions: {len(unique_questions)}")
        print(f"Duplicates found: {len(questions) - len(unique_questions)}")
        
        # Show first few questions to verify quality
        print(f"\nSample Questions:")
        for i, question in enumerate(result.questions[:3]):
            print(f"{i+1}. {question.question[:100]}...")
        
        return len(unique_questions) == len(questions) and len(questions) > 0
        
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_difficulty_levels():
    """Test that questions are appropriately challenging"""
    print("=" * 60)
    print("TEST 2: Difficulty Level Assessment")
    print("=" * 60)
    
    job_description = """
    Junior Software Engineer Position
    
    We are looking for a Junior Software Engineer to join our development team.
    
    Requirements:
    - 1-2 years of software development experience
    - Proficiency in Python and JavaScript
    - Experience with web development frameworks
    - Knowledge of databases and APIs
    - Strong problem-solving skills
    
    Responsibilities:
    - Develop web applications using Python and JavaScript
    - Write clean, maintainable code
    - Collaborate with senior developers
    - Participate in code reviews
    - Debug and fix issues
    """
    
    try:
        result = assess_candidate(job_description, "mcq", 8, "technical")
        
        print(f"Assessment Type: {result.assessment_type}")
        print(f"Difficulty: {result.ai_determined_difficulty}")
        print(f"Role Type: {result.role_type}")
        print(f"Skills Assessed: {result.skills_assessed}")
        print(f"Number of Questions: {len(result.questions)}")
        
        # Check difficulty appropriateness
        print(f"\nDifficulty Analysis:")
        print(f"Expected difficulty for junior role: intermediate or higher")
        print(f"Actual difficulty: {result.ai_determined_difficulty}")
        
        # Show sample questions to verify they're challenging
        print(f"\nSample Questions (checking for complexity):")
        for i, question in enumerate(result.questions[:3]):
            print(f"{i+1}. {question.question[:120]}...")
            print(f"   Options: {len(question.answers)} choices")
        
        # Should be intermediate or higher even for junior roles
        appropriate_difficulty = result.ai_determined_difficulty in ["intermediate", "advanced", "senior"]
        return appropriate_difficulty and len(result.questions) > 0
        
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_large_assessment_uniqueness():
    """Test uniqueness in large assessments with batch generation"""
    print("=" * 60)
    print("TEST 3: Large Assessment Uniqueness")
    print("=" * 60)
    
    job_description = """
    Product Manager - E-commerce Platform
    
    We are seeking an experienced Product Manager to lead our e-commerce platform development.
    
    Requirements:
    - 4+ years of product management experience
    - Experience with e-commerce platforms and marketplaces
    - Strong data analysis and metrics-driven decision making
    - Experience with user experience design and research
    - Knowledge of agile development methodologies
    - Experience with A/B testing and experimentation
    
    Responsibilities:
    - Define product roadmap for e-commerce features
    - Lead cross-functional teams including engineering, design, and marketing
    - Analyze user behavior and market trends
    - Manage product backlog and prioritize features
    - Drive conversion optimization and user engagement
    - Collaborate with stakeholders across the organization
    """
    
    try:
        # Test with larger assessment to trigger batch generation
        result = create_non_technical_assessment(job_description, 30)
        
        print(f"Assessment Type: {result.assessment_type}")
        print(f"Difficulty: {result.ai_determined_difficulty}")
        print(f"Role Type: {result.role_type}")
        print(f"Skills Assessed: {result.skills_assessed}")
        print(f"Number of Questions: {len(result.questions)}")
        
        # Check for uniqueness across all questions
        questions = [q.question for q in result.questions]
        unique_questions = set(questions)
        
        print(f"\nUniqueness Check:")
        print(f"Total questions: {len(questions)}")
        print(f"Unique questions: {len(unique_questions)}")
        print(f"Duplicates found: {len(questions) - len(unique_questions)}")
        
        # Check for variety in question topics
        topics = []
        for q in result.questions:
            # Extract key topics from questions
            question_lower = q.question.lower()
            if 'stakeholder' in question_lower or 'team' in question_lower:
                topics.append('stakeholder_management')
            elif 'data' in question_lower or 'analytics' in question_lower:
                topics.append('data_analysis')
            elif 'user' in question_lower or 'customer' in question_lower:
                topics.append('user_research')
            elif 'agile' in question_lower or 'sprint' in question_lower:
                topics.append('agile_methodology')
            elif 'strategy' in question_lower or 'roadmap' in question_lower:
                topics.append('strategy')
            else:
                topics.append('other')
        
        unique_topics = set(topics)
        print(f"\nTopic Variety:")
        print(f"Unique topics covered: {len(unique_topics)}")
        print(f"Topic distribution: {dict((topic, topics.count(topic)) for topic in unique_topics)}")
        
        # Should have high uniqueness and good topic variety
        high_uniqueness = len(unique_questions) >= len(questions) * 0.95  # 95% uniqueness
        good_variety = len(unique_topics) >= 4  # At least 4 different topics
        
        return high_uniqueness and good_variety and len(result.questions) > 0
        
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing Assessment Generation Improvements")
    print("=" * 60)
    
    tests = [
        ("Question Uniqueness", test_question_uniqueness),
        ("Difficulty Levels", test_difficulty_levels),
        ("Large Assessment Uniqueness", test_large_assessment_uniqueness)
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
        print("\n🎉 All assessment improvements are working correctly!")
        print("✅ Questions are unique and non-repetitive")
        print("✅ Difficulty levels are appropriately challenging")
        print("✅ Large assessments maintain uniqueness across batches")
    else:
        print(f"\n⚠️  {total - passed} test(s) need attention")

if __name__ == "__main__":
    main()
