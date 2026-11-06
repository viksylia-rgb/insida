import { requireAdmin } from "@/server/auth/current";
import { getSettings } from "@/server/services/content";
import { saveSettingsAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { Area, Field, MediaList } from "@/components/admin/Fields";
import { formLookups } from "../_data";

export const metadata = { title: "Настройки сайта" };

export default async function Page() {
  await requireAdmin();
  const [s, { images }] = await Promise.all([getSettings(), formLookups()]);
  return (
    <>
      <h1>Настройки сайта</h1>
      <AdminForm action={saveSettingsAction}>
        <MediaList id="images" items={images} />
        <div style={{ display: "grid", gap: "1.5rem", maxWidth: 900 }}>
          <section className="panel">
            <h2>Главная страница</h2>
            <Field label="Заголовок первого экрана" name="heroTitle" defaultValue={s.heroTitle} hint="Часть после « — » будет выделена курсивом" />
            <Area label="Подзаголовок" name="heroLead" defaultValue={s.heroLead} rows={3} />
            <Field label="Фото первого экрана" name="heroImage" defaultValue={s.heroImage} list="images" />
          </section>
          <section className="panel">
            <h2>Основатель (страница «Об INSIDA»)</h2>
            <p className="caption" style={{ margin: 0 }}>Пишите только реальные сведения. Если поле пустое, на сайте будет нейтральная заглушка.</p>
            <div className="row-2"><Field label="Имя" name="founderName" defaultValue={s.founderName} /><Field label="Роль" name="founderRole" defaultValue={s.founderRole} /></div>
            <div className="row-2"><Field label="Фото" name="founderPhoto" defaultValue={s.founderPhoto} list="images" hint="Загрузите в «Медиафайлы»" /><Field label="Описание фото (alt)" name="founderPhotoAlt" defaultValue={s.founderPhotoAlt} /></div>
            <MarkdownField name="founderStory" label="История" defaultValue={s.founderStory} rows={10} />
            <Area label="Образование" name="education" defaultValue={s.education} rows={3} />
            <MarkdownField name="mission" label="Миссия" defaultValue={s.mission} rows={5} />
          </section>
          <section className="panel">
            <h2>Контакты</h2>
            <Area label="Ссылки на соцсети" name="socialLinks" defaultValue={s.socialLinks.map((l) => `${l.title} | ${l.url}`).join("\n")} rows={3} hint="По одной в строке: Название | https://ссылка" />
            <Field label="E-mail для связи (необязательно)" name="contactEmail" type="email" defaultValue={s.contactEmail} />
          </section>
          <section className="panel">
            <h2>Тексты безопасности</h2>
            <Area label="Рекомендация для чувствительных тем" name="crisisText" defaultValue={s.crisisText} rows={3} />
          </section>
          <section className="panel">
            <h2>Сведения о продавце</h2>
            <p className="caption" style={{ margin: 0 }}>Заполняется реальными реквизитами ИП-продавца после проверки юристом. Не вводите вымышленные ИНН/ОГРНИП.</p>
            <MarkdownField name="sellerInfo" label="Реквизиты и условия" defaultValue={s.sellerInfo} rows={8} />
          </section>
          <button className="btn btn--primary" type="submit" style={{ width: "fit-content" }}>Сохранить настройки</button>
        </div>
      </AdminForm>
    </>
  );
}
