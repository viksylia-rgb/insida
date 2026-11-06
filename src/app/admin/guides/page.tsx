import { requireAdmin } from "@/server/auth/current";
import { adminSimpleList } from "@/server/services/admin";
import { ListTable } from "../ListTable";

export const metadata = { title: "Гайды" };
export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  return <ListTable title="Гайды и продукты" base="/admin/guides" entity="product" publicPrefix="/guides/" newLabel="+ Новый продукт" deleted={!!(await searchParams).deleted} rows={await adminSimpleList(await requireAdmin(), "product")} />;
}
