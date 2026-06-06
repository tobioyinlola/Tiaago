from rest_framework import serializers

from .models import (
    Quiz,
    QuizTaker,
    Question,
    Answer,
    Response
)

class QuizSerializer(serializers.ModelSerializer):

    class Meta:
        model = Quiz
        fields = (
            "id", "name", "question_count", "description", "questions_on",
            "minutes", "created", "slug", "roll_out", "roles", "created", "updated"
        )
        read_only_fields = ("id", "slug",)

class QuestionSerializer(serializers.ModelSerializer):
    model = Question
    fields = (
        'id', 'name', 'question_count', 'questions_on', 'minutes', 
        'description', 'slug', 'roll_out', 'roles', 'created', 'updated'
    )
    # read_only_fields = ('slug',)


class QuestionListSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        quiz = serializers.SlugRelatedField(
        read_only=True,
        slug_field='slug',
        many=True,
    )
        model = Question
        fields = ("id", "quiz", "label", "options", "created", "updated")

    def get_options(self, obj):
        return_values = {}
        options = Answer.objects.filter(question=obj)
        for value in options:
            return_values[value.id] = value.text
        return return_values

class QuestionCreateSerializer(serializers.ModelSerializer):
    quiz = serializers.SlugRelatedField(
        read_only=True,
        slug_field='slug',
        many=True,
    )
    option_1 = serializers.CharField(max_length=255)
    option_2 = serializers.CharField(max_length=255)
    option_3 = serializers.CharField(max_length=255)
    option_4 = serializers.CharField(max_length=255)
    is_correct = serializers.ChoiceField(
        choices = ["option_1", "option_2", "option_3", "option_4"],
        required = True
    )

    class Meta:
        model = Question
        fields = (
            "id", "label", "quiz",  "option_1", "option_2", "option_3", "option_4", "is_correct"
        )
        read_only_fields = ("id", "quiz",)

    def create(self, validated_data):
        quiz = validated_data["quiz"]
        question = Question.objects.create(
            label=validated_data["label"],
        )
        quiz.question_set.add(question)
        # set the default correct options to false
        is_correct_opt1 = False
        is_correct_opt2 = False
        is_correct_opt3 = False
        is_correct_opt4 = False

        is_correct_option =  validated_data["is_correct"] # get the value of the correct option

        if is_correct_option == "option_1":
            is_correct_opt1 = True
        elif is_correct_option == "option_2":
            is_correct_opt2 = True
        elif is_correct_option == "option_3":
            is_correct_opt3 = True
        elif is_correct_option == "option_4":
            is_correct_opt4 = True

        Answer.objects.bulk_create(
            [
                Answer(question=question, text=validated_data["option_1"], is_correct=is_correct_opt1),
                Answer(question=question, text=validated_data["option_2"], is_correct=is_correct_opt2),
                Answer(question=question, text=validated_data["option_3"], is_correct=is_correct_opt3),
                Answer(question=question, text=validated_data["option_4"], is_correct=is_correct_opt4)
            ]
        )
        return question

    def update(self, instance, validated_data):

        # set the default correct options to false
        is_correct_opt1 = False
        is_correct_opt2 = False
        is_correct_opt3 = False
        is_correct_opt4 = False

        is_correct_option =  validated_data["is_correct"] # get the value of the correct option

        if is_correct_option == "option_1":
            is_correct_opt1 = True
        elif is_correct_option == "option_2":
            is_correct_opt2 = True
        elif is_correct_option == "option_3":
            is_correct_opt3 = True
        elif is_correct_option == "option_4":
            is_correct_opt4 = True

        instance.label = validated_data.get("label", instance.label)

        answers = instance.answers.all()
        # check if the associated question do not have any answer option
        if len(answers) == 0:
            Answer.objects.bulk_create(
                [
                    Answer(question=instance, text=validated_data.get("option_1", "option_1"), is_correct=is_correct_opt1),
                    Answer(question=instance, text=validated_data.get("option_2", "option_2"), is_correct=is_correct_opt2),
                    Answer(question=instance, text=validated_data.get("option_3", "option_3"), is_correct=is_correct_opt3),
                    Answer(question=instance, text=validated_data.get("option_4", "option_4"), is_correct=is_correct_opt4)
                ]
            )
        elif len(answers) == 4:
            answers[0].text = validated_data.get("option_1", answers[0].text)
            answers[0].is_correct = is_correct_opt1
            answers[1].text = validated_data.get("option_2", answers[1].text)
            answers[1].is_correct = is_correct_opt2
            answers[2].text = validated_data.get("option_3", answers[2].text)
            answers[2].is_correct = is_correct_opt3
            answers[3].text = validated_data.get("option_4", answers[3].text)
            answers[3].is_correct = is_correct_opt4

            # save the instances
            answers[0].save()
            answers[1].save()
            answers[2].save()
            answers[3].save()
        else:
            # delete all options related to the answer and create new ones
            for answer in answers:
                answer.delete()
            Answer.objects.bulk_create(
            [
                Answer(question=instance, text=validated_data.get("option_1", "option_1"), is_correct=is_correct_opt1),
                Answer(question=instance, text=validated_data.get("option_2", "option_2"), is_correct=is_correct_opt2),
                Answer(question=instance, text=validated_data.get("option_3", "option_3"), is_correct=is_correct_opt3),
                Answer(question=instance, text=validated_data.get("option_4", "option_4"), is_correct=is_correct_opt4)
            ]
        )
        instance.save()

        return instance

class AttemptQuestionInitializeSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizTaker
        fields = (
            'id', 'talent', 'quiz', 'correct_answers', 'completed', 
            'timestamp', 'created', 'updated', 'questions'
        )
        read_only_fields = ('talent', 'correct_answers', 'completed', 'quiz')

    def get_questions(self, obj):
        return QuestionListSerializer(obj.quiz.question_set.all(), many=True).data

class AttemptQuestionSerializer(serializers.ModelSerializer):
    completed = serializers.BooleanField(default=False, required=False)
    class Meta:
        model = Response
        fields = ('id', 'quiztaker', 'question', 'answer', 'completed')


class QuizAttemptsListSerializer(serializers.ModelSerializer):
    talent = serializers.StringRelatedField()
    quiz = serializers.StringRelatedField()
    no_of_questions = serializers.SerializerMethodField()

    class Meta:
        model = QuizTaker
        fields = (
            'id', 'talent', 'quiz', 'correct_answers', 'no_of_questions',
            'completed', 'timestamp', 'created', 'updated'
        )

    def get_no_of_questions(self, obj):
        return obj.quiz.question_count