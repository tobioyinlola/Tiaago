# skill_assessment/filters.py
import django_filters
from skill_assessment.models import GeneralSkillAssessment


class GeneralSkillAssessmentFilter(django_filters.FilterSet):
    """
    Filters for GeneralSkillAssessment.
    Allows filtering by title, difficulty and date ranges.
    """

    created_at_after = django_filters.DateFilter(
        field_name="created_at", lookup_expr="gte"
    )
    created_at_before = django_filters.DateFilter(
        field_name="created_at", lookup_expr="lte"
    )
    title = django_filters.CharFilter(field_name="title", lookup_expr="icontains")
    difficulty_level = django_filters.ChoiceFilter(
        field_name="difficulty_level",
        lookup_expr="exact",
    )
    class Meta:
        model = GeneralSkillAssessment
        fields =['created_at_after', 'created_at_before', 'title', 'difficulty_level']
