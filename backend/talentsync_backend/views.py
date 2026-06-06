from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
import os
from create_user.tasks import ping_task
from django.shortcuts import render


@require_GET
@csrf_exempt
def health_check(request):
    """Simple health check endpoint that doesn't require database"""
    return JsonResponse({
        "status": "healthy",
        "message": "Django application is running successfully!",
        "environment": os.environ.get('ENV', 'development'),
        "debug": os.environ.get('DEBUG', 'True'),
        "database": "PostgreSQL",
        "timestamp": "2025-08-31"
    })

@require_GET
@csrf_exempt
def test_endpoint(request):
    """Test endpoint to verify Django is working"""
    return JsonResponse({
        "success": True,
        "data": "Hello from Tiaago Backend!",
        "version": "1.0.0-production"
    })

@require_GET
@csrf_exempt
def media_debug(request):
    """Debug endpoint for media files"""
    media_root = os.environ.get('MEDIA_ROOT', '/app/media')
    static_root = os.environ.get('STATIC_ROOT', '/app/staticfiles')

    return JsonResponse({
        "media_debug": True,
        "media_root": media_root,
        "static_root": static_root,
        "media_exists": os.path.exists(media_root),
        "static_exists": os.path.exists(static_root),
        "working_directory": os.getcwd()
    })
    
def test_ping(request):
    task = ping_task.delay()   
    return JsonResponse({"task_id": task.id})

#used to test sentry error logs
def trigger_error(request):
    division_by_zero = 1 / 0
    
def ws_test(request):
    return render(request, "ws_test.html")