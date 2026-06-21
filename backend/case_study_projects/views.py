from rest_framework.generics import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView
)
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
)
from skill_assessment.models import SkillAssessment
from subscriptions.permissions import IsTalentUser, IsTalentOrStaffUser
from base.mixins.pagination import TiaagoPagination
from .models import (
    CaseStudyProject, 
    TalentCaseStudyProject
)
from .permissions import IsCaseStudyAttemptedByTalent
from .serializers import (
    CaseStudyProjectSerializer,
    TalentAttemptCaseStudySerializer,
    AdminApproveTalentAttemptCaseStudySerializer
)
from .tasks import talent_assessment_pass_mail


class CaseStudyProjectListCreateView(ListCreateAPIView):
    '''Admin - Endpoint to list/create case study projects'''
    serializer_class = CaseStudyProjectSerializer
    queryset = CaseStudyProject.objects.all()
    permission_classes = [IsAdminUser]


class CaseStudyProjectDetailView(RetrieveUpdateDestroyAPIView):
    '''Admin - Endpoint to update/delete or view a case study project'''
    serializer_class = CaseStudyProjectSerializer
    queryset = CaseStudyProject.objects.all()
    permission_classes = [IsAdminUser]


class TalentAttemptCaseStudyView(ListCreateAPIView):
    '''Endpoint to list/create a talent case study project'''
    serializer_class = TalentAttemptCaseStudySerializer
    queryset = TalentCaseStudyProject.objects.all()
    permission_classes = [IsTalentOrStaffUser]
    pagination_class = TiaagoPagination

    def list(self, request, *args, **kwargs):
        '''
        This method fetches all attempts for a particular case study task.\n
        If it's a talent making the request, it fetches the attempts for that talent alone\n
        If it's a staff user (Tiaago staff), it fetches all attempts.
        '''
        pk = kwargs.get('case_study_pk')
        try:
            case_study = CaseStudyProject.objects.get(pk=pk)
        except CaseStudyProject.DoesNotExist:
            return Response({"detail": "Not found"}, status=HTTP_404_NOT_FOUND)
        if request.user.is_talent():
            queryset = self.get_queryset().filter(
                talent=request.user.profile,
                project=case_study
            )
        else:
            queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        pk = kwargs.pop('case_study_pk')
        try:
            case_study = CaseStudyProject.objects.get(pk=pk)
        except CaseStudyProject.DoesNotExist:
            return Response({"detail": "Not found"}, status=HTTP_404_NOT_FOUND)

        # get the last quiz taken and if it's already associated to a skill_assessment, 
        # then tell the user to start a new quiz
        last_quiz = request.user.profile.quiz_takers.last()
        if last_quiz is not None:
            if last_quiz.skill_assessments.all():
                return Response({"detail": "Take a new quiz"}, status=HTTP_400_BAD_REQUEST)

        # get the last case study attempt of the talent
        last_case_study = TalentCaseStudyProject.objects.filter(
            project=case_study,
            talent=request.user.profile,
        ).order_by('-last_attempt')

        if len(last_case_study) > 0: # an attempt has been made before
            difference = (timezone.now() - last_case_study[0].last_attempt).days
            if difference < 14:
                # get the last attempt and check if 14 days has lapsed since last attempt
                return Response(
                    {"detail": "14 days attempt still on"}, 
                    status=HTTP_403_FORBIDDEN
                )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save(project=case_study, talent=request.user.profile)
        # get the last skill-assessment for the user and link the project
        try:
            assessment = request.user.profile.skill_assessments.last()
        except AttributeError:
            # talent has no asoociated skill-assessment
            return Response({"detail":"Take a quiz first"}, status=HTTP_400_BAD_REQUEST)
        assessment.project_taken = project
        assessment.save()
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=HTTP_201_CREATED, headers=headers)

class TalentAttemptCaseStudyDetailView(RetrieveUpdateAPIView):
    '''Endpoint to view the detail of case study project attempted by a talent'''

    serializer_class = TalentAttemptCaseStudySerializer
    queryset = CaseStudyProject.objects.all()
    permission_classes = [IsCaseStudyAttemptedByTalent]

    def get_object(self):
        case_study_pk = self.kwargs['case_study_pk']
        instance_pk = self.kwargs['pk']
        obj = get_object_or_404(
            TalentCaseStudyProject,
            pk=instance_pk,
            project__pk=case_study_pk,
        )
        self.check_object_permissions(self.request, obj)

        return obj

class TalentAttemptCaseStudyAdminView(RetrieveUpdateDestroyAPIView):
    serializer_class = AdminApproveTalentAttemptCaseStudySerializer
    queryset = TalentCaseStudyProject.objects.all()
    permission_classes = [IsAdminUser]

    def get_object(self):
        instance_pk = self.kwargs['pk']
        obj = get_object_or_404(
            TalentCaseStudyProject, 
            pk=instance_pk
        )
        self.check_object_permissions(self.request, obj)

        return obj

    def put(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        approved = serializer.validated_data.get('approved', False)
        self.perform_update(serializer)
        if approved:
            talent_assessment_pass_mail.delay(self.get_object().talent.user.id)
        return Response(serializer.data, status=HTTP_201_CREATED)

class CaseStudyProjectForMe(ListAPIView):
    '''Talent - Endpoint to view the list of case study projects the logged in user can attempt'''
    queryset = CaseStudyProject.objects.all()
    serializer_class = CaseStudyProjectSerializer
    permission_classes = [IsTalentUser]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        try:
            queryset = queryset.filter(roles__id=user.profile.role.id)
        except AttributeError:
            # The talent has no associated role
            return []
        return queryset

class AllAttemptedCaseStudyProjectForMe(ListAPIView):
    '''Talent - Endpoint to view the list of case study project attempts the logged in user has taken'''
    queryset = TalentCaseStudyProject
    serializer_class = TalentAttemptCaseStudySerializer
    permission_classes = [IsTalentUser]

    def get_queryset(self):
        queryset = TalentCaseStudyProject.objects.filter(
            talent = self.request.user.profile
        )
        return queryset

class TalentAttemptAllCaseStudyForAdmin(ListAPIView):
    '''Admin - Endpoint to view the list of all case study project attempts'''
    queryset = TalentCaseStudyProject.objects.all()
    serializer_class = TalentAttemptCaseStudySerializer
    permission_classes = [IsAdminUser]
    pagination_class = TiaagoPagination