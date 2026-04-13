import { API_BASE_URL, API_ENDPOINTS } from '@/services/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/services/supabase';
import { AuthRequiredError, apiFetch, TIMEOUTS } from './errors';

export interface CourseSection {
  course_section_id: number;
  course_id: number;
  course_crn: number;
  professor_id: number | null;
  course_code: string;
  course_name: string;  
  subject: string | null;
  professor_name: string | null;
}

export interface NoteItem {
  noteId: number;
  title: string;
  description: string | null;
  dateUploaded: string;
  courseSectionId: number | null;
  courseCode: string | null;
  courseName: string | null;
  professorName: string | null;
  uploaderName: string | null;
  mediaUrl: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  notesContent: string | null;
}

export interface FetchNotesParams {
  search?: string;
  courseSectionId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}

export interface UploadNoteParams {
  title: string;
  description: string;
  date: string;
  courseSectionId: number;
  media: ImagePicker.ImagePickerAsset | null;
  file: DocumentPicker.DocumentPickerAsset | null;
}

export interface UpdateNoteParams {
  noteId: number;
  title?: string;
  description?: string;
  notesContent?: string;
  date?: string;
  courseSectionId?: number;
  media: ImagePicker.ImagePickerAsset | null;
  file: DocumentPicker.DocumentPickerAsset | null;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const validateAttachment = (mimeType: string | undefined, size: number | undefined) => {
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType))
    throw new Error('File type not supported. Please upload a JPEG, PNG, HEIC, or PDF.');
  if (size && size > MAX_FILE_SIZE)
    throw new Error('File size exceeds 10MB limit.');
};

const getAuthToken = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new AuthRequiredError();
  return session.access_token;
};

const mapNote = (n: any): NoteItem => ({
  noteId: n.noteId ?? n.note_id,
  title: n.title,
  description: n.description,
  dateUploaded: n.dateUploaded ?? n.date_uploaded,
  courseSectionId: n.courseSectionId ?? n.course_section_id,
  courseCode: n.courseCode ?? n.course_code,
  courseName: n.courseName ?? n.course_name,
  professorName: n.professorName ?? n.professor_name,
  uploaderName: n.uploaderName ?? n.uploader_name ?? null,
  mediaUrl: n.mediaUrl ?? n.media_url,
  fileName: n.fileName ?? n.file_name,
  fileUrl: n.fileUrl ?? n.file_url,
  fileSize: n.fileSize ?? n.file_size,
  notesContent: n.notesContent ?? n.notes_content,
});

// ── Fetch notes with optional filters (user-scoped) ────────────────────────────
export const fetchNotes = async (params: FetchNotesParams = {}): Promise<NoteItem[]> => {
  const query = new URLSearchParams();
  if (params.search)          query.append('search', params.search);
  if (params.courseSectionId) query.append('courseSectionId', params.courseSectionId.toString());
  if (params.startDate)       query.append('startDate', params.startDate);
  if (params.endDate)         query.append('endDate', params.endDate);
  if (params.limit)           query.append('limit', params.limit.toString());
  if (params.skip)            query.append('skip', params.skip.toString());

  const token = await getAuthToken();
  const url = `${API_ENDPOINTS.NOTES}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status} ${await res.text()}`);
  return (await res.json()).map(mapNote);
};

// ── Fetch notes for a specific course section (user's section only) ─────────────
export const fetchAllNotesByCourseSection = async (courseSectionId: number): Promise<NoteItem[]> => {
  const url = `${API_BASE_URL}/api/v1/notes/course-section/${courseSectionId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch course notes: ${res.status} ${await res.text()}`);
  return (await res.json()).map(mapNote);
};

