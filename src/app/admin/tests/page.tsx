import { requireAdmin } from "@/server/auth/current";
import { adminListTests } from "@/server/services/admin";
import { ListTable } from "../ListTable";

export const metadata = { title: "Тесты" };
export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  return <ListTable title="Тесты" base="/admin/tests" entity="test" publicPrefix="/tests/" newLabel="+ Новый тест" deleted={!!(await searchParams).deleted} rows={await adminListTests(await requireAdmin())} />;
}
