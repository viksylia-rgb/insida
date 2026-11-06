import { requireAdmin } from "@/server/auth/current";
import { adminSimpleList } from "@/server/services/admin";
import { ListTable } from "../ListTable";

export const metadata = { title: "Программы" };
export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  return <ListTable title="Программы" base="/admin/programs" entity="program" publicPrefix="/programs/" newLabel="+ Новая программа" deleted={!!(await searchParams).deleted} rows={await adminSimpleList(await requireAdmin(), "program")} />;
}
