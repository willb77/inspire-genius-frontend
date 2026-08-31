/**
 * One-off: add the Meridian personal-row + Documents upload strings to every
 * locale's chat.json.
 *
 * The repo translates chat.json fully (all 21 locales carry `meridian.newChat`,
 * `meridian.export`, …), so shipping these keys English-only would be the odd
 * one out — the test harness resolves real bundles, and a missing key renders
 * as the raw key path rather than the code's `defaultValue`.
 *
 * "Job Fit" and "Lumen" are product names and stay untranslated, matching the
 * existing files (neither appears translated in any locale today).
 *
 * Run: node scripts/add-personal-row-i18n.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const LOCALES_DIR = "public/locales";

/** aria, selfPortrait, moments, coaching, jobFit, documentsUpload, locked */
const STRINGS = {
  en: ["Your pages", "My Self-Portrait", "Moments", "Coaching", "Job Fit", "Upload a document", "{{name}} isn't enabled for your account"],
  ar: ["صفحاتك", "صورتي الذاتية", "لحظات", "التوجيه", "Job Fit", "رفع مستند", "{{name}} غير مُفعَّل لحسابك"],
  de: ["Deine Seiten", "Mein Selbstporträt", "Momente", "Coaching", "Job Fit", "Dokument hochladen", "{{name}} ist für dein Konto nicht aktiviert"],
  es: ["Tus páginas", "Mi autorretrato", "Momentos", "Coaching", "Job Fit", "Subir un documento", "{{name}} no está habilitado para tu cuenta"],
  fr: ["Vos pages", "Mon autoportrait", "Moments", "Coaching", "Job Fit", "Téléverser un document", "{{name}} n'est pas activé pour votre compte"],
  hi: ["आपके पेज", "मेरा स्व-चित्र", "क्षण", "कोचिंग", "Job Fit", "दस्तावेज़ अपलोड करें", "{{name}} आपके खाते के लिए सक्षम नहीं है"],
  id: ["Halaman Anda", "Potret Diri Saya", "Momen", "Coaching", "Job Fit", "Unggah dokumen", "{{name}} tidak diaktifkan untuk akun Anda"],
  it: ["Le tue pagine", "Il mio autoritratto", "Momenti", "Coaching", "Job Fit", "Carica un documento", "{{name}} non è abilitato per il tuo account"],
  ja: ["あなたのページ", "セルフポートレート", "モーメント", "コーチング", "Job Fit", "ドキュメントをアップロード", "{{name}} はお使いのアカウントでは利用できません"],
  ko: ["내 페이지", "나의 자화상", "모먼트", "코칭", "Job Fit", "문서 업로드", "{{name}}은(는) 계정에서 사용할 수 없습니다"],
  nb: ["Sidene dine", "Mitt selvportrett", "Øyeblikk", "Coaching", "Job Fit", "Last opp et dokument", "{{name}} er ikke aktivert for kontoen din"],
  nl: ["Jouw pagina's", "Mijn zelfportret", "Momenten", "Coaching", "Job Fit", "Een document uploaden", "{{name}} is niet ingeschakeld voor je account"],
  pl: ["Twoje strony", "Mój autoportret", "Momenty", "Coaching", "Job Fit", "Prześlij dokument", "{{name}} nie jest włączone dla Twojego konta"],
  pt: ["Suas páginas", "Meu autorretrato", "Momentos", "Coaching", "Job Fit", "Enviar um documento", "{{name}} não está habilitado na sua conta"],
  ru: ["Ваши страницы", "Мой автопортрет", "Моменты", "Коучинг", "Job Fit", "Загрузить документ", "{{name}} не подключён для вашей учётной записи"],
  sq: ["Faqet e tua", "Autoportreti im", "Momente", "Kouçim", "Job Fit", "Ngarko një dokument", "{{name}} nuk është aktivizuar për llogarinë tuaj"],
  sv: ["Dina sidor", "Mitt självporträtt", "Ögonblick", "Coachning", "Job Fit", "Ladda upp ett dokument", "{{name}} är inte aktiverat för ditt konto"],
  th: ["หน้าของคุณ", "ภาพเหมือนตนเอง", "ช่วงเวลา", "การโค้ช", "Job Fit", "อัปโหลดเอกสาร", "{{name}} ไม่ได้เปิดใช้งานสำหรับบัญชีของคุณ"],
  tr: ["Sayfaların", "Öz Portrem", "Anlar", "Koçluk", "Job Fit", "Belge yükle", "{{name}} hesabınız için etkin değil"],
  vi: ["Trang của bạn", "Chân dung của tôi", "Khoảnh khắc", "Huấn luyện", "Job Fit", "Tải lên tài liệu", "{{name}} chưa được bật cho tài khoản của bạn"],
  "zh-CN": ["你的页面", "我的自画像", "瞬间", "教练", "Job Fit", "上传文档", "{{name}} 未对你的账户启用"],
};

let updated = 0;
for (const [locale, [aria, selfPortrait, moments, coaching, jobFit, upload, locked]] of Object.entries(STRINGS)) {
  const file = join(LOCALES_DIR, locale, "chat.json");
  if (!existsSync(file)) {
    console.warn(`skip ${locale} — no chat.json`);
    continue;
  }
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.meridian ??= {};
  json.meridian.personalRow = { aria, selfPortrait, moments, coaching, jobFit, locked };
  json.documents ??= {};
  json.documents.upload = upload;
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  updated += 1;
}
console.log(`updated ${updated} locale files`);
