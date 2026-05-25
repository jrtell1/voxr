defmodule Voxr.Repo.Migrations.AddIsArchivedToChannels do
  use Ecto.Migration

  def change do
    alter table(:channels) do
      add :is_archived, :boolean, default: false, null: false
    end
  end
end
