import { deleteAction } from "@/server/actions/admin";
import { ConfirmButton } from "./ConfirmButton";

export function DeleteForm({ entity, id }: { entity: string; id: string }) {
  return (
    <form action={deleteAction} className="panel">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <h2>Удаление</h2>
      <p className="caption" style={{ margin: 0 }}>Удаление нельзя отменить. Если материал нужно временно скрыть — снимите его с публикации.</p>
      <ConfirmButton>Удалить навсегда</ConfirmButton>
    </form>
  );
}
