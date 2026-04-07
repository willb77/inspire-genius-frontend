import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en',    label: 'English' },
  { code: 'es',    label: 'Español' },
  { code: 'fr',    label: 'Français' },
  { code: 'de',    label: 'Deutsch' },
  { code: 'pt',    label: 'Português' },
  { code: 'ja',    label: '日本語' },
  { code: 'ko',    label: '한국어' },
  { code: 'zh-CN', label: '中文（简体）' },
  { code: 'ar',    label: 'العربية' },
  { code: 'hi',    label: 'हिन्दी' },
  { code: 'it',    label: 'Italiano' },
  { code: 'nl',    label: 'Nederlands' },
  { code: 'ru',    label: 'Русский' },
  { code: 'pl',    label: 'Polski' },
  { code: 'tr',    label: 'Türkçe' },
  { code: 'th',    label: 'ไทย' },
  { code: 'vi',    label: 'Tiếng Việt' },
  { code: 'id',    label: 'Bahasa Indonesia' },
  { code: 'sv',    label: 'Svenska' },
  { code: 'nb',    label: 'Norsk' },
] as const;

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  return (
    <Select value={i18n.language?.split('-')[0] ?? 'en'} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="gap-1.5 border-none shadow-none bg-transparent hover:bg-gray-100 h-8 px-2">
        <Globe className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
