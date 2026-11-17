/**
 * 서버가 한국어로 보내는 글자(오류 메시지·순위 칭호)를 클라이언트에서 영어로 바꾼다.
 * 서버 API는 그대로 두고, 모르는 메시지는 상태 코드로 대신 설명한다.
 */
import { tr } from './index';

/** 서버 오류 메시지 (server/src/app.ts의 HttpError 글자) → 영어 */
export const SERVER_ERRORS_EN: Record<string, string> = {
  '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.': 'Too many requests. Please try again in a moment.',
  '다시 로그인해 주세요.': 'Please log in again.',
  '관리자만 볼 수 있어요.': 'Admins only.',
  '이미 사용 중인 아이디예요.': 'That username is already taken.',
  '아이디 또는 비밀번호가 맞지 않아요.': 'Wrong username or password.',
  '잘못된 요청이에요.': 'Bad request.',
  '로그인이 만료됐어요. 다시 로그인해 주세요.': 'Your login expired. Please log in again.',
  '닉네임은 2~12자의 한글·영문·숫자·밑줄·띄어쓰기만 쓸 수 있어요.': 'Nicknames must be 2–12 characters: letters (Korean or English), numbers, underscores, and spaces.',
  '의견을 너무 자주 보냈어요. 10분쯤 뒤에 다시 보내 주세요.': 'You sent feedback too often. Please try again in about 10 minutes.',
  '분류를 골라 주세요.': 'Please pick a category.',
  '내용은 1~1000자로 적어 주세요.': 'Please write 1–1000 characters.',
  '없는 의견이에요.': 'That feedback doesn\'t exist.',
  '잘못된 저장 데이터예요.': 'Invalid save data.',
  '저장 데이터가 너무 커요.': 'Save data is too large.',
  '다른 기기에서 먼저 저장했어요.': 'Another device saved first.',
  '허용되지 않은 출처예요.': 'Origin not allowed.',
  '없는 주소예요.': 'Not found.',
  '서버 오류가 났어요.': 'Server error.',
  '요청이 너무 커요.': 'Request too large.',
  'JSON 형식이 아니에요.': 'Not valid JSON.',
};

/** 상태 코드별 기본 영어 설명 (모르는 메시지일 때) */
const STATUS_EN: Record<number, string> = {
  400: 'Bad request.',
  401: 'Please log in again.',
  403: 'Not allowed.',
  404: 'Not found.',
  409: 'Conflict.',
  413: 'Too large.',
  429: 'Too many requests. Please try again in a moment.',
  500: 'Server error.',
};

/** 서버 오류를 지금 언어로 */
export function serverError(status: number, message: string | undefined): string {
  if (!message) return tr(`요청 실패 (${status})`, `Request failed (${status})`);
  return tr(message, SERVER_ERRORS_EN[message] ?? STATUS_EN[status] ?? `Request failed (${status})`);
}

/** 순위 칭호 (server/src/app.ts rankStats) → 영어 */
export const RANK_TITLES_EN: Record<string, string> = {
  학부생: 'Undergrad',
  학연생: 'Undergrad Researcher',
  학석사: 'BS/MS Track',
  석사: "Master's",
  석박: 'MS/PhD Track',
  박사: 'PhD',
  포닥: 'Postdoc',
  교수: 'Professor',
};

export function rankTitle(title: string): string {
  return tr(title, RANK_TITLES_EN[title] ?? title);
}

/** 의견 분류 (서버 값은 한국어 그대로) */
export const FEEDBACK_LABEL_EN: Record<string, string> = { 문의: 'Question', 건의: 'Suggestion', 버그: 'Bug' };

export function feedbackLabel(cat: string): string {
  return tr(cat, FEEDBACK_LABEL_EN[cat] ?? cat);
}
