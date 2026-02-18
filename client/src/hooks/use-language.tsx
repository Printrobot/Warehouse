import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "ru";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.register_box": "Box Registration",
    "nav.materials": "Materials",
    "nav.orders": "Orders",
    "nav.users": "Users",
    "nav.settings": "Settings",
    "nav.history": "History",
    "nav.logout": "Sign Out",
    "settings.title": "Settings",
    "settings.general": "General Settings",
    "settings.org_name": "Organization Name",
    "settings.language": "Interface Language",
    "settings.save": "Save Changes",
    "dashboard.welcome": "Good Morning",
    "dashboard.select_task": "Select a task to get started. All systems operational.",
    "dashboard.stats.boxes": "Boxes In Stock",
    "dashboard.stats.shipped": "Shipped Today",
    "dashboard.stats.pending": "Pending Orders",
    "dashboard.stats.urgent": "Urgent Alerts",
    "dashboard.reg.title": "Box Registration",
    "dashboard.reg.desc": "Register new inventory, scan codes, and assign locations.",
    "dashboard.issue.title": "Material Issue",
    "dashboard.issue.desc": "Track material usage and issue items to production.",
    "dashboard.find.title": "Find Order",
    "dashboard.find.desc": "Quickly locate boxes or materials by ID or QR code.",
    "dashboard.mgmt.title": "Management",
    "dashboard.mgmt.desc": "View analytics, user reports, and shipping manifests.",
    "dashboard.history.title": "History Log",
    "dashboard.history.desc": "Review recent transactions and system activities.",
    "dashboard.ship.title": "Box Shipping",
    "dashboard.ship.desc": "Scan and confirm boxes for shipping.",
    "nav.ship_box": "Box Shipping",
    "ship.scan_box": "Scan Box QR",
    "ship.scan_label": "Scan ID on the box",
    "ship.box_details": "Box Details",
    "ship.order": "Order",
    "ship.box_num": "Box",
    "ship.quantity": "Quantity",
    "ship.status": "Status",
    "ship.confirm_ship": "Confirm Shipping",
    "ship.success": "Box Shipped",
    "ship.success_desc": "The box has been marked as shipped.",
    "common.loading_ocr": "Recognizing text...",
    "ocr.no_match_title": "Nothing recognized",
    "ocr.no_match_desc": "Could not find quantity or box number. Please check the photo or enter manually.",
    "ocr.success_title": "Recognized!",
    "ocr.success_desc": "Data extracted from the sticker.",
    "ocr.error_title": "OCR Error",
    "ocr.error_desc": "Failed to process the image. Please try again.",
    "common.back": "Back",
    "common.next": "Next",
    "common.submit": "Submit",
    "common.loading": "Loading...",
  },
  ru: {
    "nav.dashboard": "Панель",
    "nav.register_box": "Регистрация коробок",
    "nav.materials": "Материалы",
    "nav.orders": "Заказы",
    "nav.users": "Пользователи",
    "nav.settings": "Настройки",
    "nav.history": "История",
    "nav.logout": "Выйти",
    "settings.title": "Настройки",
    "settings.general": "Общие настройки",
    "settings.org_name": "Название организации",
    "settings.language": "Язык интерфейса",
    "settings.save": "Сохранить изменения",
    "dashboard.welcome": "Доброе утро",
    "dashboard.select_task": "Выберите задачу для начала. Все системы работают.",
    "dashboard.stats.boxes": "Коробок на складе",
    "dashboard.stats.shipped": "Отгружено сегодня",
    "dashboard.stats.pending": "Заказы в ожидании",
    "dashboard.stats.urgent": "Срочные оповещения",
    "dashboard.reg.title": "Регистрация коробок",
    "dashboard.reg.desc": "Регистрация нового инвентаря, сканирование и назначение мест.",
    "dashboard.issue.title": "Выдача материалов",
    "dashboard.issue.desc": "Отслеживание использования материалов и выдача на производство.",
    "dashboard.find.title": "Найти заказ",
    "dashboard.find.desc": "Быстрый поиск коробок или материалов по ID или QR-коду.",
    "dashboard.mgmt.title": "Управление",
    "dashboard.mgmt.desc": "Аналитика, отчеты по пользователям и погрузочные манифесты.",
    "dashboard.history.title": "Лог истории",
    "dashboard.history.desc": "Просмотр последних транзакций и действий системы.",
    "dashboard.ship.title": "Отгрузка коробок",
    "dashboard.ship.desc": "Сканирование и подтверждение коробок для отгрузки.",
    "nav.ship_box": "Отгрузка коробок",
    "ship.scan_box": "Сканировать QR коробки",
    "ship.scan_label": "Сканируйте ID на коробке",
    "ship.box_details": "Детали коробки",
    "ship.order": "Заказ",
    "ship.box_num": "Коробка",
    "ship.quantity": "Количество",
    "ship.status": "Статус",
    "ship.confirm_ship": "Подтвердить отгрузку",
    "ship.success": "Коробка отгружена",
    "ship.success_desc": "Коробка отмечена как отгруженная.",
    "common.loading_ocr": "Распознавание текста...",
    "ocr.no_match_title": "Ничего не найдено",
    "ocr.no_match_desc": "Не удалось найти количество или номер коробки. Проверьте фото или введите вручную.",
    "ocr.success_title": "Распознано!",
    "ocr.success_desc": "Данные успешно извлечены из наклейки.",
    "ocr.error_title": "Ошибка OCR",
    "ocr.error_desc": "Не удалось обработать изображение. Попробуйте еще раз.",
    "common.back": "Назад",
    "common.next": "Далее",
    "common.submit": "Отправить",
    "common.loading": "Загрузка...",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("app_lang") as Language) || "ru";
  });

  useEffect(() => {
    localStorage.setItem("app_lang", language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations["en"]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
