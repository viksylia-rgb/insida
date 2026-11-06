export function DemoBadge({ show = true }: { show?: boolean }) {
  return show ? <span className="badge badge--demo" title="Материал создан для демонстрации и требует замены или редакторской проверки">Демонстрационный материал</span> : null;
}

export function Disclaimer({ kind = "content" }: { kind?: "content" | "test" }) {
  return (
    <p className="disclaimer">
      {kind === "test"
        ? "Этот опросник — инструмент для саморефлексии. Он не является диагностической методикой и не ставит диагнозов; результаты описывают лишь ваши ответы в данный момент. "
        : "Материал носит информационно-просветительский характер. "}
      Он не заменяет медицинскую помощь и индивидуальную консультацию специалиста.
    </p>
  );
}

export function CrisisNote({ text }: { text: string }) {
  return (
    <aside className="notice notice--crisis" aria-label="Если вам сейчас тяжело">
      <strong>Если вам сейчас тяжело.</strong> {text}
    </aside>
  );
}

export function LegalTemplateNote() {
  return (
    <aside className="notice notice--legal notice--warn">
      <strong>Шаблон документа.</strong> Текст подготовлен как черновик-структура и требует заполнения реальными данными и проверки юристом до
      публичного запуска. Он не является юридической консультацией и не гарантирует соответствия законодательству.
    </aside>
  );
}
