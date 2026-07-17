from rest_framework import serializers

from create_user.models import CustomUser
from staff.models import StaffActivityLog, StaffPermission, StaffRole


class StaffPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffPermission
        fields = ("id", "slug", "name", "group", "description")


class StaffRoleSlimSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffRole
        fields = ("id", "name", "slug")


class StaffRoleSerializer(serializers.ModelSerializer):
    permissions = StaffPermissionSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = StaffRole
        fields = (
            "id", "name", "slug", "description", "is_system_role",
            "permissions", "member_count", "permission_count",
            "created_at", "updated_at",
        )

    def get_member_count(self, obj):
        return obj.staff_members.count()

    def get_permission_count(self, obj):
        return obj.permissions.count()


class StaffRoleWriteSerializer(serializers.ModelSerializer):
    # Permission slugs use dots as separators (e.g. "revenue.manage"), unlike
    # Django's SlugField (letters/numbers/underscore/hyphen only, no dots) --
    # a plain CharField validated against the DB in validate() below instead.
    permission_slugs = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)

    class Meta:
        model = StaffRole
        fields = ("id", "name", "description", "permission_slugs")

    def validate(self, attrs):
        permission_slugs = attrs.get("permission_slugs")
        if permission_slugs is not None:
            found = set(
                StaffPermission.objects.filter(slug__in=permission_slugs).values_list("slug", flat=True)
            )
            missing = set(permission_slugs) - found
            if missing:
                raise serializers.ValidationError({"permission_slugs": f"Unknown permission slug(s): {', '.join(sorted(missing))}"})

            # A staff.roles.manage holder must not be able to grant a role
            # (including one they're themselves assigned to) permissions
            # they don't already hold -- otherwise staff.roles.manage alone
            # is a full privilege-escalation primitive.
            from staff.permissions import get_staff_permissions, is_super_admin

            request = self.context.get("request")
            actor = getattr(request, "user", None)
            if actor and not is_super_admin(actor):
                actor_perms = get_staff_permissions(actor)
                ungranted = set(permission_slugs) - actor_perms
                if ungranted:
                    raise serializers.ValidationError(
                        {"permission_slugs": f"You cannot grant permission(s) you don't hold: {', '.join(sorted(ungranted))}"}
                    )
        return attrs

    def create(self, validated_data):
        permission_slugs = validated_data.pop("permission_slugs", [])
        role = StaffRole.objects.create(**validated_data)
        if permission_slugs:
            perms = StaffPermission.objects.filter(slug__in=permission_slugs)
            role.permissions.set(perms)
        return role

    def update(self, instance, validated_data):
        permission_slugs = validated_data.pop("permission_slugs", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if permission_slugs is not None:
            perms = StaffPermission.objects.filter(slug__in=permission_slugs)
            instance.permissions.set(perms)
        return instance


class StaffMemberListSerializer(serializers.ModelSerializer):
    staff_role = StaffRoleSlimSerializer(read_only=True)
    status = serializers.SerializerMethodField()
    invited_by_admin = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            "id", "email", "first_name", "last_name", "staff_role", "status",
            "last_login", "invited_by_admin", "invited_at", "created",
        )

    def get_status(self, obj):
        if not obj.is_active:
            return "INACTIVE"
        if obj.last_login is None:
            return "PENDING"
        return "ACTIVE"

    def get_invited_by_admin(self, obj):
        if not obj.invited_by_admin:
            return None
        return {
            "id": obj.invited_by_admin.id,
            "name": obj.invited_by_admin.get_full_name() or obj.invited_by_admin.email,
        }


class StaffMemberDetailSerializer(StaffMemberListSerializer):
    class Meta(StaffMemberListSerializer.Meta):
        pass


class StaffInviteCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role_slug = serializers.SlugField()

    def validate_email(self, value):
        value = value.strip().lower()
        existing = CustomUser.objects.filter(email__iexact=value).first()
        if existing:
            raise serializers.ValidationError("An account already exists for this email.")
        return value

    def validate_role_slug(self, value):
        role = StaffRole.objects.filter(slug=value).first()
        if not role:
            raise serializers.ValidationError("Unknown role.")
        return value


class StaffRoleChangeSerializer(serializers.Serializer):
    role_slug = serializers.SlugField()

    def validate_role_slug(self, value):
        role = StaffRole.objects.filter(slug=value).first()
        if not role:
            raise serializers.ValidationError("Unknown role.")
        return value


class StaffActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffActivityLog
        fields = ("id", "actor", "actor_name", "action", "target_type", "target_id", "metadata", "created_at")

    def get_actor_name(self, obj):
        if not obj.actor:
            return None
        return obj.actor.get_full_name() or obj.actor.email
