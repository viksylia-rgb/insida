import { requireAdmin } from "@/server/auth/current";
import { adminSimpleList } from "@/server/services/admin";
import { ListTable } from "../ListTable";

export const metadata = { title: "Страницы" };
export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const rows = await adminSimpleList(await requireAdmin(), "page");
  return <ListTable title="Страницы и документы" base="/admin/pages" entity="page" publicPrefix="/" newLabel="+ Новая страница" deleted={!!(await searchParams).deleted}
    rows={rows.map((r) => ({ ...r, extra: `/${r.slug}${r.isDemo ? " · требует проверки юристом" : ""}`, isDemo: false }))} />;
}
