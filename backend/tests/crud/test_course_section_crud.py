"""Tests for db/crud/course_section.py."""

import pytest
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException
from api.schemas.course_section import CourseSectionCreate, CourseSectionUpdate


SECTION_ROW = {
    "course_section_id": 1,
    "course_id": 2,
    "course_crn": 30186,
    "professor_id": 3,
    "course_code": "CS3000",
    "course_name": "Algorithms",
    "subject": "CS",
    "professor_name": "Dr. Smith",
}

SECTION_SIMPLE = {"id": 1, "course_id": 2, "course_CRN": 30186, "professor_id": 3}


class TestGetAllCourseSections:
    def test_returns_list(self):
        from db.crud.course_section import get_all_course_sections

        db, cursor = make_db_mock(fetchall=[SECTION_ROW])
        result = get_all_course_sections(db)
        assert len(result) == 1

    def test_returns_empty_list(self):
        from db.crud.course_section import get_all_course_sections

        db, cursor = make_db_mock(fetchall=[])
        result = get_all_course_sections(db)
        assert result == []

    def test_raises_on_error(self):
        from db.crud.course_section import get_all_course_sections

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_all_course_sections(db)


class TestGetCourseSectionById:
    def test_returns_section(self):
        from db.crud.course_section import get_course_section_by_id

        db, cursor = make_db_mock(fetchone=SECTION_ROW)
        result = get_course_section_by_id(1, db)
        assert result == SECTION_ROW

    def test_returns_none_when_missing(self):
        from db.crud.course_section import get_course_section_by_id

        db, cursor = make_db_mock(fetchone=None)
        result = get_course_section_by_id(999, db)
        assert result is None

    def test_raises_on_error(self):
        from db.crud.course_section import get_course_section_by_id

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_course_section_by_id(1, db)


class TestGetCourseSectionByCRN:
    def test_returns_section(self):
        from db.crud.course_section import get_course_section_by_CRN

        db, cursor = make_db_mock(fetchone=SECTION_ROW)
        result = get_course_section_by_CRN(30186, db)
        assert result == SECTION_ROW

    def test_returns_none_when_missing(self):
        from db.crud.course_section import get_course_section_by_CRN

        db, cursor = make_db_mock(fetchone=None)
        result = get_course_section_by_CRN(99999, db)
        assert result is None

    def test_raises_on_error(self):
        from db.crud.course_section import get_course_section_by_CRN

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_course_section_by_CRN(30186, db)


class TestCreateCourseSection:
    def test_creates_and_returns(self):
        from db.crud.course_section import create_course_section

        db, cursor = make_db_mock(fetchone=SECTION_SIMPLE)
        data = CourseSectionCreate(course_id=2, course_CRN=30186, professor_id=3)
        result = create_course_section(data, db)
        assert result is not None
        db.commit.assert_called_once()

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.course_section import create_course_section

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        data = CourseSectionCreate(course_id=2, course_CRN=30186, professor_id=3)
        with pytest.raises(DatabaseException):
            create_course_section(data, db)
        db.rollback.assert_called()


class TestGetCourseSectionsBySubject:
    def test_returns_list(self):
        from db.crud.course_section import get_course_sections_by_subject

        db, cursor = make_db_mock(fetchall=[SECTION_ROW])
        result = get_course_sections_by_subject("CS", db)
        assert len(result) == 1
        assert result[0]["course_section_id"] == SECTION_ROW["course_section_id"]

    def test_returns_empty_when_none(self):
        from db.crud.course_section import get_course_sections_by_subject

        db, cursor = make_db_mock(fetchall=[])
        result = get_course_sections_by_subject("XYZ", db)
        assert result == []

    def test_raises_on_error(self):
        from db.crud.course_section import get_course_sections_by_subject

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_course_sections_by_subject("CS", db)


class TestUpdateCourseSection:
    def test_updates_and_returns(self):
        from db.crud.course_section import update_course_section

        db, cursor = make_db_mock(fetchone=SECTION_SIMPLE)
        data = CourseSectionUpdate(course_CRN=30187)
        result = update_course_section(1, data, db)
        assert result is not None
        db.commit.assert_called_once()

    def test_no_fields_returns_current(self):
        from db.crud.course_section import update_course_section

        db, cursor = make_db_mock(fetchone=SECTION_ROW)
        data = CourseSectionUpdate()
        result = update_course_section(1, data, db)
        assert result is not None

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.course_section import update_course_section

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        data = CourseSectionUpdate(course_CRN=99)
        with pytest.raises(DatabaseException):
            update_course_section(1, data, db)
        db.rollback.assert_called()


class TestDeleteCourseSection:
    def test_returns_true(self):
        from db.crud.course_section import delete_course_section

        db, cursor = make_db_mock(rowcount=1)
        result = delete_course_section(1, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.course_section import delete_course_section

        db, cursor = make_db_mock(rowcount=0)
        result = delete_course_section(999, db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.course_section import delete_course_section

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            delete_course_section(1, db)
        db.rollback.assert_called()


class TestGetCourseSectionsForUser:
    def test_returns_list(self):
        from db.crud.course_section import get_course_sections_for_user

        db, cursor = make_db_mock(fetchall=[SECTION_ROW])
        result = get_course_sections_for_user(1, db)
        assert len(result) == 1

    def test_returns_empty_when_none(self):
        from db.crud.course_section import get_course_sections_for_user

        db, cursor = make_db_mock(fetchall=[])
        result = get_course_sections_for_user(999, db)
        assert result == []

    def test_raises_on_error(self):
        from db.crud.course_section import get_course_sections_for_user

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_course_sections_for_user(1, db)


class TestEnrollUser:
    def test_enrolls_new_user(self):
        from db.crud.course_section import enroll_user_in_course_section

        db, cursor = make_db_mock(fetchone=None)
        result = enroll_user_in_course_section(1, 2, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_already_enrolled(self):
        from db.crud.course_section import enroll_user_in_course_section

        db, cursor = make_db_mock(fetchone=(1,))
        result = enroll_user_in_course_section(1, 2, db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.course_section import enroll_user_in_course_section

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            enroll_user_in_course_section(1, 2, db)
        db.rollback.assert_called()


class TestUnenrollUser:
    def test_returns_true_when_removed(self):
        from db.crud.course_section import unenroll_user_from_course_section

        db, cursor = make_db_mock(rowcount=1)
        result = unenroll_user_from_course_section(1, 2, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.course_section import unenroll_user_from_course_section

        db, cursor = make_db_mock(rowcount=0)
        result = unenroll_user_from_course_section(1, 999, db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.course_section import unenroll_user_from_course_section

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            unenroll_user_from_course_section(1, 2, db)
        db.rollback.assert_called()


class TestCheckCrnExists:
    def test_returns_true_when_exists(self):
        from db.crud.course_section import check_crn_exists

        db, cursor = make_db_mock(fetchone=(True,))
        result = check_crn_exists(30186, db)
        assert result is True

    def test_returns_false_when_not_exists(self):
        from db.crud.course_section import check_crn_exists

        db, cursor = make_db_mock(fetchone=(False,))
        result = check_crn_exists(99999, db)
        assert result is False

    def test_raises_on_error(self):
        from db.crud.course_section import check_crn_exists

        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            check_crn_exists(30186, db)
