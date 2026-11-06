import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGet } from "@/server/services/admin";
import { saveProductAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { TitleSlug } from "@/components/admin/SlugField";
import { Area, Field, MediaList, PublishPanel, SeoPanel, Select } from "@/components/admin/Fields";
import { DeleteForm } from "@/components/admin/DangerButtons";
import { formLookups } from "../../_data";
import type { products } from "@/server/schema";

export const metadata = { title: "Продукт" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const p = isNew ? null : ((await adminGet(actor, "product", id)) as typeof products.$inferSelect | null);
  if (!isNew && !p) notFound();
  const { topicOptions, images, pdfs } = await formLookups();
  return (
    <>
      <h1>{isNew ? "Новый гайд или продукт" : p!.title}</h1>
      <p className="notice" style={{ maxWidth: "80ch" }}>Оплата на сайте не принимается. Для платного продукта укажите ссылку на страницу продажи у продавца (VK, Telegram и т.п.) — только тогда можно поставить статус «В продаже». До проверки оферты и реквизитов юристом держите статус «Скоро».</p>
      <AdminForm action={saveProductAction} initialMessage={(await searchParams).created ? "Продукт создан" : undefined}>
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <MediaList id="images" items={images} /><MediaList id="pdfs" items={pdfs} />
        <div className="form-grid">
          <div className="form">
            <TitleSlug title={p?.title} slug={p?.slug} prefix="/guides/" />
            <Area label="Краткое описание" name="excerpt" defaultValue={p?.excerpt} rows={2} />
            <MarkdownField name="description" label="Подробное описание" defaultValue={p?.description} rows={10} />
            <Area label="Состав (по пункту в строке)" name="contents" defaultValue={p?.contents.join("\n")} rows={5} />
          </div>
          <aside>
            <PublishPanel status={p?.status} isDemo={p?.isDemo} viewUrl={p?.status === "published" ? `/guides/${p.slug}` : null} />
            <div className="panel">
              <h2>Продажа</h2>
              <Select label="Доступ" name="access" defaultValue={p?.access ?? "free"} options={[["free", "Бесплатный"], ["paid", "Платный"]]} />
              <Select label="Статус продукта" name="productStatus" defaultValue={p?.productStatus ?? "coming_soon"} options={[["coming_soon", "Скоро"], ["available", "В продаже / доступен"], ["archived", "В архиве (скрыт)"]]} />
              <Field label="Цена, ₽" name="priceRub" type="number" defaultValue={p?.priceKopecks != null ? p.priceKopecks / 100 : ""} />
              <Field label="Ссылка для покупки" name="externalBuyUrl" defaultValue={p?.externalBuyUrl} placeholder="https://vk.ru/…" hint="Страница продажи у продавца" />
              <Field label="Файл (для бесплатных)" name="fileUrl" defaultValue={p?.fileUrl} list="pdfs" hint="Загрузите PDF в «Медиафайлы»" />
            </div>
            <div className="panel">
              <Field label="Формат" name="format" defaultValue={p?.format ?? "PDF"} />
              <Field label="Автор" name="author" defaultValue={p?.author} />
              <Select label="Тема" name="topicId" defaultValue={p?.topicId} options={topicOptions} />
              <Field label="Обложка" name="coverImage" defaultValue={p?.coverImage} list="images" />
            </div>
            <SeoPanel seoTitle={p?.seoTitle} seoDescription={p?.seoDescription} ogImage={p?.ogImage} mediaListId="images" />
          </aside>
        </div>
      </AdminForm>
      {p && <div style={{ maxWidth: 320, marginTop: "2rem" }}><DeleteForm entity="product" id={p.id} /></div>}
    </>
  );
}
