import Link from "next/link";
import { getSettings } from "@/server/services/content";

export async function Footer() {
  const s = await getSettings().catch(() => null);
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <p className="footer-logo">INSIDA</p>
            <p className="small" style={{ maxWidth: "36ch", color: "inherit", opacity: 0.85 }}>
              Независимый журнал о психологии и самопознании. Материалы носят информационно-просветительский характер и не заменяют
              медицинскую помощь и индивидуальную консультацию специалиста.
            </p>
          </div>
          <div>
            <h3>Разделы</h3>
            <ul>
              <li><Link href="/library">Библиотека</Link></li>
              <li><Link href="/tests">Тесты</Link></li>
              <li><Link href="/practices">Практики</Link></li>
              <li><Link href="/programs">Программы</Link></li>
              <li><Link href="/guides">Гайды и тетради</Link></li>
              <li><Link href="/books">Книжная полка</Link></li>
            </ul>
          </div>
          <div>
            <h3>INSIDA</h3>
            <ul>
              <li><Link href="/about">Об INSIDA</Link></li>
              <li><Link href="/faq">Вопросы и ответы</Link></li>
              <li><Link href="/contacts">Контакты</Link></li>
              <li><Link href="/search">Поиск</Link></li>
              {s?.socialLinks.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title} ↗</a></li>)}
            </ul>
          </div>
          <div>
            <h3>Документы</h3>
            <ul>
              <li><Link href="/legal/privacy">Политика конфиденциальности</Link></li>
              <li><Link href="/legal/offer">Условия продажи (оферта)</Link></li>
              <li><Link href="/legal/terms">Условия использования</Link></li>
              <li><Link href="/legal/cookies">О cookie</Link></li>
              <li><Link href="/legal/seller">Сведения о продавце</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-note">
          <span>© {year} INSIDA. Все материалы защищены авторским правом.</span>
          <span>Если вам нужна срочная помощь — звоните 112.</span>
        </div>
      </div>
    </footer>
  );
}
