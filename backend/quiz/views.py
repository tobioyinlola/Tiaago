from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView
)
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND,
    HTTP_405_METHOD_NOT_ALLOWED
)
from skill_assessment.models import SkillAssessment
from subscriptions.permissions import IsTalentUser, IsTalentOrStaffUser
from base.mixins.pagination import TiaagoPagination
from .models import (
    Answer,
    Question,
    Quiz,
    QuizTaker,
)
from .models import Response as QuestionResponse

from .serializers import (
    QuestionSerializer,
    QuestionCreateSerializer,
    QuestionListSerializer,
    QuizSerializer,
    QuizAttemptsListSerializer,
    AttemptQuestionInitializeSerializer,
    AttemptQuestionSerializer
)

class QuizListCreateView(ListCreateAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsAdminUser]

class MyQuizListView(ListAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsTalentUser]

    def get_queryset(self):
        user = self.request.user
        try:
            queryset = Quiz.objects.filter(roles__id=user.profile.role.id)
        except AttributeError:
            # The talent has no associated role
            return []
        return queryset

class QuizDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsAdminUser]
    lookup_field = "slug"


class QuestionListCreateViewForQuizDetail(ListCreateAPIView):
    queryset = Question.objects.all()
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return QuestionCreateSerializer
        else:
            return QuestionListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        try:
            quiz = Quiz.objects.get(slug=kwargs.get('quiz_slug'))
        except Quiz.DoesNotExist:
            return Response({"detail": "not found"}, status=HTTP_404_NOT_FOUND)
        question_list_by_quiz = queryset.filter(quiz=quiz)
        serializer = self.get_serializer(question_list_by_quiz, many=True)
        return Response(serializer.data)

    def create(self, *args, **kwargs):
        serializer = self.get_serializer(data=self.request.data)
        serializer.is_valid(raise_exception=True)

        try:
            quiz = Quiz.objects.get(slug=kwargs.get('quiz_slug'))
        except Quiz.DoesNotExist:
            return Response({"detail": "not found"}, status=HTTP_404_NOT_FOUND)

        instance = serializer.save(quiz=quiz) # save the question and associated options

        serializer = QuestionListSerializer(instance)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, headers=headers, status=HTTP_201_CREATED)

class QuestionDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Question.objects.all()
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        print(self.request.method)
        if self.request.method == "GET":
            return QuestionListSerializer
        return QuestionCreateSerializer

    def put(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)

        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        serializer = QuestionListSerializer(instance)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        return Response({"detail": "Invalid method request"}, status=HTTP_405_METHOD_NOT_ALLOWED)

class AttemptQuestionInitializeView(CreateAPIView):
    serializer_class = AttemptQuestionInitializeSerializer
    permission_classes = [IsTalentUser]
    queryset = QuizTaker.objects.all()

    def get_last_attempt(self):
        talent = self.request.user.profile
        return talent.quiz_takers.last()

    def perform_create(self, serializer, quiz):
        quiz_taker = serializer.save(
            talent=self.request.user.profile,
            quiz=quiz
        )
        # create a corresponding skill assesment
        SkillAssessment.objects.create(
            quiz_taken=quiz_taker,
            talent=self.request.user.profile,
            expired=timezone.now() + timezone.timedelta(days=90)
        )

    def create(self, request, *args, **kwargs):
        try:
            quiz = Quiz.answerable.get(slug=self.kwargs.get('quiz_slug'))
        except Quiz.DoesNotExist:
            return Response({"detail": "Not Found"}, status=HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if self.get_last_attempt():
            if (timezone.now().date() - self.get_last_attempt().timestamp.date()).days < 14:
                return Response(
                    {"detail": "Last quiz attempt less than the required days"}, 
                    status=HTTP_400_BAD_REQUEST
                )
        self.perform_create(serializer, quiz)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=HTTP_201_CREATED, headers=headers)


class AttemptQuestionView(CreateAPIView):
    serializer_class = AttemptQuestionSerializer
    permission_classes = [IsTalentUser]
    queryset = QuestionResponse.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quiztaker = serializer.validated_data['quiztaker']
        question = serializer.validated_data['question']
        answer = serializer.validated_data.get('answer', None)
        completed = serializer.validated_data.pop('completed')
        if quiztaker.completed:
            return Response({"detail": "quiz is completed"}, status=HTTP_400_BAD_REQUEST)
        if quiztaker.quiz not in question.quiz.all():
            return Response({"detail": "Question not in the quiz being attempted"})
        if request.user.profile != quiztaker.talent:
            return Response({"detail": "quiz not initiated for user"}, status=HTTP_400_BAD_REQUEST)
        query = QuestionResponse.objects.filter(quiztaker=quiztaker, question=question)
        if len(query) > 0: # has an answer been recorded before?
            return Response({"detail": "answer already recorded for the question"}, status=HTTP_400_BAD_REQUEST)
        if answer: # if an answer is sent
            if not answer in question.answers.all():
                return Response({"detail": "Invalid answer sent for question"})
        self.perform_create(serializer)
        quiztaker.completed = completed
        quiztaker.save()
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=HTTP_201_CREATED, headers=headers)

class QuizAttemptsListView(ListAPIView):
    serializer_class = QuizAttemptsListSerializer
    queryset = QuizTaker.objects.all()
    permission_classes = [IsTalentOrStaffUser]
    pagination_class = TiaagoPagination

    def list(self, request, *args, **kwargs):
        if request.user.user_type == get_user_model().USER_TYPE.STAFF:
            return super().list(request, *args, **kwargs)

        queryset = self.get_queryset().filter(talent=request.user.profile)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)