// ── Fetch notes for ALL sections of a course, filtered by professor ─────────────
// Default view on the course page. Uses the NOTES_BY_COURSE endpoint from api.ts.
export const fetchNotesByCourse = async (
  courseId: number,
  professorId?: number,
): Promise<NoteItem[]> => {
  const query = new URLSearchParams();
  if (professorId != null) query.append('professor_id', professorId.toString());

  const base = API_ENDPOINTS.NOTES_BY_COURSE(String(courseId));
  const url = query.toString() ? `${base}?${query.toString()}` : base;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch course notes: ${res.status} ${await res.text()}`);
  return (await res.json()).map(mapNote);
  const url = `${API_BASE_URL}/api/v1/notes${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await apiFetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }, TIMEOUTS.FAST);

  const data = await response.json();
  return data.map(mapNote);
};

// ── Fetch available course sections ────────────────────────────────────────────
export const fetchNoteCourseSections = async (): Promise<CourseSection[]> => {
  const token = await getAuthToken();
  const res = await fetch(API_ENDPOINTS.NOTES_COURSE_SECTIONS, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch note course sections');
  return res.json();
  const token = await getAuthToken();
  const response = await apiFetch(`${API_BASE_URL}/api/v1/notes/course-sections`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }, TIMEOUTS.FAST);
  return response.json();
};

export const fetchAllNotesByCourseSection = async (courseId: number): Promise<NoteItem[]> => {
  const token = await getAuthToken();
  const response = await apiFetch(`${API_BASE_URL}/api/v1/notes/course-section/${courseId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }, TIMEOUTS.FAST);
  const data = await response.json();
  return data.map(mapNote);
};

// Returns only course sections the logged-in user is enrolled in
export const fetchCourseSections = async (): Promise<CourseSection[]> => {
  const token = await getAuthToken();
  const response = await apiFetch(`${API_BASE_URL}/api/v1/course-sections/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }, TIMEOUTS.FAST);
  return response.json();
};

// ── Upload a new note ───────────────────────────────────────────────────────────
export const uploadNote = async (params: UploadNoteParams): Promise<void> => {
  if (params.media) validateAttachment(params.media.mimeType, undefined);
  if (params.file)  validateAttachment(params.file.mimeType, params.file.size);

  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('title', params.title);
  formData.append('date', params.date);
  formData.append('courseSectionId', params.courseSectionId.toString());
  if (params.description.trim()) formData.append('description', params.description);

  if (params.media) {
    const filename = params.media.uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    formData.append('media', { uri: params.media.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' } as any);
  } else if (params.file) {
    const filename = params.file.name || params.file.uri.split('/').pop() || 'file';
    formData.append('file', { uri: params.file.uri, name: filename, type: params.file.mimeType || 'application/octet-stream' } as any);
  }

  await apiFetch(`${API_BASE_URL}/api/v1/notes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }, TIMEOUTS.SLOW);
};

export const deleteNote = async (noteId: number): Promise<void> => {
  const token = await getAuthToken();
  const response = await fetch(API_ENDPOINTS.NOTE_BY_ID(String(noteId)), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delete failed: ${response.status} ${errorText}`);
  }
};

// ── Update an existing note ─────────────────────────────────────────────────────
export const updateNote = async (params: UpdateNoteParams): Promise<NoteItem> => {
  if (params.media) validateAttachment(params.media.mimeType, undefined);
  if (params.file)  validateAttachment(params.file.mimeType, params.file.size);

  const token = await getAuthToken();
  const formData = new FormData();
  if (params.title !== undefined)           formData.append('title', params.title);
  if (params.description !== undefined)     formData.append('description', params.description);
  if (params.notesContent !== undefined)    formData.append('notesContent', params.notesContent);
  if (params.date !== undefined)            formData.append('date', params.date);
  if (params.courseSectionId !== undefined) formData.append('courseSectionId', params.courseSectionId.toString());

  if (params.media) {
    const filename = params.media.uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    formData.append('media', { uri: params.media.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' } as any);
  } else if (params.file) {
    const filename = params.file.name || params.file.uri.split('/').pop() || 'file';
    formData.append('file', { uri: params.file.uri, name: filename, type: params.file.mimeType || 'application/octet-stream' } as any);
  }

  const response = await apiFetch(`${API_BASE_URL}/api/v1/notes/${params.noteId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }, TIMEOUTS.SLOW);

  return mapNote(await res.json());
};