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
    "nav.reports": "Reports",
    "nav.logout": "Sign Out",
    "reports.shipped_title": "Shipping Report",
    "reports.shipped_desc": "Analyze box shipments over a selected period.",
    "reports.filter_dates": "Filter by Date Range",
    "reports.start_date": "Start Date",
    "reports.end_date": "End Date",
    "settings.title": "Settings",
    "settings.general": "General Settings",
    "settings.org_name": "Organization Name",
    "settings.language": "Interface Language",
    "settings.save": "Save Changes",
    "common.lang_code": "en-US",
    "speech.recognized": "Speech recognized",
    "speech.not_supported_title": "Voice Input Unavailable",
    "speech.iframe_error": "Browser blocks microphone in Replit preview. Click the 'Open in new tab' button in the top right corner of the preview window to use voice.",
    "speech.browser_error": "Your browser does not support voice input. Please use Chrome.",
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
    "ship.select_box": "Select Box from List",
    "ship.choose_box": "Choose box...",
    "common.manual_entry": "Manual Entry",
    "orders.title": "Orders Management",
    "orders.new": "New Order",
    "orders.create_title": "Create New Order",
    "orders.number": "Order Number",
    "orders.customer": "Customer Name",
    "orders.status": "Status",
    "orders.date": "Date",
    "orders.actions": "Actions",
    "orders.complete": "Complete",
    "orders.view": "View",
    "orders.search_placeholder": "Search orders by number or customer...",
    "orders.all": "All Orders",
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
    "boxes.number": "Box Number",
    "boxes.quantity": "Quantity",
    "boxes.qty_unit": "pcs",
    "boxes.view_photos": "View Photos",
    "boxes.sticker": "Sticker",
    "boxes.contents": "Contents",
    "boxes.edit": "Edit Box",
  },
  ru: {
    "nav.dashboard": "Панель",
    "nav.register_box": "Регистрация коробок",
    "nav.materials": "Материалы",
    "nav.orders": "Заказы",
    "nav.users": "Пользователи",
    "nav.settings": "Настройки",
    "nav.history": "История",
    "nav.reports": "Отчеты",
    "nav.logout": "Выйти",
    "reports.shipped_title": "Отчет по отгрузкам",
    "reports.shipped_desc": "Анализ отгруженных коробок за выбранный период.",
    "reports.filter_dates": "Фильтр по датам",
    "reports.start_date": "Дата начала",
    "reports.end_date": "Дата окончания",
    "settings.title": "Настройки",
    "settings.general": "Общие настройки",
    "settings.org_name": "Название организации",
    "settings.language": "Язык интерфейса",
    "settings.save": "Сохранить изменения",
    "common.lang_code": "ru-RU",
    "speech.recognized": "Речь распознана",
    "speech.not_supported_title": "Голосовой ввод недоступен",
    "speech.iframe_error": "Браузер блокирует микрофон в окне предпросмотра. Нажмите кнопку 'Открыть в новой вкладке' в верхнем правом углу окна предпросмотра.",
    "speech.browser_error": "Ваш браузер не поддерживает голосовой ввод. Пожалуйста, используйте Chrome.",
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
    "ship.select_box": "Выберите коробку из списка",
    "ship.choose_box": "Выберите коробку...",
    "common.manual_entry": "Ручной ввод",
    "orders.title": "Управление заказами",
    "orders.new": "Новый заказ",
    "orders.create_title": "Создать новый заказ",
    "orders.number": "Номер заказа",
    "orders.customer": "Имя клиента",
    "orders.status": "Статус",
    "orders.date": "Дата",
    "orders.actions": "Действия",
    "orders.complete": "Завершить",
    "orders.view": "Просмотр",
    "orders.search_placeholder": "Поиск по номеру или клиенту...",
    "orders.all": "Все заказы",
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
    "boxes.number": "Номер коробки",
    "boxes.quantity": "Количество",
    "boxes.qty_unit": "шт",
    "boxes.view_photos": "Просмотр фото",
    "boxes.sticker": "Наклейка",
    "boxes.contents": "Содержимое",
    "boxes.edit": "Редактировать коробку",
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
