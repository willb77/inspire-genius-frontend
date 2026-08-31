/**
 * One-off: add the HomeV2 quick-action + completeness-dropdown strings to every
 * locale's dashboard.json.
 *
 * The repo's own parity guard (`src/__tests__/i18n.test.ts`) fails any key that
 * exists in English but not in all 21 locales, and the test harness resolves
 * real bundles — a missing key renders as the raw key path, not the code's
 * `defaultValue`. So these have to land everywhere at once.
 *
 * "Job Fit" is a product name and stays untranslated, matching the existing
 * files (it appears untranslated in every locale's chat.json today).
 *
 * Run: node scripts/add-homev2-quickaction-i18n.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const LOCALES_DIR = "public/locales";

/**
 * [personalInfo, otherAssessments, nOfM, videos, quickSelfPortrait,
 *  quickTodaysPrep, quickActionLocked]
 */
const STRINGS = {
  en: [
    "Personal Info",
    "Other Assessments",
    "{{done}} of {{total}}",
    "Videos",
    "Self-Portrait",
    "Today's Prep",
    "{{name}} isn't enabled for your account",
  ],
  ar: [
    "المعلومات الشخصية",
    "تقييمات أخرى",
    "{{done}} من {{total}}",
    "مقاطع الفيديو",
    "الصورة الذاتية",
    "تحضير اليوم",
    "{{name}} غير مُفعَّل لحسابك",
  ],
  de: [
    "Persönliche Angaben",
    "Weitere Assessments",
    "{{done}} von {{total}}",
    "Videos",
    "Selbstporträt",
    "Heutige Vorbereitung",
    "{{name}} ist für dein Konto nicht aktiviert",
  ],
  es: [
    "Información personal",
    "Otras evaluaciones",
    "{{done}} de {{total}}",
    "Vídeos",
    "Autorretrato",
    "Preparación de hoy",
    "{{name}} no está habilitado para tu cuenta",
  ],
  fr: [
    "Informations personnelles",
    "Autres évaluations",
    "{{done}} sur {{total}}",
    "Vidéos",
    "Autoportrait",
    "Préparation du jour",
    "{{name}} n'est pas activé pour votre compte",
  ],
  hi: [
    "व्यक्तिगत जानकारी",
    "अन्य आकलन",
    "{{total}} में से {{done}}",
    "वीडियो",
    "स्व-चित्र",
    "आज की तैयारी",
    "{{name}} आपके खाते के लिए सक्षम नहीं है",
  ],
  id: [
    "Info Pribadi",
    "Asesmen Lainnya",
    "{{done}} dari {{total}}",
    "Video",
    "Potret Diri",
    "Persiapan Hari Ini",
    "{{name}} tidak diaktifkan untuk akun Anda",
  ],
  it: [
    "Informazioni personali",
    "Altre valutazioni",
    "{{done}} di {{total}}",
    "Video",
    "Autoritratto",
    "Preparazione di oggi",
    "{{name}} non è abilitato per il tuo account",
  ],
  ja: [
    "個人情報",
    "その他のアセスメント",
    "{{total}} 件中 {{done}} 件",
    "動画",
    "セルフポートレート",
    "今日の準備",
    "{{name}} はお使いのアカウントでは利用できません",
  ],
  ko: [
    "개인 정보",
    "기타 평가",
    "{{total}}개 중 {{done}}개",
    "동영상",
    "자화상",
    "오늘의 준비",
    "{{name}}은(는) 계정에서 사용할 수 없습니다",
  ],
  nb: [
    "Personlig informasjon",
    "Andre vurderinger",
    "{{done}} av {{total}}",
    "Videoer",
    "Selvportrett",
    "Dagens forberedelse",
    "{{name}} er ikke aktivert for kontoen din",
  ],
  nl: [
    "Persoonlijke gegevens",
    "Andere assessments",
    "{{done}} van {{total}}",
    "Video's",
    "Zelfportret",
    "Voorbereiding van vandaag",
    "{{name}} is niet ingeschakeld voor je account",
  ],
  pl: [
    "Dane osobowe",
    "Inne oceny",
    "{{done}} z {{total}}",
    "Filmy",
    "Autoportret",
    "Przygotowanie na dziś",
    "{{name}} nie jest włączone dla Twojego konta",
  ],
  pt: [
    "Informações pessoais",
    "Outras avaliações",
    "{{done}} de {{total}}",
    "Vídeos",
    "Autorretrato",
    "Preparação de hoje",
    "{{name}} não está habilitado na sua conta",
  ],
  ru: [
    "Личная информация",
    "Другие оценки",
    "{{done}} из {{total}}",
    "Видео",
    "Автопортрет",
    "Подготовка на сегодня",
    "{{name}} не подключён для вашей учётной записи",
  ],
  sq: [
    "Informacione personale",
    "Vlerësime të tjera",
    "{{done}} nga {{total}}",
    "Video",
    "Autoportreti",
    "Përgatitja e sotme",
    "{{name}} nuk është aktivizuar për llogarinë tuaj",
  ],
  sv: [
    "Personlig information",
    "Andra bedömningar",
    "{{done}} av {{total}}",
    "Videor",
    "Självporträtt",
    "Dagens förberedelse",
    "{{name}} är inte aktiverat för ditt konto",
  ],
  th: [
    "ข้อมูลส่วนตัว",
    "การประเมินอื่น ๆ",
    "{{done}} จาก {{total}}",
    "วิดีโอ",
    "ภาพเหมือนตนเอง",
    "การเตรียมตัววันนี้",
    "{{name}} ไม่ได้เปิดใช้งานสำหรับบัญชีของคุณ",
  ],
  tr: [
    "Kişisel Bilgiler",
    "Diğer Değerlendirmeler",
    "{{total}} içinden {{done}}",
    "Videolar",
    "Öz Portre",
    "Bugünün Hazırlığı",
    "{{name}} hesabınız için etkin değil",
  ],
  vi: [
    "Thông tin cá nhân",
    "Đánh giá khác",
    "{{done}} trên {{total}}",
    "Video",
    "Chân dung",
    "Chuẩn bị hôm nay",
    "{{name}} chưa được bật cho tài khoản của bạn",
  ],
  "zh-CN": [
    "个人信息",
    "其他评估",
    "{{total}} 项中的 {{done}} 项",
    "视频",
    "自画像",
    "今日准备",
    "{{name}} 未对你的账户启用",
  ],
};

let updated = 0;
for (const [locale, values] of Object.entries(STRINGS)) {
  const [
    personalInfo,
    otherAssessments,
    nOfM,
    videos,
    quickSelfPortrait,
    quickTodaysPrep,
    quickActionLocked,
  ] = values;

  const file = join(LOCALES_DIR, locale, "dashboard.json");
  if (!existsSync(file)) {
    console.warn(`skip ${locale} — no dashboard.json`);
    continue;
  }
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.homeV2 ??= {};
  Object.assign(json.homeV2, {
    personalInfo,
    otherAssessments,
    nOfM,
    videos,
    quickSelfPortrait,
    quickTodaysPrep,
    quickJobFit: "Job Fit", // product name — untranslated everywhere
    quickActionLocked,
  });
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  updated += 1;
}
console.log(`updated ${updated} locale files`);
