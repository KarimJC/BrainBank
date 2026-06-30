import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders } from './api';
import { apiFetch, TIMEOUTS } from './errors';

export async function getCourseSectionByCRN(crn: number) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(
    `${API_BASE_URL}/api/v1/course-sections/crn/${crn}`,
    { headers },
    TIMEOUTS.FAST
  );
  return response.json();
}

export async function enrollInCourseSection(sectionId: number, userId: number) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(
    `${API_BASE_URL}/api/v1/course-sections/${sectionId}/enroll?user_id=${userId}`,
    { method: 'POST', headers },
    TIMEOUTS.DEFAULT
  );
  return response.json();
}

export async function unenrollFromCourseSection(sectionId: number, userId: number) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(
    `${API_BASE_URL}/api/v1/course-sections/${sectionId}/enroll?user_id=${userId}`,
    { method: 'DELETE', headers },
    TIMEOUTS.DEFAULT
  );
  return response.json();
}

export async function getUserCourseSections(userId: number) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(
    `${API_BASE_URL}/api/v1/course-sections/user/${userId}`,
    { headers },
    TIMEOUTS.FAST
  );
  return response.json();
}

export async function getProfessor(professorId: number) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(
    API_ENDPOINTS.PROFESSOR_BY_ID(professorId),
    { headers },
    TIMEOUTS.FAST
  );
  return response.json();
}

export async function getCourseSectionStudents(sectionId: number) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(
    `${API_BASE_URL}/api/v1/course-sections/${sectionId}/students`,
    { headers },
    TIMEOUTS.FAST
  );
  return response.json();
}
