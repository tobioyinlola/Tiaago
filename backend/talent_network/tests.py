"""Talent Network join-form tests.

Covers the free-text role: picking "Other" in Interested Roles used to
record a member whose actual role we had no way to learn.
"""

from django.test import TestCase

from .serializers import TalentNetworkJoinSerializer


def _payload(**overrides):
    data = {
        "first_name": "Ada",
        "last_name": "Obi",
        "email": "ada@example.com",
        "country": "Nigeria",
        "job_title": "Technical Writer",
        "years_experience": "2-5",
        "industry": ["SAAS"],
        "interested_roles": ["ENGINEERING"],
        "preferred_work_type": "REMOTE",
        "consent": True,
    }
    data.update(overrides)
    return data


class OtherRoleValidationTests(TestCase):
    def test_other_role_required_when_other_selected(self):
        serializer = TalentNetworkJoinSerializer(data=_payload(interested_roles=["OTHER"]))

        self.assertFalse(serializer.is_valid())
        self.assertIn("other_role", serializer.errors)

    def test_blank_other_role_is_not_enough(self):
        """Whitespace is not a role."""
        serializer = TalentNetworkJoinSerializer(
            data=_payload(interested_roles=["OTHER"], other_role="   ")
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("other_role", serializer.errors)

    def test_other_role_saved_when_other_selected(self):
        serializer = TalentNetworkJoinSerializer(
            data=_payload(interested_roles=["OTHER"], other_role="  Technical Writer  ")
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        member = serializer.save()
        self.assertEqual(member.other_role, "Technical Writer")

    def test_other_role_allowed_alongside_listed_roles(self):
        serializer = TalentNetworkJoinSerializer(
            data=_payload(interested_roles=["ENGINEERING", "OTHER"], other_role="Technical Writer")
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.save().other_role, "Technical Writer")

    def test_other_role_ignored_when_other_not_selected(self):
        """No stale free text on a member who never picked Other."""
        serializer = TalentNetworkJoinSerializer(
            data=_payload(interested_roles=["ENGINEERING"], other_role="Technical Writer")
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.save().other_role, "")

    def test_existing_join_without_other_role_still_valid(self):
        """The field is additive: the previous payload shape must still work."""
        serializer = TalentNetworkJoinSerializer(data=_payload())

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.save().other_role, "")
