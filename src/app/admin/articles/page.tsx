import { requireAdmin } from "@/server/auth/current";
import { adminListArticles } from "@/server/services/admin";
import { ListTable } from "../ListTable";
import { KIND_LABELS } from "@/lib/format";

export const metadata = { title: "Статьи" };
export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const rows = await adminListArticles(await requireAdmin());
  return <ListTable title="Статьи, термины, подборки" base="/admin/articles" entity="article" publicPrefix="/library/" newLabel="+ Новый материал" deleted={!!(await searchParams).deleted}
    rows={rows.map((r) => ({ ...r, extra: `${KIND_LABELS[r.kind]}${r.topic ? ` · ${r.topic}` : ""}` }))} />;
}
