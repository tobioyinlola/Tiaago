from django.urls import path

from . import views

urlpatterns = [
    path("permissions/", views.StaffPermissionListAPIView.as_view(), name="staff-permissions-list"),
    path("roles/", views.StaffRoleListCreateAPIView.as_view(), name="staff-roles-list-create"),
    path("roles/<uuid:pk>/", views.StaffRoleDetailAPIView.as_view(), name="staff-roles-detail"),
    path("members/", views.StaffMemberListAPIView.as_view(), name="staff-members-list"),
    path("members/<int:pk>/", views.StaffMemberDetailAPIView.as_view(), name="staff-members-detail"),
    path("members/<int:pk>/deactivate/", views.StaffDeactivateAPIView.as_view(), name="staff-members-deactivate"),
    path("members/<int:pk>/activate/", views.StaffActivateAPIView.as_view(), name="staff-members-activate"),
    path("members/<int:pk>/role/", views.StaffRoleChangeAPIView.as_view(), name="staff-members-role-change"),
    path("invite/", views.StaffInviteCreateAPIView.as_view(), name="staff-invite-create"),
    path("activity-log/", views.StaffActivityLogListAPIView.as_view(), name="staff-activity-log"),
]
