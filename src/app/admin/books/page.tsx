import { requireAdmin } from "@/server/auth/current";
import { adminSimpleList } from "@/server/services/admin";
import { ListTable } from "../ListTable";

export const metadata = { title: "Книги" };
export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  return <ListTable title="Книжная полка" base="/admin/books" entity="book" newLabel="+ Новая книга" deleted={!!(await searchParams).deleted} rows={await adminSimpleList(await requireAdmin(), "book")} />;
}
