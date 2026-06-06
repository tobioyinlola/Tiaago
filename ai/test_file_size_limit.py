#!/usr/bin/env python3
"""
Test script to verify the file size limit implementation.
This script tests that files larger than 20MB are rejected.
"""

import os
import sys
import tempfile
import requests
from pathlib import Path

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_large_file(size_mb):
    """Create a temporary file of the specified size in MB."""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as f:
        # Write random data to reach the desired size
        f.write(os.urandom(size_mb * 1024 * 1024))
        return f.name

def test_file_size_limit():
    """Test that files larger than 20MB are rejected."""
    # Create a 25MB file (larger than our 20MB limit)
    large_file_path = create_large_file(25)
    
    try:
        # Start the FastAPI server (you need to run this separately)
        # Then test the file upload endpoint
        url = "http://localhost:8000/api/v1/analyze-resume"
        
        with open(large_file_path, 'rb') as f:
            files = {'resume_file': ('large_file.txt', f, 'text/plain')}
            params = {'job_description': 'Test job description'}
            
            print(f"Uploading 25MB file to test size limit...")
            response = requests.post(url, files=files, params=params)
            
            if response.status_code == 413:
                print("✅ SUCCESS: Large file was correctly rejected with status 413")
                print(f"Response: {response.json()}")
                return True
            else:
                print(f"❌ FAILURE: Expected status 413 but got {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
    except requests.exceptions.ConnectionError:
        print("⚠️  WARNING: Could not connect to the server. Make sure the FastAPI server is running on localhost:8000")
        print("You can test manually by:")
        print("1. Starting the server: python -m uvicorn app.main:app --reload")
        print("2. Running this test script again")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False
    finally:
        # Clean up the temporary file
        os.unlink(large_file_path)

def test_normal_file():
    """Test that normal-sized files are still accepted."""
    # Create a small 1KB file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as f:
        f.write(b"This is a small test file for resume upload.")
        small_file_path = f.name
    
    try:
        url = "http://localhost:8000/api/v1/analyze-resume"
        
        with open(small_file_path, 'rb') as f:
            files = {'resume_file': ('small_file.txt', f, 'text/plain')}
            params = {'job_description': 'Test job description for a software developer position'}
            
            print(f"\nUploading small file to verify normal operation...")
            response = requests.post(url, files=files, params=params)
            
            if response.status_code == 200:
                print("✅ SUCCESS: Small file was accepted")
                return True
            else:
                print(f"❌ FAILURE: Small file was rejected with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
    except requests.exceptions.ConnectionError:
        print("⚠️  WARNING: Could not connect to the server")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False
    finally:
        # Clean up the temporary file
        os.unlink(small_file_path)

if __name__ == "__main__":
    print("Testing file size limit implementation...")
    print("=" * 50)
    
    # Test large file rejection
    large_file_test = test_file_size_limit()
    
    # Test small file acceptance
    small_file_test = test_normal_file()
    
    print("\n" + "=" * 50)
    print("Test Results:")
    print(f"Large file rejection: {'PASS' if large_file_test else 'FAIL'}")
    print(f"Small file acceptance: {'PASS' if small_file_test else 'FAIL'}")
    
    if large_file_test and small_file_test:
        print("\n✅ All tests passed! File size limit is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        sys.exit(1)