import Link from "next/link";
import { featuredArticles, getSettings, listArticles, listBooks, listPractices, listTopics, listTests } from "@/server/services/content";
import { ArticleCardView, SimpleCard } from "@/components/Cards";
import { Visual } from "@/components/Visual";
import { DemoBadge, Disclaimer } from "@/components/Notices";
import { KIND_LABELS, minutes } from "@/lib/format";
import { config } from "@/lib/config";

export const revalidate = 300;

export default async function Home() {
  const [settings, featured, latest, topics, practices, books, tests] = await Promise.all([
    getSettings(),
    featuredArticles(4),
    listArticles({ limit: 6 }),
    listTopics(),
    listPractices(),
    listBooks({ featuredOnly: true, limit: 4 }),
    listTests(),
  ]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "INSIDA",
    url: config.siteUrl,
    description: config.siteDescription,
  };
  const formats = [
    { n: "01", href: "/library", title: "Библиотека", text: "Статьи, объяснения терминов и подборки — с источниками." },
    { n: "02", href: "/tests", title: "Тесты", text: "Опросники для саморефлексии без диагнозов и ярлыков." },
    { n: "03", href: "/practices", title: "Практики", text: "Упражнения, дневники и вопросы для размышления." },
    { n: "04", href: "/programs", title: "Программы", text: "Темы, разложенные по урокам и заданиям." },
    { n: "05", href: "/guides", title: "Гайды", text: "Рабочие тетради и материалы для самостоятельной работы." },
    { n: "06", href: "/books", title: "Книги", text: "Авторские подборки психологической литературы." },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ---------- HERO ---------- */}
      <section className="hero container">
        <div className="hero__grid">
          <div>
            <p className="eyebrow">Пространство для понимания себя</p>
            <h1 className="hero__title">{renderHeroTitle(settings.heroTitle)}</h1>
            <p className="lead">{settings.heroLead}</p>
            <div className="hero__actions">
              <Link href="/library" className="btn btn--primary">Открыть библиотеку</Link>
              <Link href="/tests" className="btn btn--secondary">Пройти тест</Link>
            </div>
          </div>
          <div className="hero__visual" aria-hidden="true">
            <Visual src={settings.heroImage} alt={settings.founderPhotoAlt} seed="hero-main-silk" priority sizes="(max-width: 900px) 60vw, 30vw" label={settings.heroImage ? false : "Плейсхолдер · натюрморт, ткань"} />
            <Visual seed="hero-second-flowers" label={false} glyph="i" />
          </div>
        </div>
      </section>

      {/* ---------- РЕДАКЦИОННЫЕ ПОДБОРКИ ---------- */}
      {featured.length > 0 && (
        <section className="section container" aria-labelledby="featured-h">
          <div className="section-head">
            <div><p className="eyebrow">Выбор редакции</p><h2 id="featured-h">Читать <em className="display-italic">не спеша</em></h2></div>
            <Link href="/library" className="link-arrow">Все материалы</Link>
          </div>
          <div className="editorial">
            {featured.slice(0, 3).map((a, i) => <ArticleCardView key={a.id} a={a} priority={i === 0} />)}
          </div>
        </section>
      )}

      {/* ---------- ЧТО ТЕБЯ СЕЙЧАС ВОЛНУЕТ ---------- */}
      <section className="section section--inverse" aria-labelledby="concern-h">
        <div className="container">
          <div className="about-band">
            <div>
              <p className="eyebrow">Начать с себя</p>
              <h2 id="concern-h">Что тебя сейчас волнует?</h2>
              <p className="lead">Выберите то, что откликается, — мы соберём статьи, тесты и практики по этой теме.</p>
            </div>
            <div className="concerns">
              {topics.map((t) => (
                <Link key={t.id} href={`/topics/${t.slug}`} className="chip">{t.concern ?? t.title}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- ТЕМЫ ---------- */}
      <section className="section container" aria-labelledby="topics-h">
        <div className="section-head"><div><p className="eyebrow">Темы</p><h2 id="topics-h">О чём мы пишем</h2></div></div>
        <div className="topic-grid">
          {topics.map((t, i) => (
            <div key={t.id} className="topic-tile">
              <span className="topic-tile__n">{String(i + 1).padStart(2, "0")}</span>
              <h3><Link href={`/topics/${t.slug}`}>{t.title}</Link></h3>
              {t.description && <p>{t.description}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ФОРМАТЫ ---------- */}
      <section className="section section--inverse" aria-labelledby="formats-h">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow">Форматы</p><h2 id="formats-h">Читать, проверять, пробовать</h2></div></div>
          <div className="formats">
            {formats.map((f) => (
              <div key={f.href} className="format">
                <span className="format__n">{f.n}</span>
                <div><h3><Link href={f.href}>{f.title}</Link></h3><p>{f.text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- НОВИНКИ ---------- */}
      <section className="section container" aria-labelledby="new-h">
        <div className="section-head">
          <div><p className="eyebrow">Новое</p><h2 id="new-h">Свежие материалы</h2></div>
          <Link href="/library" className="link-arrow">В библиотеку</Link>
        </div>
        <div>
          {latest.items.map((a, i) => (
            <div key={a.id} className="row-item">
              <span className="row-item__num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="row-item__title"><Link href={`/library/${a.slug}`}>{a.title}</Link></h3>
                <p className="muted small" style={{ margin: 0 }}>{a.excerpt}</p>
              </div>
              <span className="caption">{KIND_LABELS[a.kind]} · {minutes(a.readingMinutes)}{a.isDemo ? " · демо" : ""}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ПРАКТИКИ И ТЕСТЫ ---------- */}
      <section className="section section--surface" aria-labelledby="practice-h">
        <div className="container">
          <div className="section-head">
            <div><p className="eyebrow">Практики и тесты</p><h2 id="practice-h">Немного тишины для себя</h2></div>
            <Link href="/practices" className="link-arrow">Все практики</Link>
          </div>
          <div className="grid grid--3">
            {practices.slice(0, 2).map((p) => (
              <SimpleCard key={p.id} href={`/practices/${p.slug}`} title={p.title} excerpt={p.excerpt} meta={[KIND_LABELS[p.kind], minutes(p.durationMinutes)]} isDemo={p.isDemo} seed={p.slug} cover={p.coverImage} cta="Начать" />
            ))}
            {tests.slice(0, 1).map((t) => (
              <SimpleCard key={t.id} href={`/tests/${t.slug}`} title={t.title} excerpt={t.excerpt} meta={["Тест", `${t.questionCount} вопросов`, minutes(t.durationMinutes)]} isDemo={t.isDemo} seed={t.slug} cover={t.coverImage} cta="Пройти" />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- КНИГИ ---------- */}
      {books.length > 0 && (
        <section className="section container" aria-labelledby="books-h">
          <div className="section-head">
            <div><p className="eyebrow">Книжная полка</p><h2 id="books-h">Что почитать дальше</h2></div>
            <Link href="/books" className="link-arrow">Вся полка</Link>
          </div>
          <div className="grid grid--4">
            {books.map(({ book }) => (
              <article key={book.id} className="card">
                <Visual src={book.coverImage} seed={book.slug} ratio="3 / 4" label={book.coverImage ? false : "Обложка · заменить"} />
                <p className="caption" style={{ margin: 0 }}>{book.authors}{book.year ? `, ${book.year}` : ""}</p>
                <h3 className="card__title"><Link href={`/books#${book.slug}`}>{book.title}</Link></h3>
                {book.isDemo && <DemoBadge />}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ---------- ОБ INSIDA ---------- */}
      <section className="section section--inverse" aria-labelledby="about-h">
        <div className="container about-band">
          <Visual src={settings.founderPhoto} alt={settings.founderPhotoAlt} seed="founder-portrait" ratio="4 / 5" label={settings.founderPhoto ? false : "Место для фото основателя"} />
          <div>
            <p className="eyebrow">Об INSIDA</p>
            <h2 id="about-h" className="sr-only">Об INSIDA</h2>
            <p className="quote">Психология без громких обещаний: бережно, доказательно и по-человечески.</p>
            <p className="lead">{settings.mission || "INSIDA — авторский проект. Мы переводим исследования на понятный язык, предлагаем вопросы для размышления и не обещаем мгновенных изменений."}</p>
            <p className="small" style={{ color: "var(--inverse-text-2)" }}>{settings.founderName.startsWith("[") ? "" : `${settings.founderName} — основатель INSIDA`}</p>
            <Link href="/about" className="link-arrow">Подробнее о проекте</Link>
          </div>
        </div>
      </section>

      <section className="section--tight container"><Disclaimer /></section>
    </>
  );
}

/** Последнее слово заголовка — курсивом с акцентом (как в журнальной вёрстке). */
function renderHeroTitle(title: string) {
  const parts = title.split(" — ");
  if (parts.length === 2) return (<>{parts[0]}{"\u00A0"}— <em>{parts[1]}</em></>);
  return title;
}
