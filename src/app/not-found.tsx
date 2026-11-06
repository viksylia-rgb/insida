import Link from "next/link";
export default function NotFound() {
  return (
    <section className="section container container--narrow">
      <p className="eyebrow">Ошибка 404</p>
      <h1>Такой страницы нет</h1>
      <p className="lead">Возможно, материал перенесли или сняли с публикации. Попробуйте поиск или вернитесь на главную.</p>
      <div className="cluster" style={{ marginTop: "2rem" }}>
        <Link className="btn btn--primary" href="/">На главную</Link>
        <Link className="btn btn--secondary" href="/search">Поиск</Link>
      </div>
    </section>
  );
}
