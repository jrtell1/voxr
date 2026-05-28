defmodule Voxr.Repo.Migrations.AddIsEditedToMessages do
  use Ecto.Migration

  def change do
    alter table(:messages) do
      add :is_edited, :boolean, null: false, default: false
      add :updated_at, :utc_datetime
    end
  end
end
