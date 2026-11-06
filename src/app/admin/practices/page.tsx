import { requireAdmin } from "@/server/auth/current";
import { adminSimpleList } from "@/server/services/admin";
import { ListTable } from "../ListTable";

export const metadata = { title: "Практики" };
export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  return <ListTable title="Практики" base="/admin/practices" entity="practice" publicPrefix="/practices/" newLabel="+ Новая практика" deleted={!!(await searchParams).deleted} rows={await adminSimpleList(await requireAdmin(), "practice")} />;
}
