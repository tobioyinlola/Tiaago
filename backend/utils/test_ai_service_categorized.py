"""Question generation: request shape, tolerant parsing, plain-text input."""
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from jobs.tasks import MAX_JOB_TEXT_FOR_AI, _plain_job_text
from utils.ai_service import AIServiceHandler


def _response(body, status=200):
    response = MagicMock()
    response.status_code = status
    response.ok = 200 <= status < 300
    response.json.return_value = body
    response.text = str(body)
    return response


def _question(answers=None, correct="Option B", text="What should you do first?"):
    return {
        "question": text,
        "answers": answers or ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
        "correct_answer": correct,
    }


class CategorizedQuestionRequestTests(SimpleTestCase):
    def test_the_description_travels_in_a_json_body_not_the_url(self):
        handler = AIServiceHandler()
        long_description = "Responsibilities and requirements. " * 3000
        with patch.object(
            handler.requests, "post",
            return_value=_response({"sections": [{"category": "Role Knowledge", "questions": [_question()]}]}),
        ) as post:
            sections = handler.get_categorized_mcq_questions(long_description, ["Role Knowledge"], 1, "non-technical")

        self.assertEqual(len(sections[0]["questions"]), 1)
        kwargs = post.call_args.kwargs
        self.assertEqual(kwargs["json"]["job_description"], long_description)
        self.assertNotIn("params", kwargs)  # nothing long in the query string
        self.assertTrue(post.call_args.args[0].endswith("/create-categorized-assessment"))

    def test_an_http_error_from_the_ai_service_returns_none_with_a_logged_reason(self):
        handler = AIServiceHandler()
        with patch.object(handler.requests, "post", return_value=_response({"detail": "boom"}, 500)):
            with self.assertLogs("ai", level="ERROR") as logs:
                self.assertIsNone(handler.get_categorized_mcq_questions("jd", ["A"], 1))
        self.assertIn("HTTP 500", logs.output[0])


class CategorizedQuestionParsingTests(SimpleTestCase):
    def _parse(self, *questions):
        handler = AIServiceHandler()
        body = {"sections": [{"category": "Role Knowledge", "questions": list(questions)}]}
        with patch.object(handler.requests, "post", return_value=_response(body)):
            return handler.get_categorized_mcq_questions("jd", ["Role Knowledge"], 10)

    def test_answer_matching_tolerates_case_spacing_punctuation_and_letters(self):
        sections = self._parse(
            _question(correct="B) Option B"),
            _question(correct="option   b."),
            _question(correct="C"),
            _question(correct="D)"),
        )
        self.assertEqual([q["correct_option_index"] for q in sections[0]["questions"]], [1, 1, 2, 3])

    def test_one_malformed_question_no_longer_discards_the_whole_assessment(self):
        sections = self._parse(
            _question(),
            _question(correct="Something that matches no option"),
            _question(answers=["only one"]),
            {"question": "", "answers": ["a", "b"], "correct_answer": "a"},
            _question(text="Another good one"),
        )
        self.assertEqual([q["question"] for q in sections[0]["questions"]], ["What should you do first?", "Another good one"])

    def test_a_category_with_no_usable_question_fails_clearly(self):
        with self.assertLogs("ai", level="ERROR"):
            self.assertIsNone(self._parse(_question(correct="matches nothing")))


class PlainJobTextTests(SimpleTestCase):
    def test_markup_is_removed_and_structure_kept(self):
        html = "<h2>About</h2><p>We hire &amp; grow.</p><ul><li>Plan routes</li><li>Safe driving</li></ul>"
        text = _plain_job_text(html)
        self.assertNotIn("<", text)
        self.assertIn("We hire & grow.", text)
        self.assertIn("Plan routes\n", text)

    def test_text_is_bounded(self):
        self.assertEqual(len(_plain_job_text("x" * (MAX_JOB_TEXT_FOR_AI * 3))), MAX_JOB_TEXT_FOR_AI)
        self.assertEqual(_plain_job_text(None), "")
