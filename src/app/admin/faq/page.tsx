import { requireAdmin } from "@/server/auth/current";
import { adminSimpleList } from "@/server/services/admin";
import { ListTable } from "../ListTable";

export const metadata = { title: "FAQ" };
export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  return <ListTable title="Вопросы и ответы" base="/admin/faq" entity="faq" newLabel="+ Новый вопрос" deleted={!!(await searchParams).deleted} rows={await adminSimpleList(await requireAdmin(), "faq")} />;
}
