"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="section container container--narrow">
      <p className="eyebrow">Что-то пошло не так</p>
      <h1>Страница не загрузилась</h1>
      <p className="lead">Мы уже записали ошибку. Попробуйте обновить страницу через минуту.</p>
      <button className="btn btn--primary" onClick={reset}>Попробовать снова</button>
    </section>
  );
}
