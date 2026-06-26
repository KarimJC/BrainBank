"""Tests for db/crud/course.py."""
import pytest
from tests.conftest import make_db_mock
from core.exceptions import DatabaseException
from api.schemas.courses import CourseCreate, CourseUpdate


COURSE_ROW = {"id": 1, "course": "CS3000", "title": "Algorithms", "subject": "CS"}


class TestCreateCourse:
    def test_creates_and_returns_dict(self):
        from db.crud.course import create_course
        db, cursor = make_db_mock(fetchone=COURSE_ROW)
        data = CourseCreate(course="CS3000", title="Algorithms", subject="CS")
        result = create_course(data, db)
        assert result == COURSE_ROW
        db.commit.assert_called_once()

    def test_execute_called_with_insert(self):
        from db.crud.course import create_course
        db, cursor = make_db_mock(fetchone=COURSE_ROW)
        data = CourseCreate(course="CS3000", title="Algorithms", subject="CS")
        create_course(data, db)
        sql = cursor.execute.call_args[0][0]
        assert "INSERT INTO course" in sql

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.course import create_course
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("db fail")
        data = CourseCreate(course="CS3000", title="Algorithms", subject="CS")
        with pytest.raises(DatabaseException):
            create_course(data, db)
        db.rollback.assert_called()


class TestGetCourseById:
    def test_returns_course(self):
        from db.crud.course import get_course_by_id
        db, cursor = make_db_mock(fetchone=COURSE_ROW)
        result = get_course_by_id(1, db)
        assert result == COURSE_ROW

    def test_returns_none_when_missing(self):
        from db.crud.course import get_course_by_id
        db, cursor = make_db_mock(fetchone=None)
        result = get_course_by_id(999, db)
        assert result is None

    def test_raises_on_error(self):
        from db.crud.course import get_course_by_id
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_course_by_id(1, db)


class TestGetAllCourses:
    def test_returns_list(self):
        from db.crud.course import get_all_courses
        db, cursor = make_db_mock(fetchall=[COURSE_ROW])
        result = get_all_courses(db)
        assert len(result) == 1

    def test_returns_empty_list(self):
        from db.crud.course import get_all_courses
        db, cursor = make_db_mock(fetchall=[])
        result = get_all_courses(db)
        assert result == []

    def test_with_subject_filter(self):
        from db.crud.course import get_all_courses
        db, cursor = make_db_mock(fetchall=[COURSE_ROW])
        get_all_courses(db, subject="CS")
        sql = cursor.execute.call_args[0][0]
        assert "subject" in sql.lower()

    def test_raises_on_error(self):
        from db.crud.course import get_all_courses
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            get_all_courses(db)


class TestUpdateCourse:
    def test_updates_and_returns(self):
        from db.crud.course import update_course
        db, cursor = make_db_mock(fetchone=COURSE_ROW)
        data = CourseUpdate(course="CS4000")
        result = update_course(1, data, db)
        assert result == COURSE_ROW
        db.commit.assert_called_once()

    def test_no_fields_returns_existing(self):
        from db.crud.course import update_course
        db, cursor = make_db_mock(fetchone=COURSE_ROW)
        data = CourseUpdate()
        result = update_course(1, data, db)
        assert result is not None

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.course import update_course
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        data = CourseUpdate(course="Error")
        with pytest.raises(DatabaseException):
            update_course(1, data, db)
        db.rollback.assert_called()


class TestDeleteCourse:
    def test_returns_true_when_deleted(self):
        from db.crud.course import delete_course
        db, cursor = make_db_mock(rowcount=1)
        result = delete_course(1, db)
        assert result is True
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        from db.crud.course import delete_course
        db, cursor = make_db_mock(rowcount=0)
        result = delete_course(999, db)
        assert result is False

    def test_raises_and_rollbacks_on_error(self):
        from db.crud.course import delete_course
        db, cursor = make_db_mock()
        cursor.execute.side_effect = Exception("fail")
        with pytest.raises(DatabaseException):
            delete_course(1, db)
        db.rollback.assert_called()
