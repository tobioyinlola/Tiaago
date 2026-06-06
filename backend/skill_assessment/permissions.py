from rest_framework import permissions

class IsCreator(permissions.BasePermission):
    
    def has_object_permission(self, request, view, obj):
        flag = False
        if request.user.is_company():
            flag = request.user.company == obj.company
        return flag

class IsTalentOwnerOrStaffUser(permissions.BasePermission):

    def has_object_permission(self, obj):
        user = self.request.user
        flag = False
        if user.is_talent():
            if user.profile == obj.talent:
                flag = True
        elif user.user_type == 'T':
            flag = True
        
        return flag